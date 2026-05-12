import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { usePlaidLink } from 'react-plaid-link';
import { ACCOUNT_TYPES } from '../config';
import { getAccounts, saveAccount, deleteAccount, updateAccount, getSavingsAccounts } from '../utils/storage';
import { authFetch, API_URL } from '../utils/auth';

const MONTHS = [];
const now = new Date();
for (let i = 0; i < 24; i++) {
  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
  const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
  MONTHS.push({ value, label });
}

function AccountTile({ account, files, onFileDrop, onFileRemove, onDelete, onConnect, onReconnect, onSwitchToPlaid, onSwitchToManual, unmappedAccounts, onReuseAccount }) {
  const [dragging, setDragging] = useState(false);
  const inputId = `file-${account.id}`;
  const dataSource = account.dataSource || 'manual';
  const isPlaidConnected = dataSource === 'plaid' && account.plaidAccountId;
  const isPlaidError = dataSource === 'plaid-error';
  const isPlaidMode = dataSource === 'plaid' || isPlaidError;

  const borderColor = isPlaidError
    ? '#ff6b6b33'
    : (isPlaidConnected || files.length > 0) ? '#c8f04a33' : '#1e1e1e';

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    Array.from(e.dataTransfer.files).forEach(f => onFileDrop(account.id, f));
  };

  const handleInput = (e) => {
    Array.from(e.target.files).forEach(f => onFileDrop(account.id, f));
  };

  return (
    <div style={{ background: '#111', border: `0.5px solid ${borderColor}`, borderRadius: 12, padding: '14px 16px' }}>

      {/* Main row: account info · action · delete */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.2px' }}>{account.name}</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{account.type}</div>
        </div>

        {/* Action button — compact, right of name */}
        {!isPlaidMode && (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById(inputId).click()}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                border: `0.5px dashed ${dragging ? '#c8f04a' : '#2a2a2a'}`,
                background: dragging ? '#1a1f10' : 'transparent',
                color: dragging ? '#c8f04a' : '#555',
                transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              + PDF
            </div>
            <input id={inputId} type="file" accept=".pdf,.csv" multiple style={{ display: 'none' }} onChange={handleInput} />
          </>
        )}

        {isPlaidMode && !isPlaidConnected && !isPlaidError && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
            <button
              onClick={() => onConnect(account.id)}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                border: '0.5px solid #3a4a2a', background: 'transparent', color: '#8ab84a',
                fontFamily: 'inherit', whiteSpace: 'nowrap', fontWeight: 500,
              }}
            >
              Connect a new bank →
            </button>
            {unmappedAccounts?.length > 0 && (
              <button
                onClick={() => onReuseAccount(account.id)}
                style={{
                  padding: '4px 0', fontSize: 11, cursor: 'pointer',
                  border: 'none', background: 'transparent', color: '#4a6a3a',
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                  textDecoration: 'underline', textUnderlineOffset: 2,
                }}
              >
                Reuse a connected bank →
              </button>
            )}
          </div>
        )}

        {isPlaidConnected && (
          <span style={{ fontSize: 12, color: '#6a9a3a', whiteSpace: 'nowrap', flexShrink: 0 }}>
            ● Connected
          </span>
        )}

        {isPlaidError && (
          <button
            onClick={() => onReconnect(account.id)}
            style={{
              padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              border: '0.5px solid #ff6b6b44', background: 'transparent', color: '#ff6b6b',
              fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Reconnect →
          </button>
        )}

        <div
          onClick={() => onDelete(account.id)}
          style={{ color: '#2e2e2e', cursor: 'pointer', fontSize: 16, padding: '0 2px', transition: 'color 0.15s', flexShrink: 0 }}
          onMouseEnter={e => e.target.style.color = '#ff6b6b'}
          onMouseLeave={e => e.target.style.color = '#2e2e2e'}
        >×</div>
      </div>

      {/* Connected account name — plain subrow, not a button */}
      {isPlaidConnected && (
        <div style={{ fontSize: 12, color: '#444', marginTop: 6 }}>
          {account.plaidAccountName}
        </div>
      )}

      {/* Error subrow */}
      {isPlaidError && (
        <div style={{ fontSize: 11, color: '#ff6b6b66', marginTop: 6 }}>
          Bank connection lost — reconnect to continue
        </div>
      )}

      {/* File chips */}
      {!isPlaidMode && files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
          {files.map((file, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#1a1f10', border: '0.5px solid #2d3d18', borderRadius: 6, padding: '5px 10px',
            }}>
              <span style={{ fontSize: 11, color: '#8ab84a', fontFamily: 'monospace' }}>
                ✓ {file.name.length > 30 ? file.name.slice(0, 30) + '...' : file.name}
              </span>
              <span
                onClick={() => onFileRemove(account.id, i)}
                style={{ fontSize: 12, color: '#444', cursor: 'pointer', marginLeft: 8, transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = '#ff6b6b'}
                onMouseLeave={e => e.target.style.color = '#444'}
              >×</span>
            </div>
          ))}
        </div>
      )}

      {/* Switch source link */}
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
        {!isPlaidMode && (
          <span
            onClick={() => onSwitchToPlaid(account.id)}
            style={{ fontSize: 11, color: '#333', cursor: 'pointer', transition: 'color 0.15s' }}
            onMouseEnter={e => e.target.style.color = '#8ab84a'}
            onMouseLeave={e => e.target.style.color = '#333'}
          >
            Use Plaid instead →
          </span>
        )}
        {isPlaidMode && (
          <span
            onClick={() => onSwitchToManual(account.id)}
            style={{ fontSize: 11, color: '#333', cursor: 'pointer', transition: 'color 0.15s' }}
            onMouseEnter={e => e.target.style.color = '#888'}
            onMouseLeave={e => e.target.style.color = '#333'}
          >
            ← Switch to manual
          </span>
        )}
      </div>
    </div>
  );
}

