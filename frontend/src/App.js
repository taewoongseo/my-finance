import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, useAuth, AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import Step1Upload from './components/Step1Upload';
import Step2Review from './components/Step2Review';
import Step3Dashboard from './components/Step3Dashboard';
import LoginScreen from './components/LoginScreen';
import UserMenu from './components/UserMenu';
import { saveMonthData, getMonthData, getAllMonths, deleteMonthData } from './utils/storage';

const CLERK_PUBLISHABLE_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

// ── Home Screen ────────────────────────────────────────────
const formatMonthLabel = (key) => {
  const d = new Date(key + '-15');
  return {
    month: d.toLocaleString('default', { month: 'long' }),
    year: d.getFullYear(),
  };
};

function HomeScreen() {
  const navigate = useNavigate();
  const [savedMonths, setSavedMonths] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const { getToken } = useAuth();

  const loadMonths = () => {
    setLoading(true);
    setLoadError(false);
    getAllMonths(getToken).then(data => {
      if (data === null) { setLoadError(true); setLoading(false); return; }
      setSavedMonths(data);
      setLoading(false);
    });
  };

  useEffect(() => { loadMonths(); }, []);

  const handleDelete = async (key, e) => {
    e.stopPropagation();
    await deleteMonthData(key, getToken);
    getAllMonths(getToken).then(data => { if (data !== null) setSavedMonths(data); });
  };

  const monthKeys = Object.keys(savedMonths).sort().reverse();

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#f0ede8',
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 32,
    }}>
      <div style={{ width: '100%', maxWidth: 620 }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, background: '#c8f04a', borderRadius: '50%' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: '-0.3px' }}>myfinance</span>
          </div>
          {!loading && !loadError && monthKeys.length > 0 && (
            <button
              onClick={() => navigate('/upload')}
              style={{
                background: 'transparent', color: '#888',
                border: '0.5px solid #2a2a2a', padding: '8px 14px',
                borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              + New month
            </button>
          )}
        </div>

        {loading && (
          <div style={{ fontSize: 13, color: '#333', textAlign: 'center', padding: '32px 0' }}>
            Loading…
          </div>
        )}

        {!loading && loadError && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>Failed to load months</div>
            <button onClick={loadMonths} style={{ fontSize: 12, color: '#c8f04a', background: 'none', border: '0.5px solid #c8f04a', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Retry
            </button>
          </div>
        )}

        {!loading && !loadError && monthKeys.length === 0 && (
          <>
            <div style={{
              padding: '40px 28px', marginBottom: 28,
              background: '#0c0c0c', border: '0.5px dashed #1e1e1e',
              borderRadius: 16, textAlign: 'center',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, margin: '0 auto 18px',
                background: 'rgba(200,240,74,0.08)',
                border: '0.5px solid rgba(200,240,74,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3v9m0-9L5.5 6.5M9 3l3.5 3.5M3.5 13v.5a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5V13"
                    stroke="#c8f04a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.4px', margin: '0 0 8px', color: '#f0ede8' }}>
                No months yet
              </h1>
              <p style={{ fontSize: 13, color: '#777', lineHeight: 1.55, margin: '0 auto 22px', maxWidth: 320 }}>
                Process your first month to see a clean breakdown of where your money went.
              </p>
              <button
                onClick={() => navigate('/upload')}
                style={{
                  background: '#c8f04a', color: '#0a0a0a', border: 'none',
                  padding: '11px 22px', borderRadius: 12,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Process a month →
              </button>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 14,
              fontSize: 11, color: '#444', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.4,
            }}>
              <span>PDF</span>
              <span style={{ color: '#222' }}>·</span>
              <span>CSV</span>
              <span style={{ color: '#222' }}>·</span>
              <span>Auto sync</span>
            </div>
          </>
        )}

        {!loading && !loadError && monthKeys.length > 0 && (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.8px', margin: '0 0 6px' }}>
              Your months
            </h1>
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 22px' }}>
              Pick a month to view, or process a new one.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {monthKeys.map(key => {
                const { month, year } = formatMonthLabel(key);
                return (
                  <div
                    key={key}
                    onClick={() => navigate(`/month/${key}`)}
                    style={{
                      background: '#0e0e0e', border: '0.5px solid #1a1a1a',
                      borderRadius: 14, padding: 20,
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                      cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
                      gap: 16,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#2c2c2c'; e.currentTarget.style.background = '#101010'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.background = '#0e0e0e'; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.5px', color: '#f0ede8', lineHeight: 1 }}>
                        {month} <span style={{ color: '#555', fontWeight: 400 }}>{year}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                      <span style={{
                        fontSize: 11, color: '#555', fontFamily: "'JetBrains Mono', monospace",
                        padding: '4px 10px', border: '0.5px solid #222', borderRadius: 999,
                      }}>
                        Open →
                      </span>
                      <span
                        onClick={(e) => handleDelete(key, e)}
                        style={{ fontSize: 16, color: '#333', cursor: 'pointer', transition: 'color 0.15s' }}
                        onMouseEnter={e => e.target.style.color = '#ff6b6b'}
                        onMouseLeave={e => e.target.style.color = '#333'}
                      >×</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => navigate('/upload')}
              style={{
                width: '100%', background: 'transparent', color: '#666',
                border: '0.5px dashed #2a2a2a', padding: '14px',
                borderRadius: 12, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              + Process new month
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Upload Screen ──────────────────────────────────────────
function UploadScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { getToken } = useAuth();

  const handleProcess = async ({ month, uploads, plaidAccounts, savingsAccounts }) => {
    setLoading(true);
    const formData = new FormData();
    uploads.forEach(({ account, file }) => {
      formData.append('files', file);
      formData.append('account_names', account.name);
      formData.append('account_types', account.type);
    });
    formData.append('month', month);
    const savingsNames = (savingsAccounts || []).map(a => a.name);
    formData.append('savings_account_names', JSON.stringify(savingsNames));
    const plaidPayload = (plaidAccounts || []).map(a => ({
      account_id: a.plaidAccountId,
      account_name: a.name,
      account_type: a.type,
    }));
    formData.append('plaid_accounts', JSON.stringify(plaidPayload));

    try {
      const token = await getToken();
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      sessionStorage.setItem('pendingMonthData', JSON.stringify({ ...data, month }));
      navigate('/review');
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return <Step1Upload onProcess={handleProcess} loading={loading} />;
}

// ── Review Screen ──────────────────────────────────────────
function ReviewScreen() {
  const navigate = useNavigate();
  const [monthData, setMonthData] = useState(null);
  const { getToken } = useAuth();

  useEffect(() => {
    const raw = sessionStorage.getItem('pendingMonthData');
    if (!raw) { navigate('/upload'); return; }
    setMonthData(JSON.parse(raw));
  }, []);

  const handleDone = async (cleanTransactions, newOffsets) => {
    const month = monthData.month;
    const combined = [...(monthData.offsets || []), ...(newOffsets || [])];

    await saveMonthData(month, {
      transactions: cleanTransactions,
      offsets: combined,
      month,
    }, getToken);

    sessionStorage.removeItem('pendingMonthData');
    navigate(`/month/${month}`);
  };

  if (!monthData) return null;
  return <Step2Review monthData={monthData} onDone={handleDone} />;
}

// ── Dashboard Screen ───────────────────────────────────────
function DashboardScreen() {
  const { month } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const { getToken } = useAuth();

  useEffect(() => {
    getMonthData(month, getToken).then(saved => {
      if (!saved) { navigate('/'); return; }
      setData(saved);
    });
  }, [month]);

  if (!data) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 13, color: '#333', fontFamily: "'DM Sans', sans-serif" }}>Loading…</span>
    </div>
  );

  return (
    <Step3Dashboard
      finalTransactions={data.transactions || []}
      offsets={data.offsets || []}
      month={month}
      onBack={() => navigate('/')}
      onReprocess={() => navigate('/upload')}
    />
  );
}

// ── SSO Callback ───────────────────────────────────────────
function SSOCallback() {
  return <AuthenticateWithRedirectCallback />;
}

// ── App Shell ──────────────────────────────────────────────
export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignInUrl="/" afterSignUpUrl="/">
      <BrowserRouter>
        <Routes>
          <Route path="/sso-callback" element={<SSOCallback />} />
          <Route path="*" element={
            <>
              <SignedOut><LoginScreen /></SignedOut>
              <SignedIn>
                <UserMenu />
                <Routes>
                  <Route path="/" element={<HomeScreen />} />
                  <Route path="/upload" element={<UploadScreen />} />
                  <Route path="/review" element={<ReviewScreen />} />
                  <Route path="/month/:month" element={<DashboardScreen />} />
                </Routes>
              </SignedIn>
            </>
          } />
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
}