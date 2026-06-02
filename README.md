# 🔐 SecureShare

Secure password sharing application with end-to-end encryption, REST API, and PostgreSQL database.

**Live Demo:** [https://cyberdome-secure-share.vercel.app](https://cyberdome-secure-share.vercel.app)

---

## 🎯 Project Overview

A production-grade password sharing system implementing cryptographic algorithms, multi-tier architecture, and database optimization. Built to demonstrate full-stack capabilities in secure data handling.

**Developed at CyberdomeUSA** for secure credential sharing across distributed teams.

---

## 🔑 Technical Highlights

### Cryptography & Security
- **AES-256-GCM** authenticated encryption for password protection
- **PBKDF2** with 100,000 iterations for key derivation (SHA-256)
- **SHA-256** one-way hashing for access password verification
- **Zero-knowledge architecture** - server never processes plaintext
- **5-minute TTL** with automatic database cleanup

### Data Engineering
- **PostgreSQL** relational database with optimized indexing
- **Query optimization** - O(log n) indexed lookups for share retrieval
- **Data validation** at each pipeline stage
- **Efficient serialization** of encrypted binary data

### System Architecture
- **Three-tier design** - React frontend, Node.js backend, PostgreSQL database
- **RESTful API** for multi-device access and data synchronization
- **Cross-device functionality** with email + password verification
- **Production-ready** error handling and validation

---

## 🛠️ Technology Stack

**Frontend:** React 18.3, Vite 6.0  
**Backend:** Node.js, Express 4.18  
**Database:** PostgreSQL 15 with indexed queries  
**Cryptography:** Web Crypto API (AES-256-GCM, PBKDF2)  
**Deployment:** Vercel (frontend)

---

## 🏗️ Architecture

**Three-Tier System:**
```
React Frontend → Node.js Express API → PostgreSQL Database
     ↓                   ↓                      ↓
Client-side          Data Validation      Encrypted Storage
Encryption           & Processing         + Indexing
```

**Data Pipeline:**
Random Salt → PBKDF2 Key Derivation → AES-256-GCM Encryption → PostgreSQL Storage

---

## 📊 Database Schema & Performance

```sql
CREATE TABLE shares (
  id SERIAL PRIMARY KEY,
  share_id VARCHAR(32) UNIQUE NOT NULL,
  encrypted_data TEXT NOT NULL,
  salt TEXT NOT NULL,
  iv TEXT NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  access_password_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_share_id ON shares(share_id);
CREATE INDEX idx_recipient_email ON shares(recipient_email);
CREATE INDEX idx_expires_at ON shares(expires_at);
```

**Performance Characteristics:**
- Share lookup: O(log n) via indexed share_id
- Email validation: O(log n) via indexed email column
- Expired record cleanup: Automatic with timestamp indexing

---

## 🔐 Security Architecture

### Encryption Parameters
| Component | Implementation | Security Level |
|-----------|-----------------|-----------------|
| Algorithm | AES-256-GCM | NIST approved, 2^256 keyspace |
| Key Derivation | PBKDF2 (100k iterations) | 2^16.6 computational cost increase |
| Salt | 128-bit random | 2^128 rainbow table space required |
| Access Hash | SHA-256 one-way | Irreversible, server stores hash only |
| Expiration | 5-minute TTL | Time-limited attack window |

### Threat Mitigation
- **Brute Force:** 100k PBKDF2 iterations + ~10^60 years to crack
- **Rainbow Tables:** Unique per-session salt
- **Plaintext Exposure:** Zero-knowledge client-side decryption
- **Replay Attacks:** Timestamp-based expiration
- **Unauthorized Access:** Email + password two-factor verification

---

## 💻 How It Works

**Share Creation:**
User provides password → Frontend encrypts with AES-256-GCM using PBKDF2-derived key → Backend stores encrypted payload with expiration → Returns unique share link

**Share Access:**
Recipient opens link → Submits email + password → Backend validates identity and checks expiration → Returns encrypted data → Frontend decrypts in browser (server never sees plaintext)

---

## 🚀 Production Deployment

**CyberdomeUSA Production:**
- Private infrastructure deployment
- Custom API integration with company authentication
- Private PostgreSQL database
- Used by internal teams for secure credential sharing

**Public Demo Repository:**
- Demonstrates architecture and implementation
- Available on Vercel for reference
- Portfolio-quality code sample

---

**Built with:** React • Vite • Node.js • Express • PostgreSQL • AES-256-GCM • PBKDF2