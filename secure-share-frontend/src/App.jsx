import React, { useState, useEffect } from 'react';
import { Lock, Send, Eye, EyeOff, Copy, Check, Shield, Key } from 'lucide-react';

export default function SecurePasswordShare() {
  const [view, setView] = useState('create');
  const [shareId, setShareId] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // API endpoint - update this based on your deployment
  const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  
  // Create form state
  const [secretPassword, setSecretPassword] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  
  // View form state
  const [viewEmail, setViewEmail] = useState('');
  const [viewPassword, setViewPassword] = useState('');
  const [revealedSecret, setRevealedSecret] = useState('');
  const [error, setError] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [showAccessPassword, setShowAccessPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('share');
    if (id) {
      setShareId(id);
      setView('view');
    }
  }, []);

  const generateKey = async (password, salt) => {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  };

  const encryptData = async (data, password) => {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await generateKey(password, salt);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoder.encode(data)
    );
    
    return {
      encrypted: Array.from(new Uint8Array(encrypted)),
      salt: Array.from(salt),
      iv: Array.from(iv)
    };
  };

  const decryptData = async (encryptedData, password) => {
    const decoder = new TextDecoder();
    const salt = new Uint8Array(encryptedData.salt);
    const iv = new Uint8Array(encryptedData.iv);
    const key = await generateKey(password, salt);
    
    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        new Uint8Array(encryptedData.encrypted)
      );
      return decoder.decode(decrypted);
    } catch (e) {
      throw new Error('Invalid password');
    }
  };

  const handleCreateShare = async (e) => {
    e.preventDefault();
    console.log('Creating share...');
    
    setLoading(true);
    setError('');

    try {
      // Encrypt the secret
      const encrypted = await encryptData(secretPassword, accessPassword);
      console.log('Encryption complete');
      
      // Send to backend
      const response = await fetch(`${API_URL}/shares`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          encrypted: encrypted.encrypted,
          salt: encrypted.salt,
          iv: encrypted.iv,
          recipientEmail: recipientEmail.toLowerCase().trim(),
          accessPassword: accessPassword,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create share');
      }

      const data = await response.json();
      console.log('Share created:', data.shareId);
      
      // Generate shareable link
      const link = `${window.location.origin}${window.location.pathname}?share=${data.shareId}`;
      setShareLink(link);
      setShareId(data.shareId);
      
    } catch (err) {
      console.error('Error creating share:', err);
      setError('Failed to create secure share. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSecret = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRevealedSecret('');

    try {
      // Request encrypted data from backend
      const response = await fetch(`${API_URL}/shares/${shareId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail: viewEmail.toLowerCase().trim(),
          accessPassword: viewPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Access denied');
      }

      const encryptedData = await response.json();
      
      // Decrypt in browser
      const decrypted = await decryptData(encryptedData, viewPassword);
      setRevealedSecret(decrypted);
      setShowSecret(true);
      
    } catch (err) {
      console.error('Error accessing share:', err);
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetCreate = () => {
    setSecretPassword('');
    setRecipientEmail('');
    setAccessPassword('');
    setShareLink('');
    setShareId(null);
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'url(/background.jpeg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      padding: '2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'auto'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '500px',
        background: 'white',
        borderRadius: '24px',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        padding: '3rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <img 
              src="/logo.jpg" 
              alt="SecureShare Logo" 
              style={{ 
                width: '240px', 
                height: '120px',
                objectFit: 'contain'
              }} 
            />
          </div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#0f172a',
            margin: '0 0 0.5rem 0',
            letterSpacing: '-0.02em'
          }}>
            SecureShare
          </h1>
          <p style={{
            color: '#64748b',
            fontSize: '0.95rem',
            margin: 0
          }}>
            {view === 'create' ? 'Share passwords securely with anyone' : 'Access your secure share'}
          </p>
        </div>

        {view === 'create' && !shareLink && (
          <form onSubmit={handleCreateShare}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: '#1e293b',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Password to Share
              </label>
              <input
                type="text"
                value={secretPassword}
                onChange={(e) => setSecretPassword(e.target.value)}
                placeholder="Enter the password you want to share"
                required
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  color: '#0f172a',
                  fontSize: '0.95rem',
                  fontFamily: 'monospace',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: '#1e293b',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Recipient Email
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
                required
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  color: '#0f172a',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                color: '#1e293b',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Access Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showAccessPassword ? 'text' : 'password'}
                  value={accessPassword}
                  onChange={(e) => setAccessPassword(e.target.value)}
                  placeholder="Password to decrypt the share"
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    paddingRight: '3rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    color: '#0f172a',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowAccessPassword(!showAccessPassword)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showAccessPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p style={{
                color: '#64748b',
                fontSize: '0.8rem',
                marginTop: '0.5rem',
                marginBottom: 0
              }}>
                Share this password separately with the recipient
              </p>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: 0 }}>
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                background: loading ? '#cbd5e1' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            >
              <Send size={18} />
              {loading ? 'Creating Secure Share...' : 'Create Secure Share'}
            </button>
          </form>
        )}

        {shareLink && (
          <div>
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Check size={20} color="#22c55e" />
                <span style={{ color: '#22c55e', fontWeight: '600' }}>Share Created Successfully</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
                Send this link to <strong style={{ color: '#1e293b' }}>{recipientEmail}</strong>
              </p>
              <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem', marginBottom: 0 }}>
                ⏱️ This link will expire in 5 minutes
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: '#1e293b',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Secure Share Link
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '0.875rem 1rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    color: '#64748b',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={copyToClipboard}
                  style={{
                    padding: '0.875rem 1.25rem',
                    background: copied ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    border: `1px solid ${copied ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                    borderRadius: '12px',
                    color: copied ? '#22c55e' : '#3b82f6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: '600',
                    fontSize: '0.875rem'
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{ color: '#fbbf24', fontSize: '0.875rem', margin: 0, lineHeight: '1.5' }}>
                <strong>Important:</strong> Share the access password separately.
              </p>
            </div>

            <button
              onClick={resetCreate}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                color: '#475569',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Create Another Share
            </button>
          </div>
        )}

        {view === 'view' && !revealedSecret && (
          <form onSubmit={handleViewSecret}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: '#1e293b',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Your Email
              </label>
              <input
                type="email"
                value={viewEmail}
                onChange={(e) => setViewEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  color: '#0f172a',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                color: '#1e293b',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Access Password
              </label>
              <input
                type="password"
                value={viewPassword}
                onChange={(e) => setViewPassword(e.target.value)}
                placeholder="Enter the access password"
                required
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  color: '#0f172a',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: 0 }}>
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                background: loading ? '#cbd5e1' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: loading ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            >
              <Key size={18} />
              {loading ? 'Decrypting...' : 'View Secret'}
            </button>
          </form>
        )}

        {revealedSecret && (
          <div>
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Check size={20} color="#22c55e" />
                <span style={{ color: '#22c55e', fontWeight: '600' }}>Access Granted</span>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: '#1e293b',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Shared Password
              </label>
              <div style={{
                padding: '1.25rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px'
              }}>
                <div style={{
                  color: '#0f172a',
                  fontSize: '1.1rem',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  lineHeight: '1.6',
                  filter: showSecret ? 'none' : 'blur(8px)',
                  transition: 'filter 0.2s',
                  userSelect: showSecret ? 'text' : 'none'
                }}>
                  {revealedSecret}
                </div>
              </div>
              <button
                onClick={() => setShowSecret(!showSecret)}
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1.25rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '12px',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                {showSecret ? 'Hide Password' : 'Show Password'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}