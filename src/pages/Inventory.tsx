import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, Package, AlertTriangle, Clock, TrendingDown, Edit2, Check, X } from 'lucide-react';
import { getDB, saveDB, getInventoryView } from '../lib/db';
import * as XLSX from 'xlsx';
import type { User } from '../lib/db';

interface Props { user: User; }

const fmt = (n: number) => 'ETB ' + n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Inventory({ user }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'nearExpiry' | 'expired' | 'slowMoving' | 'lowStock'>('all');
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const db = useMemo(() => getDB(), [refreshKey]);
  const inventory = useMemo(() => getInventoryView(db), [db]);

  const filtered = useMemo(() => {
    let items = inventory;
    if (filter === 'nearExpiry') items = items.filter(i => i.isNearExpiry && !i.isExpired);
    else if (filter === 'expired') items = items.filter(i => i.isExpired);
    else if (filter === 'slowMoving') items = items.filter(i => i.isSlowMoving);
    else if (filter === 'lowStock') items = items.filter(i => i.isLowStock);

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.product?.description.toLowerCase().includes(q) ||
        i.product?.category.toLowerCase().includes(q) ||
        i.product?.manufacturer.toLowerCase().includes(q) ||
        i.batchNo.toLowerCase().includes(q) ||
        i.grnNumber.toLowerCase().includes(q)
      );
    }
    return items;
  }, [inventory, search, filter]);

  const handleExport = () => {
    const db2 = getDB();
    const data = filtered.map(item => {
      const grn = db2.grns.find(g => g.batchId === item.id);
      return {
        'Product': item.product?.description || '',
        'Category': item.product?.category || '',
        'Manufacturer': item.product?.manufacturer || '',
        'UOM': item.product?.uom || '',
        'Batch No': item.batchNo,
        'GRN No': item.grnNumber,
        'Expiry Date': item.expiryDate,
        'Days to Expiry': item.daysToExpiry,
        'Purchase Price (ETB)': item.purchasePrice,
        'Selling Price (ETB)': item.sellingPrice,
        'Qty on Hand': item.qtyOnHand,
        'Total Value (ETB)': item.totalValue,
        'Received Date': new Date(item.receivedDate).toLocaleDateString(),
        'Received By': grn?.receivedBy || grn?.createdBy || '',
        'Status': item.isExpired ? 'Expired' : item.isNearExpiry ? 'Near Expiry' : item.isSlowMoving ? 'Slow Moving' : 'Active',
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `PharmacyHub_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const startEditPrice = (batchId: string, currentPrice: number) => {
    setEditingPrice(batchId);
    setNewPrice(currentPrice.toString());
  };

  const savePrice = (batchId: string) => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) return;
    const db2 = getDB();
    const batch = db2.batches.find(b => b.id === batchId);
    if (batch) {
      batch.sellingPrice = price;
      saveDB(db2);
      setRefreshKey(k => k + 1);
    }
    setEditingPrice(null);
  };

  const cancelEdit = () => setEditingPrice(null);

  const getStatusBadge = (item: ReturnType<typeof getInventoryView>[0]) => {
    if (item.isExpired) return <span className="badge badge-danger"><AlertTriangle size={10} /> Expired</span>;
    if (item.isNearExpiry) return <span className="badge badge-warning"><Clock size={10} /> Near Expiry</span>;
    if (item.isSlowMoving) return <span className="badge" style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.2)' }}><TrendingDown size={10} /> Slow Moving</span>;
    if (item.isLowStock) return <span className="badge badge-info"><Package size={10} /> Low Stock</span>;
    return <span className="badge badge-success">Active</span>;
  };

  const totalValue = filtered.reduce((s, i) => s + i.totalValue, 0);
  const totalQty = filtered.reduce((s, i) => s + i.qtyOnHand, 0);

  return (
    <div style={{ padding: '24px', maxWidth: 1500, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Inventory Overview</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.875rem' }}>Real-time stock monitoring with smart alerts · Currency: Ethiopian Birr (ETB)</p>
      </motion.div>

      {/* Controls */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        style={{
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(148,163,184,0.1)', borderRadius: 16,
          padding: '16px 20px', marginBottom: 20,
          display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center'
        }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products, batch, category, GRN..."
            className="glass-input"
            style={{ width: '100%', padding: '9px 14px 9px 36px', borderRadius: 10, fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'nearExpiry', label: '⚠ Near Expiry' },
            { id: 'expired', label: '✕ Expired' },
            { id: 'slowMoving', label: '↓ Slow Moving' },
            { id: 'lowStock', label: '! Low Stock' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id as typeof filter)}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                background: filter === f.id ? 'rgba(37,99,235,0.25)' : 'rgba(255,255,255,0.05)',
                color: filter === f.id ? '#93c5fd' : '#64748b',
              }}>{f.label}</button>
          ))}
        </div>

        <button onClick={handleExport} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem', flexShrink: 0 }}>
          <Download size={15} /> Export Excel
        </button>
      </motion.div>

      {/* Summary Row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Showing', value: filtered.length + ' items' },
          { label: 'Total Qty', value: totalQty.toLocaleString() },
          { label: 'Total Value', value: fmt(totalValue) },
        ].map(s => (
          <div key={s.label} style={{
            background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)',
            borderRadius: 8, padding: '6px 14px', fontSize: '0.8rem',
          }}>
            <span style={{ color: '#64748b' }}>{s.label}: </span>
            <span style={{ color: '#93c5fd', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        style={{
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(148,163,184,0.1)', borderRadius: 16, overflow: 'hidden'
        }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Manufacturer</th>
                <th>Batch No</th>
                <th>GRN No</th>
                <th>UOM</th>
                <th>Expiry</th>
                <th>Days Left</th>
                <th>Buy Price</th>
                <th>Sell Price</th>
                <th>Qty</th>
                <th>Value (ETB)</th>
                <th>Received Date</th>
                <th>Received By</th>
                <th>Status</th>
                {user.role === 'Admin' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={16} style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
                  No inventory items found
                </td></tr>
              ) : (
                filtered.map(item => {
                  const grn = db.grns.find(g => g.batchId === item.id);
                  const receivedBy = grn?.receivedBy || grn?.createdBy || '—';
                  return (
                    <tr key={item.id} style={{
                      background: item.isExpired ? 'rgba(239,68,68,0.04)' :
                        item.isNearExpiry ? 'rgba(234,179,8,0.04)' :
                        item.isSlowMoving ? 'rgba(139,92,246,0.04)' : 'transparent'
                    }}>
                      <td style={{ fontWeight: 600, color: '#f1f5f9', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.product?.description}
                      </td>
                      <td><span className="badge badge-info">{item.product?.category}</span></td>
                      <td style={{ color: '#94a3b8', fontSize: '0.78rem', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product?.manufacturer}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: '#94a3b8' }}>{item.batchNo}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: '#60a5fa' }}>{item.grnNumber}</td>
                      <td><span className="badge badge-slate">{item.product?.uom}</span></td>
                      <td style={{ fontSize: '0.78rem', color: item.isExpired ? '#fca5a5' : item.isNearExpiry ? '#fde047' : '#94a3b8' }}>
                        {new Date(item.expiryDate).toLocaleDateString()}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem',
                        color: item.isExpired ? '#fca5a5' : item.daysToExpiry <= 30 ? '#fca5a5' : item.daysToExpiry <= 90 ? '#fde047' : '#94a3b8' }}>
                        {item.isExpired ? 'Expired' : `${item.daysToExpiry}d`}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {item.purchasePrice.toLocaleString('en-ET', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: '#86efac', whiteSpace: 'nowrap' }}>
                        {editingPrice === item.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)}
                              step="0.01" min="0"
                              style={{
                                width: 80, padding: '3px 6px', borderRadius: 6, fontSize: '0.8rem',
                                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(59,130,246,0.4)',
                                color: '#f1f5f9', outline: 'none'
                              }}
                              autoFocus
                            />
                            <button onClick={() => savePrice(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86efac' }}><Check size={14} /></button>
                            <button onClick={cancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5' }}><X size={14} /></button>
                          </div>
                        ) : (
                          <span>{item.sellingPrice.toLocaleString('en-ET', { minimumFractionDigits: 2 })}</span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem',
                        color: item.isLowStock ? '#fca5a5' : '#f1f5f9', fontWeight: 700 }}>
                        {item.qtyOnHand}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: '#f59e0b', whiteSpace: 'nowrap' }}>
                        {item.totalValue.toLocaleString('en-ET', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {new Date(item.receivedDate).toLocaleDateString('en-ET')}
                      </td>
                      <td>
                        <span className="badge badge-slate">{receivedBy}</span>
                      </td>
                      <td>{getStatusBadge(item)}</td>
                      {user.role === 'Admin' && (
                        <td>
                          {editingPrice !== item.id && (
                            <button onClick={() => startEditPrice(item.id, item.sellingPrice)}
                              style={{
                                background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.25)',
                                color: '#93c5fd', borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                                fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap'
                              }}>
                              <Edit2 size={12} /> Edit Price
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
