const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const crypto = require('crypto');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Connection Pool
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Test database connection
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Create a new share
app.post('/api/shares', async (req, res) => {
  try {
    const { encrypted, salt, iv, recipientEmail, accessPassword } = req.body;

    if (!encrypted || !salt || !iv || !recipientEmail || !accessPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate unique share ID
    const shareId = crypto.randomBytes(16).toString('hex');
    
    // Calculate expiration time (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    // Hash the access password for verification (don't store plain password)
    const accessPasswordHash = crypto.createHash('sha256').update(accessPassword).digest('hex');

    // Store in database
    const query = `
      INSERT INTO shares (share_id, encrypted_data, salt, iv, recipient_email, access_password_hash, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING share_id, expires_at;
    `;

    const result = await pool.query(query, [
      shareId,
      JSON.stringify(encrypted),
      JSON.stringify(salt),
      JSON.stringify(iv),
      recipientEmail.toLowerCase().trim(),
      accessPasswordHash,
      expiresAt,
    ]);

    res.json({
      shareId: result.rows[0].share_id,
      expiresAt: result.rows[0].expires_at,
    });
  } catch (error) {
    console.error('Error creating share:', error);
    res.status(500).json({ error: 'Failed to create share' });
  }
});

// Retrieve a share
app.post('/api/shares/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    const { recipientEmail, accessPassword } = req.body;

    if (!recipientEmail || !accessPassword) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    // Hash the provided access password
    const accessPasswordHash = crypto.createHash('sha256').update(accessPassword).digest('hex');

    // Retrieve share from database
    const query = `
      SELECT * FROM shares WHERE share_id = $1;
    `;

    const result = await pool.query(query, [shareId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Share not found or expired' });
    }

    const share = result.rows[0];

    // Check if expired
    if (new Date() > new Date(share.expires_at)) {
      // Delete expired share
      await pool.query('DELETE FROM shares WHERE share_id = $1', [shareId]);
      return res.status(404).json({ error: 'This share has expired' });
    }

    // Verify email
    if (share.recipient_email !== recipientEmail.toLowerCase().trim()) {
      return res.status(403).json({ error: 'Invalid email address' });
    }

    // Verify password hash
    if (share.access_password_hash !== accessPasswordHash) {
      return res.status(403).json({ error: 'Incorrect password' });
    }

    // Return encrypted data (not decrypted - decryption happens in browser)
    res.json({
      encrypted: JSON.parse(share.encrypted_data),
      salt: JSON.parse(share.salt),
      iv: JSON.parse(share.iv),
    });

    // Optional: Delete share after access (one-time use)
    // await pool.query('DELETE FROM shares WHERE share_id = $1', [shareId]);
  } catch (error) {
    console.error('Error retrieving share:', error);
    res.status(500).json({ error: 'Failed to retrieve share' });
  }
});

// Cleanup expired shares (run periodically)
const cleanupExpiredShares = async () => {
  try {
    const result = await pool.query('DELETE FROM shares WHERE expires_at < NOW()');
    console.log(`Cleaned up ${result.rowCount} expired shares`);
  } catch (error) {
    console.error('Error cleaning up expired shares:', error);
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredShares, 5 * 60 * 1000);

// Start server
app.listen(port, () => {
  console.log(`SecureShare API running on port ${port}`);
  console.log('Database connected and ready');
});
