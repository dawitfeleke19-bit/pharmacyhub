import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, ArrowDownCircle, ArrowUpCircle,
  BarChart3, Users, LogOut, Menu, X, ChevronRight, Globe, Send,
  CalendarClock, AlertTriangle, Trash2, ShieldAlert
} from 'lucide-react';
import { getLicenseInfo } from '../lib/license';
import type { User } from '../lib/db';

interface Props {
  user: User;
  active: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  onClearAllData: () => void;
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { id: 'dashboard',  label: 'Dashboard',         icon: LayoutDashboard },
  { id: 'inventory',  label: 'Inventory',          icon: Package },
  { id: 'inbound',    label: 'Inbound (GRN)',      icon: ArrowDownCircle },
  { id: 'outbound',   label: 'Outbound (STV)',     icon: ArrowUpCircle },
  { id: 'financial',  label: 'Financial Reports',  icon: BarChart3,  adminOnly: true },
  { id: 'users',      label: 'User Management',    icon: Users,      adminOnly: true },
];

export default function Sidebar({ user, active, onNavigate, onLogout, onClearAllData, collapsed, onToggle }: Props) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const license = getLicenseInfo();

  // Subscription countdown colour logic
  const days = license.daysRemaining ?? 0;
  const subColor   = days <= 14 ? '#fca5a5' : days <= 30 ? '#fde047' : '#86efac';
  const subBg      = days <= 14 ? 'rgba(239,68,68,0.12)' : days <= 30 ? 'rgba(234,179,8,0.1)' : 'rgba(34,197,94,0.08)';
  const subBorder  = days <= 14 ? 'rgba(239,68,68,0.25)' : days <= 30 ? 'rgba(234,179,8,0.2)' : 'rgba(34,197,94,0.15)';

  const handleClearConfirmed = () => {
    setShowClearConfirm(false);
    onClearAllData();
  };

  return (
    <>
      <motion.div
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{
          height: '100vh',
          position: 'fixed',
          left: 0, top: 0,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(10,16,30,0.92)',
          backdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(148,163,184,0.08)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* ── Logo header ── */}
        <div style={{
          padding: collapsed ? '16px 12px' : '16px 20px',
          borderBottom: '1px solid rgba(148,163,184,0.08)',
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 64,
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/logo.png" alt="PH" style={{ width: 24, height: 24, objectFit: 'contain', borderRadius: 4 }} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f1f5f9', whiteSpace: 'nowrap' }}>Pharmacy Hub</div>
                <div style={{ fontSize: '0.65rem', color: '#475569', whiteSpace: 'nowrap' }}>Management System</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/logo.png" alt="PH" style={{ width: 24, height: 24, objectFit: 'contain', borderRadius: 4 }} />
            </div>
          )}
          <button onClick={onToggle} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {collapsed ? <Menu size={16} /> : <X size={16} />}
          </button>
        </div>

        {/* ── Nav items ── */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {navItems.map(item => {
            if (item.adminOnly && user.role !== 'Admin') return null;
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  gap: 12, padding: collapsed ? '10px' : '10px 12px',
                  marginBottom: 4, borderRadius: 10, cursor: 'pointer', border: 'none',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  background: isActive ? 'rgba(37,99,235,0.18)' : 'transparent',
                  borderLeft: isActive && !collapsed ? '3px solid #3b82f6' : '3px solid transparent',
                  transition: 'all 0.2s ease',
                  color: isActive ? '#93c5fd' : '#64748b',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.08)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 600 : 500, whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
                    {item.label}
                  </span>
                )}
                {!collapsed && isActive && <ChevronRight size={14} />}
                {collapsed && isActive && (
                  <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, background: '#3b82f6', borderRadius: '0 2px 2px 0' }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Contact / links ── */}
        {!collapsed && (
          <div style={{ padding: '8px 12px', margin: '0 8px 6px', borderRadius: 10, background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.1)' }}>
            <div style={{ fontSize: '0.62rem', color: '#334155', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Contact & Support</div>
            <a href="https://pharmacyhub.et" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: '0.72rem', textDecoration: 'none', marginBottom: 3, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#93c5fd')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>
              <Globe size={11} /> PharmacyHub.et
            </a>
            <a href="https://t.me/PharmacyHubEthiopia" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: '0.72rem', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#93c5fd')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>
              <Send size={11} /> @PharmacyHubEthiopia
            </a>
          </div>
        )}

        {/* ── Subscription countdown ── */}
        {license.status === 'active' && (
          <div style={{ padding: '0 8px', marginBottom: 6 }}>
            {!collapsed ? (
              <div style={{ background: subBg, border: `1px solid ${subBorder}`, borderRadius: 10, padding: '8px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <CalendarClock size={11} color={subColor} />
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, color: subColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Subscription
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: subColor, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>
                    {days}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: subColor, opacity: 0.8 }}>days left</span>
                </div>
                {days <= 30 && (
                  <div style={{ fontSize: '0.62rem', color: subColor, opacity: 0.75, marginTop: 2 }}>
                    {days <= 14 ? '⚠ Renew soon!' : 'Renewal approaching'}
                  </div>
                )}
                {license.expiresAt && (
                  <div style={{ fontSize: '0.6rem', color: '#475569', marginTop: 2 }}>
                    Expires {license.expiresAt.toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
            ) : (
              /* Collapsed: just icon with colour dot */
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ position: 'relative', width: 34, height: 34, borderRadius: 8, background: subBg, border: `1px solid ${subBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title={`${days} days left`}>
                  <CalendarClock size={16} color={subColor} />
                  <div style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: '50%', background: subColor }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Admin: Clear All Data ── */}
        {user.role === 'Admin' && !collapsed && (
          <div style={{ padding: '0 8px', marginBottom: 6 }}>
            <button
              onClick={() => setShowClearConfirm(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                border: '1px solid rgba(239,68,68,0.18)',
                background: 'rgba(239,68,68,0.06)',
                color: '#f87171', fontSize: '0.78rem', fontWeight: 600,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.14)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.06)'; }}
            >
              <Trash2 size={14} style={{ flexShrink: 0 }} />
              <span>Reset System</span>
            </button>
          </div>
        )}
        {user.role === 'Admin' && collapsed && (
          <div style={{ padding: '0 8px', marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => setShowClearConfirm(true)}
              title="Reset System (Admin)"
              style={{ width: 34, height: 34, borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.07)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.16)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.07)'; }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}

        {/* ── User card + Sign out ── */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(148,163,184,0.08)' }}>
          {!collapsed && (
            <div style={{ padding: '10px 12px', marginBottom: 8, borderRadius: 10, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#93c5fd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.username}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 2 }}>
                <span style={{ background: user.role === 'Admin' ? 'rgba(37,99,235,0.2)' : 'rgba(100,116,139,0.2)', color: user.role === 'Admin' ? '#93c5fd' : '#94a3b8', padding: '1px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600 }}>
                  {user.role}
                </span>
              </div>
            </div>
          )}
          <button onClick={onLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '10px' : '10px 12px', borderRadius: 10, cursor: 'pointer', border: 'none', justifyContent: collapsed ? 'center' : 'flex-start', background: 'transparent', color: '#64748b', transition: 'all 0.2s ease' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
          >
            <LogOut size={18} style={{ flexShrink: 0 }} />
            {!collapsed && <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Sign Out</span>}
          </button>
        </div>
      </motion.div>

      {/* ── Clear All Data confirmation modal ── */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20,
            }}
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'rgba(10,16,30,0.97)', backdropFilter: 'blur(32px)',
                border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20,
                padding: 32, maxWidth: 440, width: '100%',
                boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
              }}
            >
              {/* Icon */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={28} color="#f87171" />
                </div>
              </div>

              <h2 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800, color: '#f1f5f9', textAlign: 'center' }}>
                Reset Entire System?
              </h2>
              <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: '#64748b', textAlign: 'center', lineHeight: 1.6 }}>
                This will permanently erase <strong style={{ color: '#fca5a5' }}>all data</strong> — users, inventory, GRNs, STVs, financial records, and the license. The system will restart from the <strong style={{ color: '#fca5a5' }}>Master Key gate</strong>, requiring a new admin setup.
              </p>

              {/* Warning list */}
              <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 10, padding: '12px 16px', marginBottom: 24 }}>
                {[
                  'All user accounts deleted',
                  'All inventory & batches erased',
                  'All GRNs and STVs removed',
                  'All financial data cleared',
                  'License revoked — master key required',
                ].map(w => (
                  <div key={w} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: '0.78rem', color: '#fca5a5' }}>
                    <AlertTriangle size={12} style={{ flexShrink: 0 }} /> {w}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearConfirmed}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 16px rgba(220,38,38,0.4)' }}
                >
                  <Trash2 size={15} /> Yes, Reset Everything
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
