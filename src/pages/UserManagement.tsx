import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Trash2, Shield, User, AlertTriangle, CheckCircle } from 'lucide-react';
import { getAllUsers, registerUser, deleteUser, changeUserRole } from '../lib/auth';
import type { User as UserType } from '../lib/db';

interface Props { user: UserType; }

export default function UserManagement({ user }: Props) {
  const [users, setUsers] = useState(getAllUsers());
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

  if (user.role !== 'Admin') {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <AlertTriangle size={40} color="#fca5a5" style={{ marginBottom: 12 }} />
        <div style={{ color: '#fca5a5', fontSize: '1.1rem', fontWeight: 700 }}>Access Restricted</div>
        <div style={{ color: '#64748b', marginTop: 6 }}>User management is available to Admin users only.</div>
      </div>
    );
  }

  const refresh = () => setUsers(getAllUsers());

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setMsg({ type: 'error', text: 'All fields are required.' });
      return;
    }
    if (newPassword.length < 4) {
      setMsg({ type: 'error', text: 'Password must be at least 4 characters.' });
      return;
    }
    const result = registerUser(newUsername.trim(), newPassword);
    if (result.success) {
      setMsg({ type: 'success', text: `User "${newUsername}" registered as Staff.` });
      setNewUsername('');
      setNewPassword('');
      setShowForm(false);
      refresh();
    } else {
      setMsg({ type: 'error', text: result.error || 'Registration failed.' });
    }
    setTimeout(() => setMsg(null), 3000);
  };

  const handleDelete = (userId: string, username: string) => {
    if (!confirm(`Delete user "${username}"?`)) return;
    const ok = deleteUser(userId);
    if (ok) {
      setMsg({ type: 'success', text: `User "${username}" deleted.` });
      refresh();
    } else {
      setMsg({ type: 'error', text: 'Cannot delete admin users.' });
    }
    setTimeout(() => setMsg(null), 3000);
  };

  const handleRoleChange = (userId: string, role: 'Admin' | 'Staff') => {
    changeUserRole(userId, role);
    refresh();
    setMsg({ type: 'success', text: 'Role updated.' });
    setTimeout(() => setMsg(null), 2000);
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>User Management</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.875rem' }}>Manage system access and user roles</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ padding: '9px 18px' }}>
            <UserPlus size={16} /> Add Staff User
          </button>
        </div>
      </motion.div>

      {msg && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: msg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            borderRadius: 10, padding: '10px 16px', marginBottom: 16,
            color: msg.type === 'success' ? '#86efac' : '#fca5a5', fontSize: '0.85rem'
          }}>
          {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {msg.text}
        </motion.div>
      )}

      {/* Add User Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(37,99,235,0.2)', borderRadius: 16, padding: 24, marginBottom: 20
          }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9' }}>Register New Staff User</h3>
          <form onSubmit={handleRegister} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="form-label">Username</label>
              <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)}
                placeholder="Enter username" className="glass-input"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: '0.88rem' }} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="form-label">Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter password" className="glass-input"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: '0.88rem' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn-primary" style={{ padding: '9px 18px' }}>Create User</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary" style={{ padding: '9px 14px' }}>Cancel</button>
            </div>
          </form>
          <div style={{ marginTop: 10, fontSize: '0.75rem', color: '#475569' }}>
            ℹ New users are automatically assigned the <strong style={{ color: '#94a3b8' }}>Staff</strong> role. Admins can promote them after creation.
          </div>
        </motion.div>
      )}

      {/* Users Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        style={{
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(148,163,184,0.1)', borderRadius: 16, overflow: 'hidden'
        }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: u.role === 'Admin' ? 'rgba(37,99,235,0.15)' : 'rgba(100,116,139,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${u.role === 'Admin' ? 'rgba(37,99,235,0.25)' : 'rgba(100,116,139,0.2)'}`
                      }}>
                        {u.role === 'Admin' ? <Shield size={16} color="#60a5fa" /> : <User size={16} color="#94a3b8" />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.88rem' }}>{u.username}</div>
                        <div style={{ fontSize: '0.7rem', color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>{u.id.slice(0, 12)}...</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                      background: u.role === 'Admin' ? 'rgba(37,99,235,0.15)' : 'rgba(100,116,139,0.15)',
                      color: u.role === 'Admin' ? '#93c5fd' : '#94a3b8',
                      border: `1px solid ${u.role === 'Admin' ? 'rgba(37,99,235,0.25)' : 'rgba(100,116,139,0.2)'}`
                    }}>
                      {u.role === 'Admin' ? <Shield size={10} /> : <User size={10} />}
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {u.id !== user.id && (
                        <>
                          <button
                            onClick={() => handleRoleChange(u.id, u.role === 'Admin' ? 'Staff' : 'Admin')}
                            style={{
                              background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.2)',
                              color: '#93c5fd', borderRadius: 6, padding: '4px 10px',
                              cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600
                            }}>
                            {u.role === 'Admin' ? 'Make Staff' : 'Make Admin'}
                          </button>
                          {u.role !== 'Admin' && (
                            <button onClick={() => handleDelete(u.id, u.username)}
                              style={{
                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                color: '#fca5a5', borderRadius: 6, padding: '4px 10px',
                                cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4
                              }}>
                              <Trash2 size={12} /> Delete
                            </button>
                          )}
                        </>
                      )}
                      {u.id === user.id && (
                        <span style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic' }}>Current session</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Info Panel */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        style={{
          marginTop: 20, background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)',
          borderRadius: 12, padding: '14px 18px'
        }}>
        <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.6 }}>
          <strong style={{ color: '#93c5fd' }}>Role Permissions:</strong><br />
          • <strong style={{ color: '#cbd5e1' }}>Admin</strong>: Full access including Financial Reports, User Management, and price editing.<br />
          • <strong style={{ color: '#cbd5e1' }}>Staff</strong>: Can manage Inventory, create GRNs and STVs. Cannot access Financial Reports or User Management.
        </div>
      </motion.div>
    </div>
  );
}
