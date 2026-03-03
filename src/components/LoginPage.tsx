import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, Eye, EyeOff, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { login, isAdminSetup, setupAdmin } from '../lib/auth';
import type { User as UserType } from '../lib/db';

interface Props {
  onLogin: (user: UserType) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const adminReady = isAdminSetup();
  const [mode, setMode] = useState<'login' | 'setup'>(adminReady ? 'login' : 'setup');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setTimeout(() => {
      const ok = setupAdmin(password);
      if (ok) {
        setSuccess('Admin account created! You can now log in.');
        setTimeout(() => { setMode('login'); setSuccess(''); setPassword(''); setConfirmPassword(''); }, 1500);
      } else {
        setError('Setup already completed.');
      }
      setLoading(false);
    }, 600);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const user = login(username, password);
      if (user) {
        onLogin(user);
      } else {
        setError('Invalid username or password.');
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f172a 70%, #162044 100%)' }}>
      {/* Background orbs */}
      <div style={{ position: 'fixed', top: '10%', left: '5%', width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '10%', right: '5%', width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(29,78,216,0.1) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none' }} />

      <div className="w-full max-w-md px-4 z-10">
        {/* Logo & Branding */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }} className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div style={{
              width: 80, height: 80, borderRadius: '20px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(37,99,235,0.4)',
              border: '1px solid rgba(255,255,255,0.15)'
            }}>
              <img src="/logo.png" alt="Pharmacy Hub" style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8 }} />
            </div>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Pharmacy Hub
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '4px 0 0' }}>Professional Pharmacy Management System</p>
        </motion.div>

        {/* Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            background: 'rgba(15,23,42,0.7)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(148,163,184,0.12)',
            borderRadius: 20,
            padding: '32px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)'
          }}>

          {mode === 'setup' ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(37,99,235,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(37,99,235,0.3)'
                }}>
                  <Shield size={20} color="#60a5fa" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>First-Run Admin Setup</h2>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Set the master Admin password to unlock the system</p>
                </div>
              </div>

              <form onSubmit={handleSetup}>
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Master Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Set a strong password"
                      required
                      className="glass-input"
                      style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: 10, fontSize: '0.9rem' }}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    className="glass-input"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: '0.9rem' }}
                  />
                </div>

                {error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fca5a5',
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.85rem' }}>
                    <AlertCircle size={16} /> {error}
                  </div>
                )}
                {success && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#86efac',
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                    borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.85rem' }}>
                    <CheckCircle size={16} /> {success}
                  </div>
                )}

                <button type="submit" className="btn-primary" disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                  {loading ? 'Setting up...' : 'Initialize System'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(37,99,235,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(37,99,235,0.3)'
                }}>
                  <Lock size={20} color="#60a5fa" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>Secure Login</h2>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Enter your credentials to access the system</p>
                </div>
              </div>

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Username</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="Enter username"
                      required
                      className="glass-input"
                      style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 10, fontSize: '0.9rem' }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="glass-input"
                      style={{ width: '100%', padding: '10px 40px 10px 36px', borderRadius: 10, fontSize: '0.9rem' }}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fca5a5',
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.85rem' }}>
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                <button type="submit" className="btn-primary" disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>
              </form>
            </>
          )}
        </motion.div>

        <p style={{ textAlign: 'center', color: '#334155', fontSize: '0.75rem', marginTop: 20 }}>
          Pharmacy Hub v1.0 &bull; Secure &bull; Professional
        </p>
      </div>
    </div>
  );
}
