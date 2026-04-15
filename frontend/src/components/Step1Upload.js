import React, { useState, useEffect } from 'react';
import { ACCOUNT_TYPES, MONTH_OPTIONS } from '../config';
import { getAccounts, saveAccount, deleteAccount } from '../utils/storage';

const MONTHS = [];
const now = new Date();
for (let i = 0; i < 24; i++) {
  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
  const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
  MONTHS.push({ value, label });
}

export default function Step1Upload({ onProcess, loading }) {
  const [accounts, setAccounts] = useState([]);
  const [uploads, setUploads] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', type: 'Credit Card' });

  useEffect(() => {
    setAccounts(getAccounts());
  }, []);

  const handleAddAccount = () => {
    if (!newAccount.name.trim()) return;
    const account = {
      id: Date.now().toString(),
      name: newAccount.name.trim(),
      type: newAccount.type,
    };
    const updated = saveAccount(account);
    setAccounts(updated);
    setNewAccount({ name: '', type: 'Credit Card' });
    setShowAddAccount(false);
  };

  const handleDeleteAccount = (id) => {
    const updated = deleteAccount(id);
    setAccounts(updated);
    const newUploads = { ...uploads };
    delete newUploads[id];
    setUploads(newUploads);
  };

  const handleFileDrop = (accountId, file) => {
    setUploads(prev => ({ ...prev, [accountId]: file }));
  };

  const handleProcess = () => {
    const uploadedAccounts = accounts
      .filter(a => uploads[a.id])
      .map(a => ({ account: a, file: uploads[a.id] }));
    if (!uploadedAccounts.length) return;
    onProcess({ month: selectedMonth, uploads: uploadedAccounts });
  };

  const uploadCount = Object.keys(uploads).filter(id => uploads[id]).length;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0ede8', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>  
      <div style={{ width: '100%', maxWidth: 600 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 48 }}>
          <div style={{ width: 8, height: 8, background: '#c8f04a', borderRadius: '50%' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 15, letterSpacing: '-0.5px' }}>myfinance</span>
        </div>

        {/* Header */}
        <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.5px', marginBottom: 8 }}>
          Upload statements
        </h1>

        {/* Month Picker */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>Select month</div>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{
                background: '#111',
                border: '0.5px solid #2a2a2a',
                color: '#f0ede8',
                padding: '10px 40px 10px 14px',
                borderRadius: 8,
                fontSize: 14,
                fontFamily: 'inherit',
                width: '100%',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
              }}
          >
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Account tiles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {accounts.length === 0 && !showAddAccount && (
            <div style={{ textAlign: 'center', padding: '40px 20px', border: '0.5px dashed #222', borderRadius: 12, color: '#444', fontSize: 13 }}>
              No accounts yet — add your first one below
            </div>
          )}

          {accounts.map(account => (
            <AccountTile
              key={account.id}
              account={account}
              file={uploads[account.id]}
              onFileDrop={handleFileDrop}
              onDelete={handleDeleteAccount}
            />
          ))}
        </div>

        {/* Add account */}
        {showAddAccount ? (
          <div style={{ background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>Account name</div>
            <input
              autoFocus
              value={newAccount.name}
              onChange={e => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAddAccount()}
              placeholder="e.g. Chase CC, Bilt, Venmo..."
              style={{
                width: '100%',
                background: '#0a0a0a',
                border: '0.5px solid #2a2a2a',
                color: '#f0ede8',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 14,
                fontFamily: 'inherit',
                marginBottom: 10,
                boxSizing: 'border-box',  // ← this fixes the bleed
                outline: 'none',
              }}
            />
            <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>Account type</div>
            <select
              value={newAccount.type}
              onChange={e => setNewAccount(prev => ({ ...prev, type: e.target.value }))}
              style={{
                background: '#111',
                border: '0.5px solid #2a2a2a',
                color: '#f0ede8',
                padding: '10px 40px 10px 14px',
                borderRadius: 8,
                fontSize: 14,
                fontFamily: 'inherit',
                width: '100%',
                cursor: 'pointer',
                appearance: 'none',
                marginBottom: 16,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
              }}
            >
              {ACCOUNT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAddAccount} style={{ flex: 1, background: '#c8f04a', color: '#0a0a0a', border: 'none', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                Add account
              </button>
              <button onClick={() => setShowAddAccount(false)} style={{ flex: 1, background: 'transparent', color: '#888', border: '0.5px solid #2a2a2a', padding: '10px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddAccount(true)}
            style={{ width: '100%', background: 'transparent', border: '0.5px dashed #2a2a2a', color: '#555', padding: '12px', borderRadius: 10, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 24, transition: 'all 0.15s' }}
          >
            + Add account
          </button>
        )}

        {/* Process button */}
        <button
  onClick={handleProcess}
  disabled={uploadCount === 0 || loading}
  style={{
    width: '100%',
    background: uploadCount > 0 && !loading ? '#c8f04a' : '#1a1a1a',
    color: uploadCount > 0 && !loading ? '#0a0a0a' : '#444',
    border: 'none', padding: '14px', borderRadius: 10,
    fontSize: 14, fontWeight: 500,
    cursor: uploadCount > 0 && !loading ? 'pointer' : 'not-allowed',
    fontFamily: 'inherit', transition: 'all 0.2s',
  }}
>
  {loading ? (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <div style={{
        width: 14, height: 14,
        border: '2px solid #333',
        borderTop: '2px solid #c8f04a',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      Parsing statements...
    </div>
  ) : uploadCount > 0 ? `Process ${uploadCount} statement${uploadCount > 1 ? 's' : ''} →` : 'Upload at least one statement'}
</button>
      </div>
    </div>
  );
}

function AccountTile({ account, file, onFileDrop, onDelete }) {
  const [dragging, setDragging] = useState(false);
  const inputId = `file-${account.id}`;

  return (
    <div style={{ background: '#111', border: `0.5px solid ${file ? '#c8f04a33' : '#1e1e1e'}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      {/* Account info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{account.name}</div>
        <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{account.type}</div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); onFileDrop(account.id, e.dataTransfer.files[0]); }}
        onClick={() => document.getElementById(inputId).click()}
        style={{
          padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
          border: `0.5px dashed ${dragging ? '#c8f04a' : file ? '#c8f04a55' : '#2a2a2a'}`,
          background: file ? '#1a1f10' : '#0d0d0d',
          color: file ? '#c8f04a' : '#555',
          transition: 'all 0.15s', whiteSpace: 'nowrap',
        }}
      >
        {file ? `✓ ${file.name.length > 16 ? file.name.slice(0, 16) + '...' : file.name}` : 'Drop PDF or CSV'}
      </div>

      <input id={inputId} type="file" accept=".pdf,.csv" style={{ display: 'none' }} onChange={e => onFileDrop(account.id, e.target.files[0])} />

      {/* Delete */}
      <div onClick={() => onDelete(account.id)} style={{ color: '#333', cursor: 'pointer', fontSize: 16, padding: '0 4px', transition: 'color 0.15s' }}
        onMouseEnter={e => e.target.style.color = '#ff6b6b'}
        onMouseLeave={e => e.target.style.color = '#333'}
      >×</div>
    </div>
  );
}