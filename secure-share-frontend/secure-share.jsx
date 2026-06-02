import React, { useState, useEffect } from 'react';
import { Lock, Send, Eye, EyeOff, Copy, Check, Shield, Key } from 'lucide-react';

export default function SecurePasswordShare() {
  const [view, setView] = useState('create'); // 'create' or 'view'
  const [shareId, setShareId] = useState(null);
  const [loading, setLoading] = useState(false);
  
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
    // Check if URL contains a share ID
    const params = new URLSearchParams(window.location.search);
    const id = params.get('share');
    if (id) {
      setShareId(id);
      setView('view');
    }
  }, []);

  // Encryption utilities
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

  const generateShareId = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleCreateShare = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Encrypt the secret password
      const encrypted = await encryptData(secretPassword, accessPassword);
      
      // Generate unique share ID
      const id = generateShareId();
      
      // Store encrypted data with recipient email
      await window.storage.set(`share:${id}`, JSON.stringify({
        encrypted,
        recipientEmail: recipientEmail.toLowerCase().trim(),
        createdAt: new Date().toISOString()
      }), false);
      
      // Generate shareable link
      const link = `${window.location.origin}${window.location.pathname}?share=${id}`;
      setShareLink(link);
      setShareId(id);
      
    } catch (err) {
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
      // Retrieve encrypted data
      const result = await window.storage.get(`share:${shareId}`, false);
      
      if (!result) {
        throw new Error('Share not found or expired');
      }

      const shareData = JSON.parse(result.value);
      
      // Verify recipient email
      if (shareData.recipientEmail !== viewEmail.toLowerCase().trim()) {
        throw new Error('Invalid email address');
      }
      
      // Decrypt the secret
      const decrypted = await decryptData(shareData.encrypted, viewPassword);
      setRevealedSecret(decrypted);
      setShowSecret(true);
      
    } catch (err) {
      setError(err.message === 'Invalid password' ? 
        'Incorrect password' : 
        'Invalid email or share link');
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
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      padding: '2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '500px',
        background: 'rgba(30, 41, 59, 0.6)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        padding: '3rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: '16px',
            marginBottom: '1rem',
            boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)'
          }}>
            <Shield size={32} color="white" />
          </div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: 'white',
            margin: '0 0 0.5rem 0',
            letterSpacing: '-0.02em'
          }}>
            SecureShare
          </h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '0.95rem',
            margin: 0
          }}>
            {view === 'create' ? 'Share passwords securely with anyone' : 'Access your secure share'}
          </p>
        </div>

        {/* Create View */}
        {view === 'create' && !shareLink && (
          <form onSubmit={handleCreateShare}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: '#e2e8f0',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Password to Share
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={secretPassword}
                  onChange={(e) => setSecretPassword(e.target.value)}
                  placeholder="Enter the password you want to share"
                  required
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '0.95rem',
                    fontFamily: 'monospace',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)'}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: '#e2e8f0',
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
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)'}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                color: '#e2e8f0',
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
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)'}
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
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
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

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                background: loading ? '#475569' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
              onMouseEnter={(e) => {
                if (!loading) e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <Send size={18} />
              {loading ? 'Creating Secure Share...' : 'Create Secure Share'}
            </button>
          </form>
        )}

        {/* Share Link Display */}
        {shareLink && (
          <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
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
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
                Send this link to <strong style={{ color: '#e2e8f0' }}>{recipientEmail}</strong>
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: '#e2e8f0',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Secure Share Link
              </label>
              <div style={{
                display: 'flex',
                gap: '0.5rem'
              }}>
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '0.875rem 1rem',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '12px',
                    color: '#94a3b8',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={copyToClipboard}
                  style={{
                    padding: '0.875rem 1.25rem',
                    background: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    border: `1px solid ${copied ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                    borderRadius: '12px',
                    color: copied ? '#22c55e' : '#3b82f6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    transition: 'all 0.2s'
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
                <strong>Important:</strong> Share the access password separately with the recipient through a different channel.
              </p>
            </div>

            <button
              onClick={resetCreate}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'rgba(148, 163, 184, 0.1)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '12px',
                color: '#cbd5e1',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(148, 163, 184, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(148, 163, 184, 0.1)';
              }}
            >
              Create Another Share
            </button>
          </div>
        )}

        {/* View Secret */}
        {view === 'view' && (
          <div>
            {!revealedSecret ? (
              <form onSubmit={handleViewSecret}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    color: '#e2e8f0',
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
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '0.95rem',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)'}
                  />
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <label style={{
                    display: 'block',
                    color: '#e2e8f0',
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
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '0.95rem',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)'}
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
                    background: loading ? '#475569' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
                  onMouseEnter={(e) => {
                    if (!loading) e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  <Key size={18} />
                  {loading ? 'Decrypting...' : 'View Secret'}
                </button>
              </form>
            ) : (
              <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
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
                    color: '#e2e8f0',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem'
                  }}>
                    Shared Password
                  </label>
                  <div style={{
                    padding: '1.25rem',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '12px'
                  }}>
                    <div style={{
                      color: 'white',
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
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '12px',
                      color: '#3b82f6',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    {showSecret ? 'Hide Password' : 'Show Password'}
                  </button>
                </div>

                <div style={{
                  background: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '12px',
                  padding: '1rem'
                }}>
                  <p style={{ color: '#fbbf24', fontSize: '0.875rem', margin: 0, lineHeight: '1.5' }}>
                    <strong>Security Notice:</strong> Make sure to save this password securely. This share link will remain accessible until deleted.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
