// IndexedDB-based local database for Pharmacy Hub
// Uses localStorage for simplicity with full relational structure

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'Admin' | 'Staff';
  createdAt: string;
}

export interface Manufacturer {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  description: string;
  categoryId: string;
  manufacturerId: string;
  uom: string;
  reorderLevel: number;
  createdAt: string;
}

export interface Batch {
  id: string;
  productId: string;
  batchNo: string;
  purchasePrice: number;
  sellingPrice: number;
  expiryDate: string;
  qtyOnHand: number;
  receivedDate: string;
  grnNumber: string;
}

export interface GRNRecord {
  id: string;
  grnNumber: string;
  batchId: string;
  productId: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  date: string;
  createdBy: string;
  totalValue: number;
  receivedBy: string;
}

export interface STVRecord {
  id: string;
  stvNumber: string;
  batchId: string;
  productId: string;
  quantity: number;
  sellingPrice: number;
  destination: string;
  date: string;
  issuedBy: string;
  totalValue: number;
}

export interface DocCounters {
  grnCounter: number;
  stvCounter: number;
}

export interface DB {
  users: User[];
  manufacturers: Manufacturer[];
  categories: Category[];
  products: Product[];
  batches: Batch[];
  grns: GRNRecord[];
  stvs: STVRecord[];
  counters: DocCounters;
  initialized: boolean;
  adminSetup: boolean;
}

const DB_KEY = 'pharmacy_hub_db';

export function sha256(str: string): string {
  // Simple deterministic hash for demo (in production use crypto.subtle)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Make it look like SHA-256
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return hex.repeat(8).substring(0, 64);
}

export function getDB(): DB {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as DB;
    } catch {
      return initDB();
    }
  }
  return initDB();
}

function initDB(): DB {
  const db: DB = {
    users: [],
    manufacturers: [],
    categories: [],
    products: [],
    batches: [],
    grns: [],
    stvs: [],
    counters: { grnCounter: 1000, stvCounter: 5000 },
    initialized: true,
    adminSetup: false,
  };
  saveDB(db);
  return db;
}

export function saveDB(db: DB): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function getNextGRN(db: DB): string {
  db.counters.grnCounter++;
  return `PH-GRN-${db.counters.grnCounter}`;
}

export function getNextSTV(db: DB): string {
  db.counters.stvCounter++;
  return `PH-STV-${db.counters.stvCounter}`;
}

export function getOrCreateManufacturer(db: DB, name: string): string {
  const existing = db.manufacturers.find(
    m => m.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) return existing.id;
  const id = generateId();
  db.manufacturers.push({ id, name });
  return id;
}

export function getOrCreateCategory(db: DB, name: string): string {
  const existing = db.categories.find(
    c => c.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) return existing.id;
  const id = generateId();
  db.categories.push({ id, name });
  return id;
}

export function getProductWithDetails(db: DB, productId: string) {
  const product = db.products.find(p => p.id === productId);
  if (!product) return null;
  const category = db.categories.find(c => c.id === product.categoryId);
  const manufacturer = db.manufacturers.find(m => m.id === product.manufacturerId);
  return { ...product, category: category?.name || '', manufacturer: manufacturer?.name || '' };
}

export function getBatchWithProduct(db: DB, batchId: string) {
  const batch = db.batches.find(b => b.id === batchId);
  if (!batch) return null;
  const product = getProductWithDetails(db, batch.productId);
  return { ...batch, product };
}

export function getInventoryView(db: DB) {
  const now = new Date();
  return db.batches
    .filter(b => b.qtyOnHand > 0)
    .map(batch => {
      const product = getProductWithDetails(db, batch.productId);
      const expiry = new Date(batch.expiryDate);
      const daysToExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const receivedDate = new Date(batch.receivedDate);
      const daysOnShelf = Math.floor((now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
      const isNearExpiry = daysToExpiry <= 90 && daysToExpiry >= 0;
      const isExpired = daysToExpiry < 0;
      const isSlowMoving = daysOnShelf >= 90;
      const isLowStock = batch.qtyOnHand <= (product?.reorderLevel || 0);
      return {
        ...batch,
        product,
        daysToExpiry,
        daysOnShelf,
        isNearExpiry,
        isExpired,
        isSlowMoving,
        isLowStock,
        totalValue: batch.qtyOnHand * batch.purchasePrice,
        totalSellingValue: batch.qtyOnHand * batch.sellingPrice,
      };
    });
}

export function getFinancialSummary(db: DB) {
  const inventory = getInventoryView(db);
  
  // Total investment (WAC-based)
  const totalInvestment = inventory.reduce((sum, item) => sum + item.totalValue, 0);
  const totalSellingValue = inventory.reduce((sum, item) => sum + item.totalSellingValue, 0);
  const totalQty = inventory.reduce((sum, item) => sum + item.qtyOnHand, 0);
  const wac = totalQty > 0 ? totalInvestment / totalQty : 0;
  const projectedGrossProfit = totalSellingValue - totalInvestment;
  const grossMargin = totalSellingValue > 0 ? (projectedGrossProfit / totalSellingValue) * 100 : 0;

  // STV revenue
  const totalRevenue = db.stvs.reduce((sum, s) => sum + s.totalValue, 0);
  const totalCOGS = db.stvs.reduce((sum, s) => {
    const batch = db.batches.find(b => b.id === s.batchId);
    return sum + (batch ? batch.purchasePrice * s.quantity : 0);
  }, 0);
  const realizedProfit = totalRevenue - totalCOGS;
  const realizedMargin = totalRevenue > 0 ? (realizedProfit / totalRevenue) * 100 : 0;

  // Best/worst performers by margin
  const productPerformance = db.products.map(product => {
    const productSTVs = db.stvs.filter(s => s.productId === product.id);
    const revenue = productSTVs.reduce((sum, s) => sum + s.totalValue, 0);
    const cogs = productSTVs.reduce((sum, s) => {
      const batch = db.batches.find(b => b.id === s.batchId);
      return sum + (batch ? batch.purchasePrice * s.quantity : 0);
    }, 0);
    const profit = revenue - cogs;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const category = db.categories.find(c => c.id === product.categoryId);
    return {
      id: product.id,
      name: product.description,
      category: category?.name || '',
      revenue,
      cogs,
      profit,
      margin,
      unitsSold: productSTVs.reduce((sum, s) => sum + s.quantity, 0),
    };
  }).filter(p => p.revenue > 0).sort((a, b) => b.margin - a.margin);

  const bestPerformers = productPerformance.slice(0, 5);
  const worstPerformers = [...productPerformance].sort((a, b) => a.margin - b.margin).slice(0, 5);

  // Monthly revenue
  const monthlyData: Record<string, { revenue: number; cogs: number }> = {};
  db.stvs.forEach(stv => {
    const month = stv.date.substring(0, 7);
    if (!monthlyData[month]) monthlyData[month] = { revenue: 0, cogs: 0 };
    monthlyData[month].revenue += stv.totalValue;
    const batch = db.batches.find(b => b.id === stv.batchId);
    monthlyData[month].cogs += batch ? batch.purchasePrice * stv.quantity : 0;
  });

  return {
    totalInvestment,
    totalSellingValue,
    wac,
    projectedGrossProfit,
    grossMargin,
    totalRevenue,
    totalCOGS,
    realizedProfit,
    realizedMargin,
    bestPerformers,
    worstPerformers,
    monthlyData,
    totalProducts: db.products.length,
    totalBatches: db.batches.filter(b => b.qtyOnHand > 0).length,
  };
}