export default function Step1Upload({ onProcess, loading }) {
  const { getToken } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [uploads, setUploads] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', type: 'Credit Card' });

  const [linkToken, setLinkToken] = useState(null);
  const [connectingAccountId, setConnectingAccountId] = useState(null);
  const [isReconnectMode, setIsReconnectMode] = useState(false);
  const [plaidPickerAccounts, setPlaidPickerAccounts] = useState([]);
  const [receivedRedirectUri, setReceivedRedirectUri] = useState(null);
  const [storedPlaidAccounts, setStoredPlaidAccounts] = useState([]);

  useEffect(() => {
    Promise.all([
      getAccounts(getToken),
      authFetch(`${API_URL}/plaid/accounts`, getToken).then(r => r.json()).then(d => d.accounts || []).catch(() => []),
    ]).then(([accts, plaidAccts]) => {
      setAccounts(accts);
      setStoredPlaidAccounts(plaidAccts);
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth_state_id')) {
      const savedId = sessionStorage.getItem('plaid_connecting_id');
      if (savedId) {
        setConnectingAccountId(savedId);
        setReceivedRedirectUri(window.location.href);
        authFetch(`${API_URL}/plaid/link-token`, getToken, { method: 'POST' })
          .then(r => r.json())
          .then(({ link_token }) => setLinkToken(link_token))
          .catch(e => console.error('Plaid OAuth link-token error:', e));
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const onPlaidSuccess = useCallback(async (publicToken) => {
    if (isReconnectMode) {
      const updated = await updateAccount(connectingAccountId, { dataSource: 'plaid' }, getToken);
      setAccounts(updated);
      setLinkToken(null);
      setConnectingAccountId(null);
      setIsReconnectMode(false);
      return;
    }
    try {
      const res = await authFetch(`${API_URL}/plaid/exchange-token`, getToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken }),
      });
      const { accounts: plaidAccounts } = await res.json();
      if (plaidAccounts.length === 1) {
        const updated = await updateAccount(connectingAccountId, {
          dataSource: 'plaid',
          plaidAccountId: plaidAccounts[0].account_id,
          plaidAccountName: plaidAccounts[0].name,
        }, getToken);
        setAccounts(updated);
        setConnectingAccountId(null);
        setLinkToken(null);
      } else {
        setPlaidPickerAccounts(plaidAccounts);
      }
      authFetch(`${API_URL}/plaid/accounts`, getToken).then(r => r.json()).then(d => setStoredPlaidAccounts(d.accounts || [])).catch(() => {});
    } catch (e) {
      console.error('Plaid exchange error:', e);
      setConnectingAccountId(null);
      setLinkToken(null);
    }
  }, [isReconnectMode, connectingAccountId, getToken]);

  const onPlaidExit = useCallback(() => {
    setLinkToken(null);
    setConnectingAccountId(null);
    setIsReconnectMode(false);
  }, []);

  const { open: openPlaidLink, ready: plaidReady } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
    ...(receivedRedirectUri ? { receivedRedirectUri } : {}),
  });

  const openPlaidLinkRef = useRef(openPlaidLink);
  openPlaidLinkRef.current = openPlaidLink;

  useEffect(() => {
    if (linkToken && plaidReady) openPlaidLinkRef.current();
  }, [linkToken, plaidReady, openPlaidLink]);

  const handleConnect = async (accountId) => {
    try {
      sessionStorage.setItem('plaid_connecting_id', accountId);
      setConnectingAccountId(accountId);
      setIsReconnectMode(false);
      const res = await authFetch(`${API_URL}/plaid/link-token`, getToken, { method: 'POST' });
      const { link_token } = await res.json();
      setLinkToken(link_token);
    } catch (e) {
      console.error('Plaid link-token error:', e);
      setConnectingAccountId(null);
    }
  };

  const handleReconnect = async (accountId) => {
    try {
      const account = accounts.find(a => a.id === accountId);
      setConnectingAccountId(accountId);
      setIsReconnectMode(true);
      const res = await authFetch(`${API_URL}/plaid/link-token`, getToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: account.plaidAccountId }),
      });
      const { link_token } = await res.json();
      setLinkToken(link_token);
    } catch (e) {
      console.error('Plaid reconnect error:', e);
      setConnectingAccountId(null);
      setIsReconnectMode(false);
    }
  };

  const handleSelectPlaidAccount = async (plaidAccount) => {
    const updated = await updateAccount(connectingAccountId, {
      dataSource: 'plaid',
      plaidAccountId: plaidAccount.account_id,
      plaidAccountName: plaidAccount.name,
    }, getToken);
    setAccounts(updated);
    setPlaidPickerAccounts([]);
    setConnectingAccountId(null);
    setLinkToken(null);
    authFetch(`${API_URL}/plaid/accounts`, getToken).then(r => r.json()).then(d => setStoredPlaidAccounts(d.accounts || [])).catch(() => {});
  };

  const handleAddAccount = async () => {
    if (!newAccount.name.trim()) return;
    const account = {
      id: Date.now().toString(),
      name: newAccount.name.trim(),
      type: newAccount.type,
    };
    const updated = await saveAccount(account, getToken);
    setAccounts(updated);
    setNewAccount({ name: '', type: 'Credit Card' });
    setShowAddAccount(false);
  };

  const handleDeleteAccount = async (id) => {
    const updated = await deleteAccount(id, getToken);
    setAccounts(updated);
    const newUploads = { ...uploads };
    delete newUploads[id];
    setUploads(newUploads);
  };

  const handleSwitchToPlaid = async (id) => {
    setAccounts(await updateAccount(id, { dataSource: 'plaid' }, getToken));
  };

  const handleSwitchToManual = async (id) => {
    setAccounts(await updateAccount(id, { dataSource: 'manual' }, getToken));
  };

  const handleFileDrop = (accountId, file) => {
    setUploads(prev => ({
      ...prev,
      [accountId]: [...(prev[accountId] || []), file]
    }));
  };

  const handleFileRemove = (accountId, fileIndex) => {
    setUploads(prev => ({
      ...prev,
      [accountId]: prev[accountId].filter((_, i) => i !== fileIndex)
    }));
  };

  const handleProcess = async () => {
    const uploadedAccounts = accounts
      .filter(a => uploads[a.id]?.length > 0 && a.dataSource !== 'plaid')
      .flatMap(a => uploads[a.id].map(file => ({ account: a, file })));
    const plaidAccounts = accounts.filter(a => a.dataSource === 'plaid' && a.plaidAccountId);
    if (!uploadedAccounts.length && !plaidAccounts.length) return;
    const savingsAccounts = await getSavingsAccounts(getToken);
    onProcess({ month: selectedMonth, uploads: uploadedAccounts, plaidAccounts, savingsAccounts });
  };

  const mappedPlaidIds = new Set(accounts.map(a => a.plaidAccountId).filter(Boolean));
  const unmappedAccounts = storedPlaidAccounts.filter(a => !mappedPlaidIds.has(a.account_id) && a.name);

  const uploadCount = accounts.filter(a => uploads[a.id]?.length > 0 && a.dataSource !== 'plaid').length;
  const plaidConnectedCount = accounts.filter(a => a.dataSource === 'plaid' && a.plaidAccountId).length;
  const readyCount = uploadCount + plaidConnectedCount;
  const totalFiles = accounts
    .filter(a => a.dataSource !== 'plaid')
    .reduce((sum, a) => sum + (uploads[a.id]?.length || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0ede8', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: '100%', maxWidth: 600 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 48 }}>
          <div style={{ width: 8, height: 8, background: '#c8f04a', borderRadius: '50%' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 15, letterSpacing: '-0.5px' }}>myfinance</span>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.5px', marginBottom: 8 }}>
          Upload statements
        </h1>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>Select month</div>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{
              background: '#111', border: '0.5px solid #2a2a2a', color: '#f0ede8',
              padding: '10px 40px 10px 14px', borderRadius: 8, fontSize: 14,
              fontFamily: 'inherit', width: '100%', cursor: 'pointer', appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
            }}
          >
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

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
              files={uploads[account.id] || []}
              onFileDrop={handleFileDrop}
              onFileRemove={handleFileRemove}
              onDelete={handleDeleteAccount}
              onConnect={handleConnect}
              onReconnect={handleReconnect}
              onSwitchToPlaid={handleSwitchToPlaid}
              onSwitchToManual={handleSwitchToManual}
              unmappedAccounts={unmappedAccounts}
              onReuseAccount={(accountId) => { setConnectingAccountId(accountId); setPlaidPickerAccounts(unmappedAccounts); }}
            />
          ))}
        </div>

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
                width: '100%', background: '#0a0a0a', border: '0.5px solid #2a2a2a',
                color: '#f0ede8', padding: '10px 14px', borderRadius: 8, fontSize: 14,
                fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box', outline: 'none',
              }}
            />
            <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>Account type</div>
            <select
              value={newAccount.type}
              onChange={e => setNewAccount(prev => ({ ...prev, type: e.target.value }))}
              style={{
                background: '#111', border: '0.5px solid #2a2a2a', color: '#f0ede8',
                padding: '10px 40px 10px 14px', borderRadius: 8, fontSize: 14,
                fontFamily: 'inherit', width: '100%', cursor: 'pointer', appearance: 'none',
                marginBottom: 16,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
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

        <button
          onClick={handleProcess}
          disabled={readyCount === 0 || loading}
          style={{
            width: '100%',
            background: readyCount > 0 && !loading ? '#c8f04a' : '#1a1a1a',
            color: readyCount > 0 && !loading ? '#0a0a0a' : '#444',
            border: 'none', padding: '14px', borderRadius: 10,
            fontSize: 14, fontWeight: 500,
            cursor: readyCount > 0 && !loading ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', transition: 'all 0.2s',
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{
                width: 14, height: 14, border: '2px solid #333',
                borderTop: '2px solid #c8f04a', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              Fetching transactions...
            </div>
          ) : totalFiles > 0 && plaidConnectedCount > 0
            ? `Process ${totalFiles} file${totalFiles > 1 ? 's' : ''} + ${plaidConnectedCount} Plaid account${plaidConnectedCount > 1 ? 's' : ''} →`
            : totalFiles > 0
            ? `Process ${totalFiles} file${totalFiles > 1 ? 's' : ''} →`
            : plaidConnectedCount > 0
            ? `Fetch from ${plaidConnectedCount} Plaid account${plaidConnectedCount > 1 ? 's' : ''} →`
            : 'Upload at least one statement'
          }
        </button>
      </div>

      {plaidPickerAccounts.length > 0 && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 16, padding: 24, width: 360, maxWidth: '90vw' }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Select account to connect</div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 20 }}>
              Choose which bank account to link to this tile
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plaidPickerAccounts.map(pa => (
                <div
                  key={pa.account_id}
                  onClick={() => handleSelectPlaidAccount(pa)}
                  style={{
                    background: '#0d0d0d', border: '0.5px solid #2a2a2a', borderRadius: 10,
                    padding: '12px 14px', cursor: 'pointer', transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#c8f04a44'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
                >
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{pa.name}</div>
                  {pa.official_name && pa.official_name !== pa.name && (
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{pa.official_name}</div>
                  )}
                  {(pa.subtype || pa.type) && (
                    <div style={{ fontSize: 11, color: '#444', marginTop: 2, textTransform: 'capitalize' }}>
                      {[pa.subtype, pa.type].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => { setPlaidPickerAccounts([]); setConnectingAccountId(null); setLinkToken(null); }}
              style={{ width: '100%', marginTop: 16, background: 'transparent', border: '0.5px solid #2a2a2a', color: '#888', padding: '10px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}