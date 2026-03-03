import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import MasterKeyGate from './components/MasterKeyGate';
import SubscriptionWall from './components/SubscriptionWall';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Inbound from './pages/Inbound';
import Outbound from './pages/Outbound';
import Financial from './pages/Financial';
import UserManagement from './pages/UserManagement';
import { getLicenseInfo, isMasterKeyVerified, revokeLicense, clearMasterKeySession } from './lib/license';
import { isAdminSetup } from './lib/auth';
import type { User } from './lib/db';

const SESSION_KEY = 'pharmacy_hub_session';
const DB_KEY      = 'pharmacy_hub_db';

type AppStage =
  | 'checking'
  | 'master_key_gate'
  | 'subscription_wall'
  | 'login'
  | 'app';

export default function App() {
  const [stage, setStage] = useState<AppStage>('checking');
  const [licenseReason, setLicenseReason] = useState<'no_license' | 'expired' | 'tampered'>('no_license');
  const [user, setUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const determineStage = () => {
    const license      = getLicenseInfo();
    const adminReady   = isAdminSetup();
    const masterVerified = isMasterKeyVerified();

    if (license.status === 'active') {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        try { setUser(JSON.parse(saved)); setStage('app'); return; } catch {}
      }
      setStage('login');
      return;
    }

    if (license.status === 'no_license' && !adminReady) {
      setStage(masterVerified ? 'login' : 'master_key_gate');
      return;
    }

    if (
      license.status === 'no_license' ||
      license.status === 'expired'    ||
      license.status === 'tampered'
    ) {
      setLicenseReason(
        license.status === 'no_license' ? 'no_license' : license.status as 'expired' | 'tampered'
      );
      setStage('subscription_wall');
      return;
    }

    setStage('login');
  };

  useEffect(() => { determineStage(); }, []);

  // ── Full system reset (Admin only) ──────────────────────────────────────────
  const handleClearAllData = () => {
    // 1. Wipe the entire database
    localStorage.removeItem(DB_KEY);
    // 2. Revoke the license token
    revokeLicense();
    // 3. Clear the master-key session flag
    clearMasterKeySession();
    // 4. Clear user session
    sessionStorage.removeItem(SESSION_KEY);
    // 5. Reset React state
    setUser(null);
    setActivePage('dashboard');
    // 6. Re-evaluate — will land on master_key_gate since everything is wiped
    setStage('checking');
    setTimeout(() => determineStage(), 50);
  };

  const handleMasterKeyVerified = () => setStage('login');
  const handleLicenseActivated  = () => determineStage();

  const handleLogin = (u: User) => {
    setUser(u);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setStage('app');
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
    setActivePage('dashboard');
    determineStage();
  };

  // ── Stage gates ─────────────────────────────────────────────────────────────
  if (stage === 'checking') {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#475569', fontSize: '0.9rem' }}>Initializing…</div>
      </div>
    );
  }

  if (stage === 'master_key_gate') {
    return <MasterKeyGate onVerified={handleMasterKeyVerified} />;
  }

  if (stage === 'subscription_wall') {
    return <SubscriptionWall reason={licenseReason} onActivated={handleLicenseActivated} />;
  }

  if (stage === 'login' || !user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const sidebarWidth = sidebarCollapsed ? 64 : 240;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard user={user} onNavigate={p => setActivePage(p)} />;
      case 'inventory': return <Inventory user={user} />;
      case 'inbound':   return <Inbound   user={user} />;
      case 'outbound':  return <Outbound  user={user} />;
      case 'financial': return <Financial user={user} />;
      case 'users':     return <UserManagement user={user} />;
      default:          return <Dashboard user={user} onNavigate={p => setActivePage(p)} />;
    }
  };

  return (
    <div className="app-bg" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Decorative background orbs */}
      <div style={{ position: 'fixed', top: '15%', right: '10%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '20%', left: '15%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(29,78,216,0.04) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />

      <Sidebar
        user={user}
        active={activePage}
        onNavigate={p => setActivePage(p)}
        onLogout={handleLogout}
        onClearAllData={handleClearAllData}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />

      <main style={{
        marginLeft: sidebarWidth, flex: 1, minHeight: '100vh',
        transition: 'margin-left 0.3s ease',
        position: 'relative', zIndex: 1, overflowX: 'hidden',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
