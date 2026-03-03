import { getDB, saveDB, sha256, generateId } from './db';
import type { User } from './db';

export function isAdminSetup(): boolean {
  const db = getDB();
  return db.adminSetup;
}

export function setupAdmin(password: string): boolean {
  const db = getDB();
  if (db.adminSetup) return false;
  const hash = sha256(password);
  const admin: User = {
    id: generateId(),
    username: 'admin',
    passwordHash: hash,
    role: 'Admin',
    createdAt: new Date().toISOString(),
  };
  db.users.push(admin);
  db.adminSetup = true;
  saveDB(db);
  return true;
}

export function login(username: string, password: string): User | null {
  const db = getDB();
  const hash = sha256(password);
  const user = db.users.find(
    u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === hash
  );
  return user || null;
}

export function registerUser(username: string, password: string): { success: boolean; error?: string } {
  const db = getDB();
  const existing = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (existing) return { success: false, error: 'Username already exists' };
  const user: User = {
    id: generateId(),
    username,
    passwordHash: sha256(password),
    role: 'Staff',
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  saveDB(db);
  return { success: true };
}

export function getAllUsers(): User[] {
  return getDB().users;
}

export function deleteUser(userId: string): boolean {
  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (!user || user.role === 'Admin') return false;
  db.users = db.users.filter(u => u.id !== userId);
  saveDB(db);
  return true;
}

export function changeUserRole(userId: string, role: 'Admin' | 'Staff'): boolean {
  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return false;
  user.role = role;
  saveDB(db);
  return true;
}
