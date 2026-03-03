import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpCircle, Printer, CheckCircle, ArrowLeft, Package, AlertCircle, Search } from 'lucide-react';
// Printer imported above
import { getDB, saveDB, generateId, getNextSTV } from '../lib/db';
import type { User } from '../lib/db';

interface Props { user: User; }

interface STVDoc {
  stvNumber: string; date: string; issuedBy: string; destination: string;
  product: string; category: string; manufacturer: string;
  batchNo: string; batchId: string; quantity: number;
  sellingPrice: number; totalValue: number; uom: string;
  remainingQty: number; reorderLevel: number; isLowStock: boolean;
}

const fmtBirr = (n: number) => 'ETB ' + n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Outbound({ user }: Props) {
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [destination, setDestination] = useState('');
  const [batchSearch, setBatchSearch] = useState('');
  const [view, setView] = useState<'form' | 'doc' | 'history'>('form');
  const [stvDoc, setStvDoc] = useState<STVDoc | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const db = useMemo(() => getDB(), [refreshKey]);

  const availableBatches = useMemo(() => {
    return db.batches
      .filter(b => b.qtyOnHand > 0)
      .map(batch => {
        const product = db.products.find(p => p.id === batch.productId);
        const category = db.categories.find(c => c.id === product?.categoryId);
        const manufacturer = db.manufacturers.find(m => m.id === product?.manufacturerId);
        return { ...batch, product, category, manufacturer };
      })
      .sort((a, b) => (a.product?.description || '').localeCompare(b.product?.description || ''));
  }, [refreshKey]);

  // Filtered batches based on search
  const filteredBatches = useMemo(() => {
    if (!batchSearch.trim()) return availableBatches;
    const q = batchSearch.toLowerCase();
    return availableBatches.filter(b =>
      b.product?.description.toLowerCase().includes(q) ||
      b.batchNo.toLowerCase().includes(q) ||
      b.category?.name.toLowerCase().includes(q) ||
      b.manufacturer?.name.toLowerCase().includes(q) ||
      b.grnNumber.toLowerCase().includes(q)
    );
  }, [availableBatches, batchSearch]);

  const selectedBatch = availableBatches.find(b => b.id === selectedBatchId);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedBatchId) e.batch = 'Please select a batch';
    if (!quantity || parseInt(quantity) <= 0) e.quantity = 'Must be > 0';
    if (selectedBatch && parseInt(quantity) > selectedBatch.qtyOnHand) e.quantity = `Max available: ${selectedBatch.qtyOnHand}`;
    if (!destination.trim()) e.destination = 'Destination is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selectedBatch) return;

    const db2 = getDB();
    const stvNumber = getNextSTV(db2);
    const qty = parseInt(quantity);
    const sellingPrice = selectedBatch.sellingPrice;
    const totalValue = sellingPrice * qty;

    const batchInDB = db2.batches.find(b => b.id === selectedBatchId);
    if (!batchInDB) return;
    batchInDB.qtyOnHand -= qty;
    const remainingQty = batchInDB.qtyOnHand;
    const product = db2.products.find(p => p.id === batchInDB.productId);
    const reorderLevel = product?.reorderLevel || 0;
    const isLowStock = remainingQty <= reorderLevel;

    const stv = {
      id: generateId(), stvNumber,
      batchId: selectedBatchId, productId: batchInDB.productId,
      quantity: qty, sellingPrice,
      destination: destination.trim(),
      date: new Date().toISOString(),
      issuedBy: user.username, totalValue,
    };
    db2.stvs.push(stv);
    saveDB(db2);

    const category = db2.categories.find(c => c.id === product?.categoryId);
    const manufacturer = db2.manufacturers.find(m => m.id === product?.manufacturerId);

    const doc: STVDoc = {
      stvNumber, date: new Date().toISOString(),
      issuedBy: user.username, destination: destination.trim(),
      product: product?.description || '',
      category: category?.name || '',
      manufacturer: manufacturer?.name || '',
      batchNo: selectedBatch.batchNo, batchId: selectedBatchId,
      quantity: qty, sellingPrice, totalValue,
      uom: product?.uom || '',
      remainingQty, reorderLevel, isLowStock,
    };

    setStvDoc(doc);
    setView('doc');
    setSelectedBatchId(''); setQuantity(''); setDestination(''); setBatchSearch('');
    setRefreshKey(k => k + 1);
  };

  const handlePrintSTV = (doc: STVDoc) => {
    const fmtB    = (n: number) => 'ETB ' + n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const dateStr = new Date(doc.date).toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = new Date(doc.date).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' });
    const genAt   = new Date().toLocaleString('en-ET', { dateStyle: 'short', timeStyle: 'short' });
    const spFmt   = fmtB(doc.sellingPrice);
    const totFmt  = fmtB(doc.totalValue);

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>${doc.stvNumber}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 14mm 12mm 14mm; }
  *  { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 8.5pt; color: #1e293b; background: #fff; }

  .topbar { height: 4px; background: linear-gradient(90deg,#1d4ed8,#3b82f6); margin-bottom: 10px; }

  .hdr { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; border-bottom: 1.5px solid #1d4ed8; margin-bottom: 8px; }
  .brand-text .name  { font-size: 13pt; font-weight: 900; color: #1d4ed8; letter-spacing: -0.03em; line-height: 1; }
  .brand-text .site  { font-size: 6.5pt; color: #64748b; margin-top: 1px; }
  .brand-text .dtype { font-size: 6pt; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 3px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 3px; display: inline-block; padding: 1px 5px; }
  .doc-ref { text-align: right; }
  .doc-ref .num  { font-size: 12pt; font-weight: 900; font-family: monospace; color: #1e293b; }
  .doc-ref .meta { font-size: 7pt; color: #475569; line-height: 1.55; margin-top: 2px; }
  .doc-ref .meta b { color: #1e293b; }

  .dest-strip { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; }
  .dest-lbl { font-size: 6pt; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; white-space: nowrap; }
  .dest-val { font-size: 9.5pt; font-weight: 800; color: #1d4ed8; }

  .info-strip { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 8px; overflow: hidden; }
  .info-cell  { padding: 5px 8px; }
  .info-cell:first-child { border-right: 1px solid #e2e8f0; }
  .info-lbl { font-size: 6pt; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }
  .info-val { font-size: 8pt; font-weight: 700; color: #1e293b; margin-top: 1px; }

  .sec { font-size: 6pt; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.12em; background: #eff6ff; border-left: 3px solid #2563eb; padding: 3px 7px; margin: 7px 0 4px; }

  table  { width: 100%; border-collapse: collapse; }
  th     { background: #1d4ed8; color: #fff; font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; padding: 5px 6px; text-align: left; border: 1px solid #1d4ed8; }
  td     { font-size: 8pt; color: #1e293b; padding: 5px 6px; border: 1px solid #e2e8f0; vertical-align: middle; }
  tr:nth-child(even) td { background: #f8fafc; }
  td.mono  { font-family: monospace; font-size: 7.5pt; }
  td.bold  { font-weight: 700; }
  td.right { text-align: right; }

  .fin-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .fin-table td { padding: 5px 8px; font-size: 8pt; border: 1px solid #e2e8f0; }
  .fin-table .lbl { color: #64748b; font-size: 7.5pt; }
  .fin-table .val { font-family: monospace; font-weight: 700; color: #1d4ed8; text-align: right; }
  .fin-table .total-row td { background: #1d4ed8; color: #fff; font-weight: 800; font-size: 9pt; }
  .fin-table .total-row .val { color: #fff; font-size: 10pt; }

  .notice { border: 1px solid #fde047; background: #fefce8; border-radius: 4px; padding: 5px 8px; font-size: 7pt; color: #854d0e; margin-top: 8px; }

  .sig-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 14px; }
  .sig-box  { border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 8px; }
  .sig-prefill { font-size: 8pt; font-weight: 700; color: #1d4ed8; margin-bottom: 2px; }
  .sig-line-el { border-top: 1px solid #334155; margin-top: 22px; padding-top: 4px; }
  .sig-role { font-size: 6.5pt; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.07em; }
  .sig-sub  { font-size: 6pt; color: #94a3b8; margin-top: 1px; }

  .footer { margin-top: 10px; padding-top: 6px; border-top: 1px dashed #e2e8f0; font-size: 6.5pt; color: #94a3b8; display: flex; justify-content: space-between; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="topbar"></div>

<!-- HEADER -->
<div class="hdr">
  <div class="brand-text">
    <div class="name">Pharmacy Hub</div>
    <div class="site">PharmacyHub.et &bull; @PharmacyHubEthiopia</div>
    <div class="dtype">Stock Transfer Voucher</div>
  </div>
  <div class="doc-ref">
    <div class="num">${doc.stvNumber}</div>
    <div class="meta">
      Date: <b>${dateStr}</b> &nbsp; Time: <b>${timeStr}</b><br/>
      Issued By: <b>${doc.issuedBy}</b>
    </div>
  </div>
</div>

<!-- DESTINATION -->
<div class="dest-strip">
  <div class="dest-lbl">Destination / Recipient</div>
  <div class="dest-val">${doc.destination}</div>
</div>

<!-- PRODUCT INFO STRIP -->
<div class="info-strip">
  <div class="info-cell">
    <div class="info-lbl">Product Description</div>
    <div class="info-val">${doc.product}</div>
  </div>
  <div class="info-cell">
    <div class="info-lbl">Manufacturer</div>
    <div class="info-val">${doc.manufacturer}</div>
  </div>
</div>

<!-- DISPENSED ITEMS TABLE -->
<div class="sec">Dispensed Items</div>
<table>
  <thead>
    <tr>
      <th>Category</th>
      <th>Unit (UOM)</th>
      <th>Batch No</th>
      <th>Qty Dispatched</th>
      <th>Unit Selling Price (ETB)</th>
      <th>Total Value (ETB)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>${doc.category}</td>
      <td>${doc.uom}</td>
      <td class="mono">${doc.batchNo}</td>
      <td class="bold right">${doc.quantity} ${doc.uom}</td>
      <td class="mono right">${spFmt}</td>
      <td class="mono bold right">${totFmt}</td>
    </tr>
  </tbody>
</table>

<!-- TRANSFER SUMMARY -->
<div class="sec">Transfer Summary — Ethiopian Birr (ETB)</div>
<table class="fin-table">
  <tbody>
    <tr>
      <td class="lbl">Quantity Dispatched</td>
      <td class="val">${doc.quantity} ${doc.uom}</td>
      <td class="lbl">Unit Selling Price</td>
      <td class="val">${spFmt}</td>
    </tr>
    <tr>
      <td class="lbl">Batch Reference</td>
      <td class="val" style="font-family:monospace;font-size:7pt;">${doc.batchId}</td>
      <td class="lbl">Document No.</td>
      <td class="val" style="font-family:monospace;">${doc.stvNumber}</td>
    </tr>
    <tr class="total-row">
      <td colspan="3" class="lbl" style="color:#fff;font-weight:700;">TOTAL TRANSFER VALUE</td>
      <td class="val">${totFmt}</td>
    </tr>
  </tbody>
</table>

<div class="notice">
  &#9432; Purchase price is confidential and not disclosed on this document per pharmacy policy. Selling price only.
</div>

<!-- SIGNATURE BLOCK -->
<div class="sig-row">
  <div class="sig-box">
    <div class="sig-prefill">${doc.issuedBy}</div>
    <div class="sig-line-el">
      <div class="sig-role">Issued By</div>
      <div class="sig-sub">Name &amp; Signature</div>
    </div>
  </div>
  <div class="sig-box">
    <div class="sig-line-el">
      <div class="sig-role">Authorized By</div>
      <div class="sig-sub">Name &amp; Signature</div>
    </div>
  </div>
  <div class="sig-box">
    <div class="sig-line-el">
      <div class="sig-role">Receiver's Name &amp; Signature</div>
      <div class="sig-sub">Name &amp; Signature</div>
    </div>
  </div>
</div>

<!-- FOOTER -->
<div class="footer">
  <span>Doc ID: ${doc.batchId}</span>
  <span>Generated: ${genAt} &bull; PharmacyHub.et v2.0</span>
  <span>Operator: ${doc.issuedBy}</span>
</div>

</body>
</html>`;

    const win = window.open('', '_blank', 'width=794,height=1123');
    if (!win) { alert('Pop-up blocked. Please allow pop-ups for this site and try again.'); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
    setTimeout(() => { try { win.focus(); win.print(); } catch(_) {} }, 700);
  };

  if (view === 'doc' && stvDoc) {
    return (
      <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
        <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={() => setView('form')} className="btn-secondary"><ArrowLeft size={16} /> New STV</button>
          <button onClick={() => setView('history')} className="btn-secondary"><Package size={16} /> History</button>
          <button onClick={() => handlePrintSTV(stvDoc)} className="btn-primary"><Printer size={16} /> Print STV</button>
        </div>

        {stvDoc.isLowStock && (
          <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={18} color="#60a5fa" />
            <div>
              <span style={{ color: '#60a5fa', fontWeight: 700, fontSize: '0.88rem' }}>Low Stock Alert: </span>
              <span style={{ color: '#93c5fd', fontSize: '0.85rem' }}>{stvDoc.product} has {stvDoc.remainingQty} units remaining (Reorder Level: {stvDoc.reorderLevel})</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '12px 16px' }}>
          <CheckCircle size={20} color="#86efac" />
          <div>
            <div style={{ color: '#86efac', fontWeight: 700, fontSize: '0.9rem' }}>STV Successfully Created</div>
            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Stock deducted from inventory. Dashboard updated.</div>
          </div>
        </div>

        {/* STV Document */}
        <div style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 16, padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid rgba(37,99,235,0.4)', paddingBottom: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img src="/logo.png" alt="PH" style={{ width: 52, height: 52, borderRadius: 10, border: '2px solid rgba(37,99,235,0.4)' }} />
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#93c5fd', letterSpacing: '-0.02em' }}>PHARMACY HUB</div>
                <div style={{ color: '#64748b', fontSize: '0.78rem' }}>PharmacyHub.et · Professional Pharmacy Management System</div>
                <div style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: 700, marginTop: 2 }}>STOCK TRANSFER VOUCHER</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', fontFamily: 'JetBrains Mono, monospace' }}>{stvDoc.stvNumber}</div>
              <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 4 }}>Date: {new Date(stvDoc.date).toLocaleDateString('en-ET', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div style={{ color: '#64748b', fontSize: '0.78rem' }}>Time: {new Date(stvDoc.date).toLocaleTimeString()}</div>
              <div style={{ color: '#64748b', fontSize: '0.78rem' }}>Issued By: <span style={{ color: '#93c5fd', fontWeight: 600 }}>{stvDoc.issuedBy}</span></div>
            </div>
          </div>

          <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Destination / Recipient</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', marginTop: 2 }}>{stvDoc.destination}</div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Dispensed Items</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(37,99,235,0.12)' }}>
                  {['Product Description', 'Category', 'Batch No', 'UOM', 'Qty Dispatched', 'Unit Selling Price (ETB)', 'Total Value (ETB)'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.06em', border: '1px solid rgba(148,163,184,0.1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px 12px', fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9', border: '1px solid rgba(148,163,184,0.08)' }}>{stvDoc.product}</td>
                  <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#93c5fd', border: '1px solid rgba(148,163,184,0.08)' }}>{stvDoc.category}</td>
                  <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#cbd5e1', fontFamily: 'JetBrains Mono, monospace', border: '1px solid rgba(148,163,184,0.08)' }}>{stvDoc.batchNo}</td>
                  <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#cbd5e1', border: '1px solid rgba(148,163,184,0.08)' }}>{stvDoc.uom}</td>
                  <td style={{ padding: '10px 12px', fontSize: '0.9rem', fontWeight: 800, color: '#f1f5f9', fontFamily: 'JetBrains Mono, monospace', border: '1px solid rgba(148,163,184,0.08)' }}>{stvDoc.quantity} {stvDoc.uom}</td>
                  <td style={{ padding: '10px 12px', fontSize: '0.85rem', color: '#86efac', fontFamily: 'JetBrains Mono, monospace', border: '1px solid rgba(148,163,184,0.08)' }}>{fmtBirr(stvDoc.sellingPrice)}</td>
                  <td style={{ padding: '10px 12px', fontSize: '0.9rem', fontWeight: 800, color: '#93c5fd', fontFamily: 'JetBrains Mono, monospace', border: '1px solid rgba(148,163,184,0.08)' }}>{fmtBirr(stvDoc.totalValue)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Transfer Summary (Ethiopian Birr)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { label: 'Qty Dispatched', value: `${stvDoc.quantity} ${stvDoc.uom}` },
                { label: 'Unit Selling Price', value: fmtBirr(stvDoc.sellingPrice) },
                { label: 'Total Transfer Value', value: fmtBirr(stvDoc.totalValue), highlight: true },
              ].map(item => (
                <div key={item.label} style={{ background: item.highlight ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${item.highlight ? 'rgba(37,99,235,0.25)' : 'rgba(148,163,184,0.1)'}`, borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: item.highlight ? '#93c5fd' : '#f1f5f9', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)', borderRadius: 8, fontSize: '0.75rem', color: '#92400e' }}>
              ℹ Purchase price is confidential and not disclosed on this document per pharmacy policy.
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(148,163,184,0.15)', paddingTop: 24 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Verification & Signatures</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              {[
                { role: 'Issued By', prefill: stvDoc.issuedBy },
                { role: 'Authorized By', prefill: null },
                { role: "Receiver's Name & Signature", prefill: null },
              ].map(sig => (
                <div key={sig.role}>
                  {sig.prefill && <div style={{ fontSize: '0.82rem', color: '#93c5fd', fontWeight: 600, marginBottom: 4 }}>{sig.prefill}</div>}
                  <div style={{ borderBottom: '1px solid rgba(148,163,184,0.3)', height: sig.prefill ? 20 : 40, marginBottom: 8 }} />
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{sig.role}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, padding: '10px 14px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 8 }}>
              <div style={{ fontSize: '0.72rem', color: '#475569' }}>Document ID: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>{stvDoc.batchId}</span></div>
              <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2 }}>Generated: {new Date().toLocaleString()} · PharmacyHub.et v2.0 · @PharmacyHubEthiopia</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'history') {
    return (
      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setView('form')} className="btn-secondary"><ArrowLeft size={16} /> Back</button>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#f1f5f9', alignSelf: 'center' }}>STV History</h2>
        </div>
        <STVHistory onPrint={handlePrintSTV} />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Outbound — Stock Transfer Voucher</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.875rem' }}>Dispatch stock · Prices in Ethiopian Birr (ETB)</p>
          </div>
          <button onClick={() => setView('history')} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
            <Package size={15} /> View History
          </button>
        </div>
      </motion.div>

      <motion.form onSubmit={handleSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 20, padding: 32 }}>

        {/* Batch Search + Selection */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid rgba(59,130,246,0.2)' }}>
            Search & Select Batch
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text" value={batchSearch} onChange={e => setBatchSearch(e.target.value)}
              placeholder="Search by product name, batch no, category, GRN..."
              className="glass-input"
              style={{ width: '100%', padding: '9px 14px 9px 36px', borderRadius: 10, fontSize: '0.85rem' }}
            />
            {batchSearch && (
              <button type="button" onClick={() => setBatchSearch('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1rem' }}>×</button>
            )}
          </div>

          {/* Batch list / select */}
          {batchSearch && filteredBatches.length > 0 ? (
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, overflow: 'hidden', marginBottom: 12, maxHeight: 240, overflowY: 'auto' }}>
              {filteredBatches.map(b => (
                <button type="button" key={b.id}
                  onClick={() => { setSelectedBatchId(b.id); setBatchSearch(''); setQuantity(''); }}
                  style={{
                    width: '100%', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: selectedBatchId === b.id ? 'rgba(37,99,235,0.18)' : 'transparent',
                    border: 'none', borderBottom: '1px solid rgba(148,163,184,0.06)',
                    cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (selectedBatchId !== b.id) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.08)'; }}
                  onMouseLeave={e => { if (selectedBatchId !== b.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>{b.product?.description}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                      Batch: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#94a3b8' }}>{b.batchNo}</span>
                      {' '}· {b.category?.name}
                      {' '}· GRN: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#60a5fa' }}>{b.grnNumber}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#86efac', fontFamily: 'JetBrains Mono, monospace' }}>
                      {fmtBirr(b.sellingPrice)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Stock: {b.qtyOnHand} {b.product?.uom}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : batchSearch && filteredBatches.length === 0 ? (
            <div style={{ padding: '12px 14px', color: '#475569', fontSize: '0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: 10, marginBottom: 12 }}>
              No batches found for "{batchSearch}"
            </div>
          ) : null}

          {/* Dropdown fallback */}
          <label className="form-label">Select Batch (or use search above)</label>
          <select value={selectedBatchId} onChange={e => { setSelectedBatchId(e.target.value); setQuantity(''); }}
            className="glass-input"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: '0.85rem', borderColor: errors.batch ? 'rgba(239,68,68,0.5)' : undefined }}>
            <option value="">-- Select a product batch --</option>
            {availableBatches.map(b => (
              <option key={b.id} value={b.id}>
                {b.product?.description} | Batch: {b.batchNo} | Stock: {b.qtyOnHand} {b.product?.uom} | Sell: {b.sellingPrice.toLocaleString('en-ET', { minimumFractionDigits: 2 })} ETB
              </option>
            ))}
          </select>
          {errors.batch && <div style={{ color: '#fca5a5', fontSize: '0.72rem', marginTop: 3 }}>{errors.batch}</div>}
        </div>

        {/* Selected Batch Info */}
        {selectedBatch && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
            {[
              { label: 'Product', value: selectedBatch.product?.description },
              { label: 'Category', value: selectedBatch.category?.name },
              { label: 'Batch No', value: selectedBatch.batchNo },
              { label: 'Available Stock', value: `${selectedBatch.qtyOnHand} ${selectedBatch.product?.uom}` },
              { label: 'Expiry', value: new Date(selectedBatch.expiryDate).toLocaleDateString() },
              { label: 'Selling Price', value: fmtBirr(selectedBatch.sellingPrice) },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                <div style={{ fontSize: '0.82rem', color: '#f1f5f9', fontWeight: 600, marginTop: 2 }}>{item.value}</div>
              </div>
            ))}
          </motion.div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid rgba(59,130,246,0.2)' }}>Dispatch Details</div>
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Dispatch Quantity</label>
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
                min={1} max={selectedBatch?.qtyOnHand || undefined}
                placeholder={selectedBatch ? `Max: ${selectedBatch.qtyOnHand}` : 'Select a batch first'}
                disabled={!selectedBatch}
                className="glass-input"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: '0.88rem', borderColor: errors.quantity ? 'rgba(239,68,68,0.5)' : undefined }} />
              {errors.quantity && <div style={{ color: '#fca5a5', fontSize: '0.72rem', marginTop: 3 }}>{errors.quantity}</div>}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Destination</label>
              <input type="text" value={destination} onChange={e => setDestination(e.target.value)}
                placeholder="Patient name, Ward, Branch..."
                className="glass-input"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: '0.88rem', borderColor: errors.destination ? 'rgba(239,68,68,0.5)' : undefined }} />
              {errors.destination && <div style={{ color: '#fca5a5', fontSize: '0.72rem', marginTop: 3 }}>{errors.destination}</div>}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid rgba(59,130,246,0.2)' }}>Transaction Preview</div>
            {selectedBatch && quantity && parseInt(quantity) > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Transfer Value</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#93c5fd', fontFamily: 'JetBrains Mono, monospace' }}>
                    {fmtBirr(selectedBatch.sellingPrice * parseInt(quantity || '0'))}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Remaining after dispatch:</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: (selectedBatch.qtyOnHand - parseInt(quantity)) <= (selectedBatch.product?.reorderLevel || 0) ? '#fca5a5' : '#f1f5f9' }}>
                    {selectedBatch.qtyOnHand - parseInt(quantity || '0')} {selectedBatch.product?.uom}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#475569', fontSize: '0.85rem', padding: '20px 0' }}>Select a batch and enter quantity to preview</div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => { setSelectedBatchId(''); setQuantity(''); setDestination(''); setBatchSearch(''); }} className="btn-secondary">Reset</button>
          <button type="submit" className="btn-primary" style={{ padding: '11px 28px' }}>
            <ArrowUpCircle size={17} /> Finalize STV
          </button>
        </div>
      </motion.form>
    </div>
  );
}

function STVHistory({ onPrint }: { onPrint: (doc: STVDoc) => void }) {
  const db = getDB();
  const stvs = [...db.stvs].sort((a, b) => b.date.localeCompare(a.date));

  const handlePrint = (stv: typeof db.stvs[0]) => {
    const batch = db.batches.find(b => b.id === stv.batchId);
    const product = db.products.find(p => p.id === stv.productId);
    const category = db.categories.find(c => c.id === product?.categoryId);
    const manufacturer = db.manufacturers.find(m => m.id === product?.manufacturerId);
    const remaining = batch?.qtyOnHand || 0;
    const reorderLevel = product?.reorderLevel || 0;
    const doc: STVDoc = {
      stvNumber: stv.stvNumber, date: stv.date, issuedBy: stv.issuedBy,
      destination: stv.destination, product: product?.description || '',
      category: category?.name || '', manufacturer: manufacturer?.name || '',
      batchNo: batch?.batchNo || '', batchId: stv.batchId,
      quantity: stv.quantity, sellingPrice: stv.sellingPrice,
      totalValue: stv.totalValue, uom: product?.uom || '',
      remainingQty: remaining, reorderLevel, isLowStock: remaining <= reorderLevel,
    };
    onPrint(doc);
  };

  return (
    <div style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>STV Number</th><th>Product</th><th>Destination</th>
              <th>Qty</th><th>Sell Price (ETB)</th><th>Total Value (ETB)</th>
              <th>Date</th><th>Issued By</th><th>Print</th>
            </tr>
          </thead>
          <tbody>
            {stvs.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: '#475569' }}>No STVs recorded yet</td></tr>
            ) : stvs.map(stv => {
              const product = db.products.find(p => p.id === stv.productId);
              return (
                <tr key={stv.id}>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#f59e0b', fontWeight: 600 }}>{stv.stvNumber}</td>
                  <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{product?.description || 'Unknown'}</td>
                  <td style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{stv.destination}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{stv.quantity}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#86efac', whiteSpace: 'nowrap' }}>
                    {stv.sellingPrice.toLocaleString('en-ET', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#f59e0b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {stv.totalValue.toLocaleString('en-ET', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: '#64748b' }}>{new Date(stv.date).toLocaleString()}</td>
                  <td><span className="badge badge-info">{stv.issuedBy}</span></td>
                  <td>
                    <button onClick={() => handlePrint(stv)}
                      style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Printer size={12} /> Print
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


