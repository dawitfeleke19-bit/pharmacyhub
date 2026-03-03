import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Printer, CheckCircle, ArrowLeft, Package } from 'lucide-react';
import { getDB, saveDB, generateId, getNextGRN, getOrCreateManufacturer, getOrCreateCategory } from '../lib/db';
import type { User, GRNRecord, Batch, Product } from '../lib/db';

interface Props { user: User; }

const UOM_OPTIONS = ['Box', 'Strip', 'Tablet', 'Bottle', 'Vial', 'Ampoule', 'Sachet', 'Tube', 'Pack', 'Unit'];
const CATEGORY_SUGGESTIONS = ['Analgesic','Antibiotic','Antifungal','Antiviral','Antihypertensive','Antidiabetic','Antihistamine','Antacid','Vitamin/Supplement','Cardiovascular','Respiratory','Dermatology','Ophthalmology','Neurology','Oncology','Vaccine','Contraceptive','Other'];

interface GRNForm {
  description: string; category: string; manufacturer: string; uom: string;
  batchNo: string; expiryDate: string; purchasePrice: string; sellingPrice: string;
  quantity: string; reorderLevel: string; receivedBy: string;
}

const emptyForm: GRNForm = {
  description: '', category: '', manufacturer: '', uom: 'Box',
  batchNo: '', expiryDate: '', purchasePrice: '', sellingPrice: '',
  quantity: '', reorderLevel: '10', receivedBy: '',
};

interface GRNDoc {
  grnNumber: string; date: string; createdBy: string; receivedBy: string;
  product: string; category: string; manufacturer: string;
  batchNo: string; batchId: string; expiryDate: string;
  quantity: number; purchasePrice: number; sellingPrice: number;
  totalValue: number; uom: string;
}

