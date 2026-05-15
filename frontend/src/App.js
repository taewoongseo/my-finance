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
function HomeScreen() {
  const navigate = useNavigate();
  const [savedMonths, setSavedMonths] = useState({});
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  useEffect(() => {
    getAllMonths(getToken).then(data => { setSavedMonths(data); setLoading(false); });
  }, []);

  const formatMonth = (key) => {
    const d = new Date(key + '-15');
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const handleDelete = async (key, e) => {
    e.stopPropagation();
    await deleteMonthData(key, getToken);
    getAllMonths(getToken).then(setSavedMonths);
  };

  const monthKeys = Object.keys(savedMonths).sort().reverse();

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#f0ede8',
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 32,
    }}>
      <div style={{ width: '100%', maxWidth: 500 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 48 }}>
          <div style={{ width: 8, height: 8, background: '#c8f04a', borderRadius: '50%' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 15 }}>myfinance</span>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.5px', marginBottom: 8 }}>
          Your months
        </h1>
        <p style={{ fontSize: 13, color: '#555', marginBottom: 32 }}>
          Pick a month to view or process a new one
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {loading && (
            <div style={{ fontSize: 13, color: '#333', textAlign: 'center', padding: '32px 0' }}>
              Loading…
            </div>
          )}
          {!loading && monthKeys.length === 0 && (
            <div style={{ fontSize: 13, color: '#444', textAlign: 'center', padding: '32px 0' }}>
              No months processed yet
            </div>
          )}
          {monthKeys.map(key => (
            <div
              key={key}
              onClick={() => navigate(`/month/${key}`)}
              style={{
                background: '#111', border: '0.5px solid #1e1e1e',
                borderRadius: 12, padding: '16px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#2a2a2a'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e1e'}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{formatMonth(key)}</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 3, fontFamily: 'monospace' }}>
                  {savedMonths[key]?.transactions?.length || 0} transactions
                  · saved {new Date(savedMonths[key]?.savedAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#c8f04a' }}>View →</span>
                <span
                  onClick={(e) => handleDelete(key, e)}
                  style={{ fontSize: 16, color: '#333', cursor: 'pointer', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = '#ff6b6b'}
                  onMouseLeave={e => e.target.style.color = '#333'}
                >×</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/upload')}
          style={{
            width: '100%', background: '#c8f04a', color: '#0a0a0a',
            border: 'none', padding: '14px', borderRadius: 10,
            fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          + Process new month
        </button>
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