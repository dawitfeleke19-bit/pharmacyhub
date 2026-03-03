
import { motion } from 'framer-motion';
import {
  TrendingUp, Package, AlertTriangle, DollarSign,
  ArrowUpCircle, ArrowDownCircle, Clock, Activity, ShieldAlert
} from 'lucide-react';
import { getDB, getInventoryView, getFinancialSummary } from '../lib/db';
import type { User } from '../lib/db';

interface Props { user: User; onNavigate: (page: string) => void; }

export default function Dashboard({ user, onNavigate }: Props) {
  const db = getDB();
  const inventory = getInventoryView(db);
  const financial = getFinancialSummary(db);

  const totalProducts = db.products.length;
  const totalBatches = db.batches.filter(b => b.qtyOnHand > 0).length;
  const nearExpiry = inventory.filter(i => i.isNearExpiry).length;
  const expired = inventory.filter(i => i.isExpired).length;
  const slowMoving = inventory.filter(i => i.isSlowMoving).length;
  const lowStock = inventory.filter(i => i.isLowStock).length;
  const totalGRNs = db.grns.length;
  const totalSTVs = db.stvs.length;

  const fmt = (n: number) => 'ETB ' + n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statCards = [
    { label: 'Total Products', value: totalProducts, icon: Package, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    { label: 'Active Batches', value: totalBatches, icon: Activity, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    { label: 'Total GRNs', value: totalGRNs, icon: ArrowDownCircle, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { label: 'Total STVs', value: totalSTVs, icon: ArrowUpCircle, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  ];

  const recentGRNs = [...db.grns].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const recentSTVs = [...db.stvs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
              Executive Dashboard
            </h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.875rem' }}>
              Welcome back, <span style={{ color: '#93c5fd', fontWeight: 600 }}>{user.username}</span> &bull; {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onNavigate('inbound')} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
              <ArrowDownCircle size={15} /> New GRN
            </button>
            <button onClick={() => onNavigate('outbound')} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
              <ArrowUpCircle size={15} /> New STV
            </button>
          </div>
        </div>
      </motion.div>

      {/* Alert Banner */}
      {(nearExpiry > 0 || expired > 0 || lowStock > 0) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
          }}>
          <ShieldAlert size={18} color="#fca5a5" />
          <span style={{ color: '#fca5a5', fontSize: '0.85rem', fontWeight: 600 }}>Attention Required:</span>
          {expired > 0 && <span style={{ color: '#fca5a5', fontSize: '0.82rem' }}>{expired} Expired Batch{expired > 1 ? 'es' : ''}</span>}
          {nearExpiry > 0 && <span style={{ color: '#fde047', fontSize: '0.82rem' }}>{nearExpiry} Near Expiry (≤90 days)</span>}
          {lowStock > 0 && <span style={{ color: '#93c5fd', fontSize: '0.82rem' }}>{lowStock} Low Stock Alert{lowStock > 1 ? 's' : ''}</span>}
          <button onClick={() => onNavigate('inventory')} style={{
            marginLeft: 'auto', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#fca5a5', borderRadius: 8, padding: '4px 12px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600
          }}>View Inventory →</button>
        </motion.div>
      )}

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              style={{
                background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(148,163,184,0.1)', borderRadius: 16, padding: 20,
                position: 'relative', overflow: 'hidden'
              }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80,
                background: card.bg, borderRadius: '50%', filter: 'blur(20px)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', marginTop: 6, lineHeight: 1 }}>{card.value}</div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={card.color} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Financial Summary (Admin only) */}
      {user.role === 'Admin' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <DollarSign size={18} color="#3b82f6" />
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>Financial Overview</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {[
              { label: 'Inventory Investment', value: fmt(financial.totalInvestment), color: '#f59e0b', sub: 'Total purchase cost' },
              { label: 'Potential Revenue', value: fmt(financial.totalSellingValue), color: '#10b981', sub: 'At selling price' },
              { label: 'Projected Profit', value: fmt(financial.projectedGrossProfit), color: '#3b82f6', sub: `${financial.grossMargin.toFixed(1)}% margin` },
              { label: 'Realized Revenue', value: fmt(financial.totalRevenue), color: '#8b5cf6', sub: 'From STVs' },
              { label: 'Realized Profit', value: fmt(financial.realizedProfit), color: '#ec4899', sub: `${financial.realizedMargin.toFixed(1)}% margin` },
            ].map((item, i) => (
              <div key={i} style={{
                background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(148,163,184,0.1)', borderRadius: 14, padding: '16px 18px'
              }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: item.color, fontFamily: 'JetBrains Mono, monospace' }}>{item.value}</div>
                <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 2 }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Inventory Alerts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Near Expiry', value: nearExpiry, icon: Clock, color: '#fde047', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)' },
          { label: 'Expired', value: expired, icon: AlertTriangle, color: '#fca5a5', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
          { label: 'Slow Moving', value: slowMoving, icon: TrendingUp, color: '#c4b5fd', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)' },
          { label: 'Low Stock', value: lowStock, icon: Package, color: '#93c5fd', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div key={item.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.05 }}
              onClick={() => onNavigate('inventory')}
              style={{
                background: item.bg, border: `1px solid ${item.border}`,
                borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s'
              }}
              whileHover={{ scale: 1.02 }}>
              <Icon size={22} color={item.color} />
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.value}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>{item.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent GRNs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{
            background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(148,163,184,0.1)', borderRadius: 16, padding: 20
          }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ArrowDownCircle size={16} color="#10b981" />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>Recent GRNs</span>
            </div>
            <button onClick={() => onNavigate('inbound')} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>View All →</button>
          </div>
          {recentGRNs.length === 0 ? (
            <div style={{ color: '#475569', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>No GRNs yet</div>
          ) : (
            recentGRNs.map(grn => {
              const product = db.products.find(p => p.id === grn.productId);
              return (
                <div key={grn.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid rgba(148,163,184,0.06)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>{grn.grnNumber}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{product?.description || 'Unknown'} &bull; Qty: {grn.quantity}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#10b981', fontFamily: 'JetBrains Mono, monospace' }}>ETB {grn.totalValue.toLocaleString('en-ET',{minimumFractionDigits:2})}</div>
                    <div style={{ fontSize: '0.7rem', color: '#475569' }}>{new Date(grn.date).toLocaleDateString()}</div>
                  </div>
                </div>
              );
            })
          )}
        </motion.div>

        {/* Recent STVs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          style={{
            background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(148,163,184,0.1)', borderRadius: 16, padding: 20
          }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ArrowUpCircle size={16} color="#f59e0b" />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>Recent STVs</span>
            </div>
            <button onClick={() => onNavigate('outbound')} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>View All →</button>
          </div>
          {recentSTVs.length === 0 ? (
            <div style={{ color: '#475569', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>No STVs yet</div>
          ) : (
            recentSTVs.map(stv => {
              const product = db.products.find(p => p.id === stv.productId);
              return (
                <div key={stv.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid rgba(148,163,184,0.06)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>{stv.stvNumber}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{product?.description || 'Unknown'} &bull; To: {stv.destination}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>ETB {stv.totalValue.toLocaleString('en-ET',{minimumFractionDigits:2})}</div>
                    <div style={{ fontSize: '0.7rem', color: '#475569' }}>{new Date(stv.date).toLocaleDateString()}</div>
                  </div>
                </div>
              );
            })
          )}
        </motion.div>
      </div>

      {/* Hero Image */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        style={{ marginTop: 24, borderRadius: 16, overflow: 'hidden', position: 'relative', height: 180 }}>
        <img src="/pharmacy-hero.jpg" alt="Pharmacy" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.4) saturate(0.8)' }} />
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(37,99,235,0.3), rgba(15,23,42,0.6))'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Pharmacy Hub</div>
            <div style={{ fontSize: '0.85rem', color: '#93c5fd', marginTop: 4 }}>Professional Pharmacy Management System</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
