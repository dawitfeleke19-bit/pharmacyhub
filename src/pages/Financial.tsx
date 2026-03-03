
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3,
  Award, AlertTriangle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { getDB, getFinancialSummary } from '../lib/db';
import type { User } from '../lib/db';

interface Props { user: User; }

export default function Financial({ user }: Props) {
  if (user.role !== 'Admin') {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <AlertTriangle size={40} color="#fca5a5" style={{ marginBottom: 12 }} />
        <div style={{ color: '#fca5a5', fontSize: '1.1rem', fontWeight: 700 }}>Access Restricted</div>
        <div style={{ color: '#64748b', marginTop: 6 }}>Financial reports are available to Admin users only.</div>
      </div>
    );
  }

  const db = getDB();
  const fin = getFinancialSummary(db);
  const fmt = (n: number) => n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtBirr = (n: number) => 'ETB ' + fmt(n);
  const fmtPct = (n: number) => n.toFixed(1) + '%';

  // Monthly chart data
  const months = Object.keys(fin.monthlyData).sort();
  const maxRevenue = Math.max(...months.map(m => fin.monthlyData[m].revenue), 1);

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Financial Reports</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.875rem' }}>Admin-only financial analytics &bull; Weighted Average Cost &bull; Margin Analysis</p>
      </motion.div>

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          {
            label: 'Inventory Investment', value: `$${fmt(fin.totalInvestment)}`,
            sub: 'Total purchase cost (WAC)', icon: DollarSign,
            color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)'
          },
          {
            label: 'Potential Revenue', value: `$${fmt(fin.totalSellingValue)}`,
            sub: 'At current selling prices', icon: TrendingUp,
            color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)'
          },
          {
            label: 'Projected Gross Profit', value: `$${fmt(fin.projectedGrossProfit)}`,
            sub: `${fmtPct(fin.grossMargin)} gross margin`, icon: ArrowUpRight,
            color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)'
          },
          {
            label: 'Weighted Avg Cost', value: `$${fmt(fin.wac)}`,
            sub: 'Per unit across all batches', icon: BarChart3,
            color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)'
          },
          {
            label: 'Realized Revenue', value: fmtBirr(fin.totalRevenue),
            sub: 'From completed STVs', icon: DollarSign,
            color: '#ec4899', bg: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.2)'
          },
          {
            label: 'Realized Profit', value: fmtBirr(fin.realizedProfit),
            sub: `${fmtPct(fin.realizedMargin)} realized margin`, icon: fin.realizedProfit >= 0 ? ArrowUpRight : ArrowDownRight,
            color: fin.realizedProfit >= 0 ? '#10b981' : '#ef4444',
            bg: fin.realizedProfit >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: fin.realizedProfit >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              style={{
                background: card.bg, border: `1px solid ${card.border}`,
                borderRadius: 16, padding: '18px 20px',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{card.label}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: card.color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.1 }}>{card.value}</div>
                  <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 4 }}>{card.sub}</div>
                </div>
                <Icon size={22} color={card.color} style={{ flexShrink: 0, marginLeft: 8, opacity: 0.8 }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Monthly Revenue Chart */}
      {months.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{
            background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(148,163,184,0.1)', borderRadius: 16, padding: 24, marginBottom: 24
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <BarChart3 size={18} color="#3b82f6" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>Monthly Revenue vs COGS</h3>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 160, overflowX: 'auto' }}>
            {months.map(month => {
              const data = fin.monthlyData[month];
              const revenueH = (data.revenue / maxRevenue) * 140;
              const cogsH = (data.cogs / maxRevenue) * 140;
              const profit = data.revenue - data.cogs;
              return (
                <div key={month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 60, flex: 1 }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
                    ${(data.revenue / 1000).toFixed(1)}k
                  </div>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 140 }}>
                    <div style={{ width: 18, height: Math.max(revenueH, 2), background: 'linear-gradient(180deg, #3b82f6, #1d4ed8)', borderRadius: '3px 3px 0 0', transition: 'height 0.5s ease' }} />
                    <div style={{ width: 18, height: Math.max(cogsH, 2), background: 'linear-gradient(180deg, #f59e0b, #d97706)', borderRadius: '3px 3px 0 0', transition: 'height 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{month.slice(5)}/{month.slice(2, 4)}</div>
                  <div style={{ fontSize: '0.6rem', color: profit >= 0 ? '#86efac' : '#fca5a5', fontWeight: 600 }}>
                    {profit >= 0 ? '+' : ''}${(profit).toFixed(0)}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#64748b' }}>
              <div style={{ width: 12, height: 12, background: '#3b82f6', borderRadius: 2 }} /> Revenue
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#64748b' }}>
              <div style={{ width: 12, height: 12, background: '#f59e0b', borderRadius: 2 }} /> COGS
            </div>
          </div>
        </motion.div>
      )}

      {/* Best & Worst Performers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Best Performers */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
          style={{
            background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(16,185,129,0.15)', borderRadius: 16, padding: 22
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Award size={18} color="#10b981" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9' }}>Best Performing Products</h3>
          </div>
          {fin.bestPerformers.length === 0 ? (
            <div style={{ color: '#475569', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>No sales data yet</div>
          ) : (
            fin.bestPerformers.map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: i < fin.bestPerformers.length - 1 ? '1px solid rgba(148,163,184,0.06)' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: i === 0 ? 'rgba(251,191,36,0.2)' : 'rgba(16,185,129,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 800, color: i === 0 ? '#fbbf24' : '#10b981'
                  }}>#{i + 1}</div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9' }}>{p.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{p.category} &bull; {p.unitsSold} units sold</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', fontFamily: 'JetBrains Mono, monospace' }}>{fmtPct(p.margin)}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>ETB {fmt(p.revenue)} rev</div>
                </div>
              </div>
            ))
          )}
        </motion.div>

        {/* Worst Performers */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
          style={{
            background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(239,68,68,0.15)', borderRadius: 16, padding: 22
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingDown size={18} color="#ef4444" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9' }}>Worst Performing Products</h3>
          </div>
          {fin.worstPerformers.length === 0 ? (
            <div style={{ color: '#475569', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>No sales data yet</div>
          ) : (
            fin.worstPerformers.map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: i < fin.worstPerformers.length - 1 ? '1px solid rgba(148,163,184,0.06)' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: 'rgba(239,68,68,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 800, color: '#ef4444'
                  }}>#{i + 1}</div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9' }}>{p.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{p.category} &bull; {p.unitsSold} units sold</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>{fmtPct(p.margin)}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>ETB {fmt(p.revenue)} rev</div>
                </div>
              </div>
            ))
          )}
        </motion.div>
      </div>

      {/* Detailed Product Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        style={{
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(148,163,184,0.1)', borderRadius: 16, overflow: 'hidden'
        }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9' }}>Inventory Valuation Detail</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>UOM</th>
                <th>Qty on Hand</th>
                <th>Buy Price (WAC)</th>
                <th>Sell Price</th>
                <th>Investment Value</th>
                <th>Selling Value</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {db.batches.filter(b => b.qtyOnHand > 0).map(batch => {
                const product = db.products.find(p => p.id === batch.productId);
                const category = db.categories.find(c => c.id === product?.categoryId);
                const investVal = batch.purchasePrice * batch.qtyOnHand;
                const sellVal = batch.sellingPrice * batch.qtyOnHand;
                const margin = sellVal > 0 ? ((sellVal - investVal) / sellVal * 100) : 0;
                return (
                  <tr key={batch.id}>
                    <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{product?.description}</td>
                    <td><span className="badge badge-info">{category?.name}</span></td>
                    <td><span className="badge badge-slate">{product?.uom}</span></td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{batch.qtyOnHand}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#94a3b8' }}>${batch.purchasePrice.toFixed(2)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#86efac' }}>${batch.sellingPrice.toFixed(2)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#f59e0b' }}>${fmt(investVal)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#10b981' }}>${fmt(sellVal)}</td>
                    <td>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                        color: margin >= 30 ? '#86efac' : margin >= 15 ? '#fde047' : '#fca5a5'
                      }}>{margin.toFixed(1)}%</span>
                    </td>
                  </tr>
                );
              })}
              {db.batches.filter(b => b.qtyOnHand > 0).length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: '#475569' }}>No inventory data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
