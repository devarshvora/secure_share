-- SecureShare Database Setup
-- Run this SQL file to create the necessary database and tables

-- Create database
CREATE DATABASE secureshare_db;

-- Connect to the database (in psql, use: \c secureshare_db)

-- Create shares table
CREATE TABLE shares (
  id SERIAL PRIMARY KEY,
  share_id VARCHAR(32) UNIQUE NOT NULL,
  encrypted_data TEXT NOT NULL,
  salt TEXT NOT NULL,
  iv TEXT NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  access_password_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  accessed BOOLEAN DEFAULT FALSE,
  accessed_at TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_share_id ON shares(share_id);
CREATE INDEX idx_recipient_email ON shares(recipient_email);
CREATE INDEX idx_expires_at ON shares(expires_at);

-- Add comments for documentation
COMMENT ON TABLE shares IS 'Stores encrypted password shares with expiration';
COMMENT ON COLUMN shares.share_id IS 'Unique identifier for the share link';
COMMENT ON COLUMN shares.encrypted_data IS 'AES-256 encrypted password (JSON array)';
COMMENT ON COLUMN shares.salt IS 'PBKDF2 salt used for key derivation (JSON array)';
COMMENT ON COLUMN shares.iv IS 'Initialization vector for encryption (JSON array)';
COMMENT ON COLUMN shares.recipient_email IS 'Email of authorized recipient (lowercase)';
COMMENT ON COLUMN shares.access_password_hash IS 'SHA-256 hash of access password';
COMMENT ON COLUMN shares.expires_at IS 'Timestamp when share automatically expires';

-- Optional: Create user with limited permissions (for security)
-- CREATE USER secureshare_app WITH PASSWORD 'your_secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE secureshare_db TO secureshare_app;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO secureshare_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO secureshare_app;
