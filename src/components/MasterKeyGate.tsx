import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, Eye, EyeOff, ShieldOff, AlertCircle, Lock, Globe, Send } from 'lucide-react';
import { verifyMasterKey, setMasterKeyVerified } from '../lib/license';

interface Props {
  onVerified: () => void;
}

export default function MasterKeyGate({ onVerified }: Props) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (verifyMasterKey(key)) {
        setMasterKeyVerified();
        onVerified();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        triggerShake();
        if (newAttempts >= 3) {
          setError(`Access denied. ${newAttempts} failed attempt${newAttempts > 1 ? 's' : ''}. Contact PharmacyHub.et for support.`);
        } else {
          setError('Invalid master key. Access denied.');
        }
        setKey('');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #020617 0%, #0f172a 35%, #020617 70%, #0a0f1e 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Animated background grid */}
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(59,130,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,1) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Glowing orbs */}
      <div style={{ position: 'fixed', top: '20%', left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '15%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,78,216,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 460, padding: '0 20px', zIndex: 10 }}>
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <motion.div
              animate={{ boxShadow: ['0 0 20px rgba(37,99,235,0.3)', '0 0 40px rgba(37,99,235,0.6)', '0 0 20px rgba(37,99,235,0.3)'] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{
                width: 80, height: 80, borderRadius: 20,
                background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(59,130,246,0.4)',
              }}>
              <img src="/logo.png" alt="PH" style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8 }} />
            </motion.div>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.03em' }}>
            Pharmacy<span style={{ color: '#3b82f6' }}>Hub</span>
          </h1>
          <p style={{ margin: '4px 0 0', color: '#334155', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Secure System Access
          </p>
        </motion.div>

        {/* Gate Card */}
        <motion.div
          animate={shaking ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
            style={{
              background: 'rgba(10,16,30,0.85)', backdropFilter: 'blur(32px)',
              border: '1px solid rgba(59,130,246,0.18)', borderRadius: 24,
              padding: 36, boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            }}>

            {/* Icon + Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(29,78,216,0.1))',
                border: '1px solid rgba(59,130,246,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <KeyRound size={22} color="#60a5fa" />
              </div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
                  Master Key Required
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: 2 }}>
                  Enter the system master key to proceed
                </div>
              </div>
            </div>

            {/* Security notice */}
            <div style={{
              background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.14)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 24,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <ShieldOff size={15} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
                This system is <strong style={{ color: '#93c5fd' }}>subscription-protected</strong>. 
                A valid master key is required to initialize or renew access. 
                Contact <strong style={{ color: '#93c5fd' }}>PharmacyHub.et</strong> or Telegram{' '}
                <strong style={{ color: '#93c5fd' }}>@PharmacyHubEthiopia</strong> to subscribe.
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Master Key
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={key}
                    onChange={e => { setKey(e.target.value); setError(''); }}
                    placeholder="Enter master key..."
                    autoComplete="off"
                    spellCheck={false}
                    style={{
                      width: '100%', padding: '11px 42px 11px 38px', borderRadius: 12,
                      fontSize: '0.95rem', fontFamily: 'JetBrains Mono, monospace',
                      background: 'rgba(255,255,255,0.04)', border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : 'rgba(148,163,184,0.15)'}`,
                      color: '#f1f5f9', outline: 'none', letterSpacing: '0.1em',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => { if (!error) e.target.style.borderColor = 'rgba(59,130,246,0.5)'; }}
                    onBlur={e => { if (!error) e.target.style.borderColor = 'rgba(148,163,184,0.15)'; }}
                  />
                  <button type="button" onClick={() => setShowKey(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8, color: '#fca5a5',
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)',
                      borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.8rem', lineHeight: 1.4
                    }}>
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={loading || !key.trim()}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                  background: loading || !key.trim() ? 'rgba(37,99,235,0.3)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: 'white', fontSize: '0.9rem', fontWeight: 700, cursor: loading || !key.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
                  transition: 'all 0.2s',
                }}>
                <KeyRound size={16} />
                {loading ? 'Verifying...' : 'Unlock System'}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>

        {/* Contact footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ marginTop: 24, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            <a href="https://pharmacyhub.et" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#475569', fontSize: '0.75rem', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#93c5fd')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>
              <Globe size={13} /> PharmacyHub.et
            </a>
            <a href="https://t.me/PharmacyHubEthiopia" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#475569', fontSize: '0.75rem', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#93c5fd')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>
              <Send size={13} /> @PharmacyHubEthiopia
            </a>
          </div>
          <div style={{ color: '#1e293b', fontSize: '0.68rem', marginTop: 10 }}>
            Pharmacy Hub v2.0 · Licensed Software · All Rights Reserved
          </div>
        </motion.div>
      </div>
    </div>
  );
}