// ─── Shared GRN print function — compact portrait invoice ────────────────────
function printGRNDocument(doc: GRNDoc) {
  const fmtB = (n: number) => 'ETB ' + n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateStr    = new Date(doc.date).toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr    = new Date(doc.date).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' });
  const expiryStr  = new Date(doc.expiryDate).toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' });
  const ppUnit     = fmtB(doc.purchasePrice);
  const spUnit     = fmtB(doc.sellingPrice);
  const total      = fmtB(doc.totalValue);
  const genAt      = new Date().toLocaleString('en-ET', { dateStyle: 'short', timeStyle: 'short' });

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>${doc.grnNumber}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 14mm 12mm 14mm; }
  *  { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 8.5pt; color: #1e293b; background: #fff; }

  /* ── top accent bar ── */
  .topbar { height: 4px; background: linear-gradient(90deg,#1d4ed8,#3b82f6); margin-bottom: 10px; }

  /* ── header ── */
  .hdr { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; border-bottom: 1.5px solid #1d4ed8; margin-bottom: 8px; }
  .brand { display: flex; align-items: center; gap: 8px; }
  .brand-text .name  { font-size: 13pt; font-weight: 900; color: #1d4ed8; letter-spacing: -0.03em; line-height: 1; }
  .brand-text .site  { font-size: 6.5pt; color: #64748b; margin-top: 1px; }
  .brand-text .dtype { font-size: 6pt; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 3px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 3px; display: inline-block; padding: 1px 5px; }
  .doc-ref { text-align: right; }
  .doc-ref .num  { font-size: 12pt; font-weight: 900; font-family: monospace; color: #1e293b; }
  .doc-ref .meta { font-size: 7pt; color: #475569; line-height: 1.55; margin-top: 2px; }
  .doc-ref .meta b { color: #1e293b; }

  /* ── two-col info strip ── */
  .info-strip { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 8px; overflow: hidden; }
  .info-cell  { padding: 5px 8px; }
  .info-cell:first-child { border-right: 1px solid #e2e8f0; }
  .info-lbl { font-size: 6pt; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }
  .info-val { font-size: 8pt; font-weight: 700; color: #1e293b; margin-top: 1px; }

  /* ── section heading ── */
  .sec { font-size: 6pt; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.12em; background: #eff6ff; border-left: 3px solid #2563eb; padding: 3px 7px; margin: 7px 0 4px; }

  /* ── main table ── */
  table  { width: 100%; border-collapse: collapse; }
  th     { background: #1d4ed8; color: #fff; font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; padding: 5px 6px; text-align: left; border: 1px solid #1d4ed8; }
  td     { font-size: 8pt; color: #1e293b; padding: 5px 6px; border: 1px solid #e2e8f0; vertical-align: middle; }
  tr:nth-child(even) td { background: #f8fafc; }
  td.mono { font-family: monospace; font-size: 7.5pt; }
  td.bold { font-weight: 700; }
  td.right { text-align: right; }

  /* ── financial summary ── */
  .fin-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .fin-table td { padding: 5px 8px; font-size: 8pt; border: 1px solid #e2e8f0; }
  .fin-table .lbl { color: #64748b; font-size: 7.5pt; }
  .fin-table .val { font-family: monospace; font-weight: 700; color: #1d4ed8; text-align: right; }
  .fin-table .total-row td { background: #1d4ed8; color: #fff; font-weight: 800; font-size: 9pt; }
  .fin-table .total-row .val { color: #fff; font-size: 10pt; }

  /* ── signature block ── */
  .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 14px; }
  .sig-box  { border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 8px; }
  .sig-prefill { font-size: 8pt; font-weight: 700; color: #1d4ed8; margin-bottom: 2px; }
  .sig-line-el { border-top: 1px solid #334155; margin-top: 22px; padding-top: 4px; }
  .sig-role { font-size: 6.5pt; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.07em; }
  .sig-sub  { font-size: 6pt; color: #94a3b8; margin-top: 1px; }

  /* ── notice box ── */
  .notice { border: 1px solid #bfdbfe; background: #eff6ff; border-radius: 4px; padding: 5px 8px; font-size: 7pt; color: #1e40af; margin-top: 8px; }

  /* ── footer ── */
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
  <div class="brand">
    <div class="brand-text">
      <div class="name">Pharmacy Hub</div>
      <div class="site">PharmacyHub.et &bull; @PharmacyHubEthiopia</div>
      <div class="dtype">Goods Receipt Note</div>
    </div>
  </div>
  <div class="doc-ref">
    <div class="num">${doc.grnNumber}</div>
    <div class="meta">
      Date: <b>${dateStr}</b> &nbsp; Time: <b>${timeStr}</b><br/>
      Entered By: <b>${doc.createdBy}</b><br/>
      Received By: <b>${doc.receivedBy}</b>
    </div>
  </div>
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

<!-- PRODUCT DETAILS TABLE -->
<div class="sec">Product Details</div>
<table>
  <thead>
    <tr>
      <th>Category</th>
      <th>Unit (UOM)</th>
      <th>Batch No</th>
      <th>Expiry Date</th>
      <th>Qty Received</th>
      <th>Reorder Lvl</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>${doc.category}</td>
      <td>${doc.uom}</td>
      <td class="mono">${doc.batchNo}</td>
      <td>${expiryStr}</td>
      <td class="bold right">${doc.quantity} ${doc.uom}</td>
      <td class="right">—</td>
    </tr>
  </tbody>
</table>

<!-- FINANCIAL SUMMARY -->
<div class="sec">Financial Summary — Ethiopian Birr (ETB)</div>
<table class="fin-table">
  <tbody>
    <tr>
      <td class="lbl">Purchase Price per Unit</td>
      <td class="val">${ppUnit}</td>
      <td class="lbl">Selling Price per Unit</td>
      <td class="val">${spUnit}</td>
    </tr>
    <tr>
      <td class="lbl">Quantity Received</td>
      <td class="val">${doc.quantity} ${doc.uom}</td>
      <td class="lbl">Batch ID</td>
      <td class="val" style="font-family:monospace;font-size:7pt;">${doc.batchId}</td>
    </tr>
    <tr class="total-row">
      <td colspan="3" class="lbl" style="color:#fff;font-weight:700;">TOTAL INBOUND VALUE</td>
      <td class="val">${total}</td>
    </tr>
  </tbody>
</table>

<!-- SIGNATURE BLOCK -->
<div class="sig-row">
  <div class="sig-box">
    <div class="sig-prefill">${doc.receivedBy}</div>
    <div class="sig-line-el">
      <div class="sig-role">Received By</div>
      <div class="sig-sub">Name &amp; Signature</div>
    </div>
  </div>
  <div class="sig-box">
    <div class="sig-line-el">
      <div class="sig-role">Authorized By</div>
      <div class="sig-sub">Name &amp; Signature</div>
    </div>
  </div>
</div>

<div class="notice">
  &#9432; This document is an official Goods Receipt Note generated by PharmacyHub.et. All prices are in Ethiopian Birr (ETB). Retain for audit purposes.
</div>

<!-- FOOTER -->
<div class="footer">
  <span>Doc ID: ${doc.batchId}</span>
  <span>Generated: ${genAt} &bull; PharmacyHub.et v2.0</span>
  <span>Operator: ${doc.createdBy}</span>
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
}

// ─── Also used from GRNHistory: build doc from stored GRN record ──────────────
function buildDocFromGRN(grnId: string): GRNDoc | null {
  const db = getDB();
  const grn = db.grns.find(g => g.id === grnId);
  if (!grn) return null;
  const batch   = db.batches.find(b => b.id === grn.batchId);
  const product = db.products.find(p => p.id === grn.productId);
  const cat     = db.categories.find(c => c.id === product?.categoryId);
  const mfr     = db.manufacturers.find(m => m.id === product?.manufacturerId);
  return {
    grnNumber:     grn.grnNumber,
    date:          grn.date,
    createdBy:     grn.createdBy,
    receivedBy:    grn.receivedBy || grn.createdBy,
    product:       product?.description  || 'N/A',
    category:      cat?.name             || 'N/A',
    manufacturer:  mfr?.name             || 'N/A',
    batchNo:       batch?.batchNo        || 'N/A',
    batchId:       grn.batchId,
    expiryDate:    batch?.expiryDate     || new Date().toISOString(),
    quantity:      grn.quantity,
    purchasePrice: grn.purchasePrice,
    sellingPrice:  grn.sellingPrice,
    totalValue:    grn.totalValue,
    uom:           product?.uom          || '',
  };
}

const fmtBirr = (n: number) => 'ETB ' + n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Main Inbound component ───────────────────────────────────────────────────
export default function Inbound({ user }: Props) {
  const [form, setForm] = useState<GRNForm>({ ...emptyForm, receivedBy: user.username });
  const [grnDoc, setGrnDoc] = useState<GRNDoc | null>(null);
  const [errors, setErrors] = useState<Partial<GRNForm>>({});
  const [view, setView] = useState<'form' | 'doc' | 'history'>('form');

  const validate = (): boolean => {
    const e: Partial<GRNForm> = {};
    if (!form.description.trim()) e.description = 'Required';
    if (!form.category.trim())    e.category    = 'Required';
    if (!form.manufacturer.trim()) e.manufacturer = 'Required';
    if (!form.batchNo.trim())     e.batchNo     = 'Required';
    if (!form.expiryDate)         e.expiryDate  = 'Required';
    if (!form.purchasePrice || parseFloat(form.purchasePrice) <= 0) e.purchasePrice = 'Must be > 0';
    if (!form.sellingPrice  || parseFloat(form.sellingPrice)  <= 0) e.sellingPrice  = 'Must be > 0';
    if (!form.quantity      || parseInt(form.quantity)        <= 0) e.quantity      = 'Must be > 0';
    if (!form.receivedBy.trim()) e.receivedBy = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const db = getDB();
    const grnNumber     = getNextGRN(db);
    const manufacturerId = getOrCreateManufacturer(db, form.manufacturer.trim());
    const categoryId    = getOrCreateCategory(db, form.category.trim());

    const productId = generateId();
    const product: Product = {
      id: productId,
      description:    form.description.trim(),
      categoryId,
      manufacturerId,
      uom:            form.uom,
      reorderLevel:   parseInt(form.reorderLevel) || 10,
      createdAt:      new Date().toISOString(),
    };
    db.products.push(product);

    const batchId = generateId();
    const batch: Batch = {
      id:            batchId,
      productId,
      batchNo:       form.batchNo.trim(),
      purchasePrice: parseFloat(form.purchasePrice),
      sellingPrice:  parseFloat(form.sellingPrice),
      expiryDate:    form.expiryDate,
      qtyOnHand:     parseInt(form.quantity),
      receivedDate:  new Date().toISOString(),
      grnNumber,
    };
    db.batches.push(batch);

    const grn: GRNRecord = {
      id:            generateId(),
      grnNumber,
      batchId,
      productId,
      quantity:      parseInt(form.quantity),
      purchasePrice: parseFloat(form.purchasePrice),
      sellingPrice:  parseFloat(form.sellingPrice),
      date:          new Date().toISOString(),
      createdBy:     user.username,
      receivedBy:    form.receivedBy.trim(),
      totalValue:    parseFloat(form.purchasePrice) * parseInt(form.quantity),
    };
    db.grns.push(grn);
    saveDB(db);

    const doc: GRNDoc = {
      grnNumber,
      date:          grn.date,
      createdBy:     user.username,
      receivedBy:    form.receivedBy.trim(),
      product:       form.description.trim(),
      category:      form.category.trim(),
      manufacturer:  form.manufacturer.trim(),
      batchNo:       form.batchNo.trim(),
      batchId,
      expiryDate:    form.expiryDate,
      quantity:      parseInt(form.quantity),
      purchasePrice: parseFloat(form.purchasePrice),
      sellingPrice:  parseFloat(form.sellingPrice),
      totalValue:    parseFloat(form.purchasePrice) * parseInt(form.quantity),
      uom:           form.uom,
    };

    setGrnDoc(doc);
    setView('doc');
    setForm({ ...emptyForm, receivedBy: user.username });
  };

  const field = (key: keyof GRNForm, label: string, type = 'text', props: Record<string, unknown> = {}) => (
    <div style={{ marginBottom: 16 }}>
      <label className="form-label">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="glass-input"
        style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: '0.88rem', borderColor: errors[key] ? 'rgba(239,68,68,0.5)' : undefined }}
        {...props}
      />
      {errors[key] && <div style={{ color: '#fca5a5', fontSize: '0.72rem', marginTop: 3 }}>{errors[key]}</div>}
    </div>
  );

  // ── Doc view ──────────────────────────────────────────────────────────────
  if (view === 'doc' && grnDoc) {
    return (
      <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
        {/* Action bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={() => setView('form')} className="btn-secondary">
            <ArrowLeft size={16} /> New GRN
          </button>
          <button onClick={() => setView('history')} className="btn-secondary">
            <Package size={16} /> History
          </button>
          <button onClick={() => printGRNDocument(grnDoc)} className="btn-primary">
            <Printer size={16} /> Print GRN
          </button>
        </div>

        {/* Success banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 12, padding: '12px 16px',
        }}>
          <CheckCircle size={20} color="#86efac" />
          <div>
            <div style={{ color: '#86efac', fontWeight: 700, fontSize: '0.9rem' }}>GRN Successfully Created</div>
            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Stock added to inventory. Dashboard updated.</div>
          </div>
        </div>

        {/* On-screen GRN preview card */}
        <div style={{
          background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(148,163,184,0.15)', borderRadius: 16, padding: 32,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid rgba(37,99,235,0.4)', paddingBottom: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img src="/logo.png" alt="PH" style={{ width: 52, height: 52, borderRadius: 10, border: '2px solid rgba(37,99,235,0.4)' }} />
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#93c5fd' }}>PHARMACY HUB</div>
                <div style={{ color: '#64748b', fontSize: '0.78rem' }}>PharmacyHub.et · Professional Pharmacy Management System</div>
                <div style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: 700, marginTop: 2 }}>GOODS RECEIPT NOTE</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', fontFamily: 'JetBrains Mono, monospace' }}>{grnDoc.grnNumber}</div>
              <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 4 }}>Date: {new Date(grnDoc.date).toLocaleDateString('en-ET', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div style={{ color: '#64748b', fontSize: '0.78rem' }}>Time: {new Date(grnDoc.date).toLocaleTimeString()}</div>
              <div style={{ color: '#64748b', fontSize: '0.78rem' }}>Entered By: <span style={{ color: '#93c5fd', fontWeight: 600 }}>{grnDoc.createdBy}</span></div>
              <div style={{ color: '#64748b', fontSize: '0.78rem' }}>Received By: <span style={{ color: '#86efac', fontWeight: 600 }}>{grnDoc.receivedBy}</span></div>
            </div>
          </div>

          {/* Product table */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Product Details</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(37,99,235,0.12)' }}>
                  {['Product Description','Category','Manufacturer','UOM','Batch No','Expiry Date','Qty Received'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.06em', border: '1px solid rgba(148,163,184,0.1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#f1f5f9', border: '1px solid rgba(148,163,184,0.08)' }}>{grnDoc.product}</td>
                  <td style={{ padding: '10px 12px', color: '#93c5fd', border: '1px solid rgba(148,163,184,0.08)' }}>{grnDoc.category}</td>
                  <td style={{ padding: '10px 12px', color: '#cbd5e1', border: '1px solid rgba(148,163,184,0.08)' }}>{grnDoc.manufacturer}</td>
                  <td style={{ padding: '10px 12px', color: '#cbd5e1', border: '1px solid rgba(148,163,184,0.08)' }}>{grnDoc.uom}</td>
                  <td style={{ padding: '10px 12px', color: '#cbd5e1', fontFamily: 'JetBrains Mono, monospace', border: '1px solid rgba(148,163,184,0.08)' }}>{grnDoc.batchNo}</td>
                  <td style={{ padding: '10px 12px', color: '#fde047', border: '1px solid rgba(148,163,184,0.08)' }}>{new Date(grnDoc.expiryDate).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 800, color: '#f1f5f9', fontFamily: 'JetBrains Mono, monospace', border: '1px solid rgba(148,163,184,0.08)' }}>{grnDoc.quantity} {grnDoc.uom}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial summary */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Financial Summary (Ethiopian Birr)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { label: 'Purchase Price / Unit', value: fmtBirr(grnDoc.purchasePrice) },
                { label: 'Selling Price / Unit',  value: fmtBirr(grnDoc.sellingPrice) },
                { label: 'Total Inbound Value',   value: fmtBirr(grnDoc.totalValue), highlight: true },
              ].map(item => (
                <div key={item.label} style={{ background: item.highlight ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${item.highlight ? 'rgba(37,99,235,0.25)' : 'rgba(148,163,184,0.1)'}`, borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: item.highlight ? '#93c5fd' : '#f1f5f9', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Signature block */}
          <div style={{ borderTop: '1px solid rgba(148,163,184,0.15)', paddingTop: 24 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Verification & Authorization</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {[{ role: 'Received By', prefill: grnDoc.receivedBy }, { role: 'Authorized By', prefill: null }].map(sig => (
                <div key={sig.role}>
                  {sig.prefill && <div style={{ fontSize: '0.85rem', color: '#86efac', fontWeight: 600, marginBottom: 4 }}>{sig.prefill}</div>}
                  <div style={{ borderBottom: '1px solid rgba(148,163,184,0.3)', height: sig.prefill ? 20 : 40, marginBottom: 8 }} />
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{sig.role}</div>
                  <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2 }}>Name & Signature</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, padding: '10px 14px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 8 }}>
              <div style={{ fontSize: '0.72rem', color: '#475569' }}>Document ID: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#64748b' }}>{grnDoc.batchId}</span></div>
              <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2 }}>Generated: {new Date().toLocaleString()} · PharmacyHub.et v2.0 · Operator: {grnDoc.createdBy}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── History view ──────────────────────────────────────────────────────────
  if (view === 'history') {
    return (
      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
          <button onClick={() => setView('form')} className="btn-secondary"><ArrowLeft size={16} /> Back</button>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#f1f5f9' }}>GRN History</h2>
        </div>
        <GRNHistory />
      </div>
    );
  }

  // ── Form view ─────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Inbound — Goods Receipt Note</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.875rem' }}>Register new stock · Prices in Ethiopian Birr (ETB)</p>
          </div>
          <button onClick={() => setView('history')} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
            <Package size={15} /> View History
          </button>
        </div>
      </motion.div>

      <motion.form onSubmit={handleSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 20, padding: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          {/* Left column */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid rgba(59,130,246,0.2)' }}>Product Identity</div>
            {field('description', 'Drug Name / Short Description', 'text', { placeholder: 'e.g. Paracetamol 500mg' })}

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Drug Category / Class</label>
              <input list="categories" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Analgesic" className="glass-input"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: '0.88rem', borderColor: errors.category ? 'rgba(239,68,68,0.5)' : undefined }} />
              <datalist id="categories">{CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}</datalist>
              {errors.category && <div style={{ color: '#fca5a5', fontSize: '0.72rem', marginTop: 3 }}>{errors.category}</div>}
            </div>

            {field('manufacturer', 'Manufacturer', 'text', { placeholder: 'e.g. Pfizer, Ethiopian Pharma' })}

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Unit of Measure (UOM)</label>
              <select value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))}
                className="glass-input"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: '0.88rem' }}>
                {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid rgba(59,130,246,0.2)', marginTop: 8 }}>Receiving Info</div>
            {field('receivedBy', 'Received By (Name)', 'text', { placeholder: 'Name of person receiving stock' })}
            {field('reorderLevel', 'Reorder Level (Min Stock Alert)', 'number', { placeholder: '10', min: 0 })}
          </div>

          {/* Right column */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid rgba(59,130,246,0.2)' }}>Logistics & Batch Info</div>
            {field('batchNo', 'Batch Number', 'text', { placeholder: 'e.g. BN-2024-001' })}
            {field('expiryDate', 'Expiry Date', 'date')}

            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid rgba(59,130,246,0.2)', marginTop: 8 }}>Financials (ETB)</div>
            {field('purchasePrice', 'Purchase / Buy Price (ETB)', 'number', { placeholder: '0.00', min: 0, step: '0.01' })}
            {field('sellingPrice',  'Selling Price (ETB)',        'number', { placeholder: '0.00', min: 0, step: '0.01' })}
            {field('quantity',      'Quantity Received',          'number', { placeholder: '0',    min: 1 })}

            {form.purchasePrice && form.quantity && (
              <div style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10, padding: '12px 16px', marginTop: 8 }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Inbound Value</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#93c5fd', fontFamily: 'JetBrains Mono, monospace' }}>
                  {fmtBirr(parseFloat(form.purchasePrice || '0') * parseInt(form.quantity || '0'))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => setForm({ ...emptyForm, receivedBy: user.username })} className="btn-secondary">Reset Form</button>
          <button type="submit" className="btn-primary" style={{ padding: '11px 28px' }}>
            <Plus size={17} /> Finalize GRN
          </button>
        </div>
      </motion.form>
    </div>
  );
}

// ─── GRN History table ────────────────────────────────────────────────────────
function GRNHistory() {
  const db  = getDB();
  const grns = [...db.grns].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>GRN Number</th><th>Product</th><th>Batch No</th>
              <th>Qty</th><th>Buy Price (ETB)</th><th>Total Value (ETB)</th>
              <th>Received By</th><th>Date</th><th>Entered By</th><th>Print</th>
            </tr>
          </thead>
          <tbody>
            {grns.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: '#475569' }}>No GRNs recorded yet</td></tr>
            ) : grns.map(grn => {
              const product = db.products.find(p => p.id === grn.productId);
              return (
                <tr key={grn.id}>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#60a5fa', fontWeight: 600 }}>{grn.grnNumber}</td>
                  <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{product?.description || 'Unknown'}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: '#94a3b8' }}>
                    {db.batches.find(b => b.id === grn.batchId)?.batchNo || 'N/A'}
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{grn.quantity}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {grn.purchasePrice.toLocaleString('en-ET', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#10b981', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {grn.totalValue.toLocaleString('en-ET', { minimumFractionDigits: 2 })}
                  </td>
                  <td><span className="badge badge-success">{grn.receivedBy || grn.createdBy}</span></td>
                  <td style={{ fontSize: '0.78rem', color: '#64748b' }}>{new Date(grn.date).toLocaleString()}</td>
                  <td><span className="badge badge-info">{grn.createdBy}</span></td>
                  <td>
                    <button
                      onClick={() => {
                        const doc = buildDocFromGRN(grn.id);
                        if (doc) printGRNDocument(doc);
                      }}
                      style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.25)', color: '#93c5fd', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
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
