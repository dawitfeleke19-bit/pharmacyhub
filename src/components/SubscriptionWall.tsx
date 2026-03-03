import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldOff, KeyRound, Eye, EyeOff, Globe, Send, AlertCircle, CalendarClock, RefreshCw, Clock } from 'lucide-react';
import { verifyMasterKey, activateLicense, getLicenseInfo, setMasterKeyVerified } from '../lib/license';

interface Props {
  reason: 'no_license' | 'expired' | 'tampered';
  onActivated: () => void;
}

export default function SubscriptionWall({ reason, onActivated }: Props) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);

  const info = getLicenseInfo();

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 600);
  };

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (verifyMasterKey(key)) {
        setMasterKeyVerified();
        activateLicense();
        onActivated();
      } else {
        triggerShake();
        setError('Invalid master key. Contact PharmacyHub.et to obtain a valid key.');
        setKey('');
      }
      setLoading(false);
    }, 900);
  };

  const titles: Record<string, string> = {
    no_license: 'Subscription Required',
    expired: 'Subscription Expired',
    tampered: 'License Integrity Error',
  };

  const subtitles: Record<string, string> = {
    no_license: 'This system requires an active subscription to operate.',
    expired: 'Your 365-day license has expired. Renew to restore access.',
    tampered: 'License data has been altered. Re-activation required.',
  };

  const icons: Record<string, React.ReactNode> = {
    no_license: <CalendarClock size={26} color="#60a5fa" />,
    expired: <Clock size={26} color="#fbbf24" />,
    tampered: <ShieldOff size={26} color="#f87171" />,
  };

  const borderColors: Record<string, string> = {
    no_license: 'rgba(59,130,246,0.2)',
    expired: 'rgba(251,191,36,0.2)',
    tampered: 'rgba(248,113,113,0.2)',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #020617 0%, #0f172a 35%, #020617 70%, #0a0f1e 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Grid bg */}
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.025,
        backgroundImage: 'linear-gradient(rgba(59,130,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,1) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none',
      }} />
      <div style={{ position: 'fixed', top: '20%', left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '15%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,78,216,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 480, padding: '0 20px', zIndex: 10 }}>
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <div style={{
              width: 68, height: 68, borderRadius: 18,
              background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(59,130,246,0.35)',
              boxShadow: '0 0 30px rgba(37,99,235,0.25)',
            }}>
              <img src="/logo.png" alt="PH" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8 }} />
            </div>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
            Pharmacy<span style={{ color: '#3b82f6' }}>Hub</span>
          </h1>
          <p style={{ margin: '3px 0 0', color: '#334155', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            PharmacyHub.et · Ethiopia
          </p>
        </motion.div>

        {/* Main card */}
        <motion.div
          animate={shaking ? { x: [-12, 12, -9, 9, -5, 5, 0] } : {}}
          transition={{ duration: 0.5 }}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{
              background: 'rgba(10,16,30,0.88)', backdropFilter: 'blur(32px)',
              border: `1px solid ${borderColors[reason]}`, borderRadius: 24,
              padding: 34, boxShadow: '0 32px 80px rgba(0,0,0,0.65)',
            }}>

            {/* Status header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: reason === 'expired' ? 'rgba(251,191,36,0.1)' : reason === 'tampered' ? 'rgba(239,68,68,0.1)' : 'rgba(37,99,235,0.12)',
                border: `1px solid ${borderColors[reason]}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {icons[reason]}
              </div>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f1f5f9' }}>{titles[reason]}</div>
                <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: 2, lineHeight: 1.4 }}>{subtitles[reason]}</div>
              </div>
            </div>

            {/* Expired info */}
            {reason === 'expired' && info.expiresAt && (
              <div style={{
                background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 20,
                display: 'flex', gap: 10, alignItems: 'center',
              }}>
                <RefreshCw size={14} color="#fbbf24" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.77rem', color: '#92400e', lineHeight: 1.5 }}>
                  License expired on <strong style={{ color: '#fbbf24' }}>{info.expiresAt.toLocaleDateString('en-ET', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>.
                  {' '}Enter the master key below to renew for another 365 days.
                </div>
              </div>
            )}

            {/* Subscription info */}
            <div style={{
              background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.12)',
              borderRadius: 10, padding: '12px 14px', marginBottom: 22,
            }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Subscription Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'License Type', value: 'Annual (365 Days)' },
                  { label: 'Currency', value: 'Ethiopian Birr (ETB)' },
                  { label: 'Support', value: '@PharmacyHubEthiopia' },
                  { label: 'Website', value: 'PharmacyHub.et' },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: '0.78rem', color: '#93c5fd', fontWeight: 600, marginTop: 1 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key form */}
            <form onSubmit={handleActivate}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Master Activation Key
              </label>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <KeyRound size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={key}
                  onChange={e => { setKey(e.target.value); setError(''); }}
                  placeholder="Enter master activation key..."
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    width: '100%', padding: '11px 42px 11px 38px', borderRadius: 12,
                    fontSize: '0.9rem', fontFamily: 'JetBrains Mono, monospace',
                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : 'rgba(148,163,184,0.12)'}`,
                    color: '#f1f5f9', outline: 'none', letterSpacing: '0.08em',
                  }}
                />
                <button type="button" onClick={() => setShowKey(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8, color: '#fca5a5',
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)',
                      borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: '0.78rem', lineHeight: 1.4,
                    }}>
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button type="submit" disabled={loading || !key.trim()} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                style={{
                  width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                  background: loading || !key.trim() ? 'rgba(37,99,235,0.25)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: 'white', fontSize: '0.9rem', fontWeight: 700,
                  cursor: loading || !key.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 20px rgba(37,99,235,0.3)',
                }}>
                <RefreshCw size={16} />
                {loading ? 'Activating...' : reason === 'expired' ? 'Renew Subscription' : 'Activate System'}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>

        {/* Footer links */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ marginTop: 22, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            <a href="https://pharmacyhub.et" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#475569', fontSize: '0.75rem', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#93c5fd')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>
              <Globe size={13} /> PharmacyHub.et
            </a>
            <a href="https://t.me/PharmacyHubEthiopia" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#475569', fontSize: '0.75rem', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#93c5fd')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>
              <Send size={13} /> @PharmacyHubEthiopia
            </a>
          </div>
          <div style={{ color: '#1e293b', fontSize: '0.65rem', marginTop: 10 }}>
            © 2025 PharmacyHub.et · All Rights Reserved · Licensed Software
          </div>
        </motion.div>
      </div>
    </div>
  );
}
