import React, { useState } from 'react';

const styles = {
  app: { display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh', background: '#0a0a0a', color: '#f0ede8', fontFamily: "'DM Sans', sans-serif" },
  sidebar: { background: '#111', borderRight: '0.5px solid #222', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 4 },
  logo: { fontFamily: 'monospace', fontSize: 15, fontWeight: 500, color: '#f0ede8', marginBottom: 28, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 8 },
  logoDot: { width: 8, height: 8, background: '#c8f04a', borderRadius: '50%' },
  navSection: { fontSize: 10, letterSpacing: '0.08em', color: '#444', textTransform: 'uppercase', margin: '16px 12px 6px' },
  main: { display: 'flex', flexDirection: 'column' },
  topbar: { padding: '20px 32px', borderBottom: '0.5px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  content: { padding: 32, display: 'flex', flexDirection: 'column', gap: 24, flex: 1 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
};

const CATEGORIES = ['Rent', 'Groceries', 'Dine out', 'Drinks/snacks', 'Uber', 'Metro/Ferry', 'Utilities', 'Subscription', 'Shopping', 'Hobbies', 'Offering', 'Other'];

function NavItem({ label, active, onClick }) {
  return (
    <div onClick={onClick} style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, color: active ? '#f0ede8' : '#888', cursor: 'pointer', background: active ? '#1e1e1e' : 'transparent', transition: 'all 0.15s' }}>
      {label}
    </div>
  );
}

function StatCard({ label, value, sub, type = 'neutral' }) {
  const colors = { positive: '#c8f04a', negative: '#ff6b6b', neutral: '#f0ede8' };
  return (
    <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, fontFamily: 'monospace', letterSpacing: '-1px', color: colors[type] }}>{value}</div>
      <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function FlipCard({ transaction, onCategorize }) {
  const [selected, setSelected] = useState(transaction.suggestedCategory);
  const isIncome = transaction.amount > 0;

  const handleSelect = (cat) => {
    setSelected(cat);
    onCategorize(transaction.id, cat);
  };

  return (
    <div style={{ background: '#161616', border: '0.5px solid #242424', borderRadius: 12, padding: 20, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{transaction.description}</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 3, fontFamily: 'monospace' }}>{transaction.date} · {transaction.account}</div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 500, fontFamily: 'monospace', color: isIncome ? '#c8f04a' : '#ff8f8f' }}>
          {isIncome ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 10, background: '#1a1f10', border: '0.5px solid #2d3d18', color: '#8ab84a', padding: '3px 8px', borderRadius: 4 }}>
          AI · {transaction.confidence}% sure
        </span>
        <div style={{ flex: 1, height: 3, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${transaction.confidence}%`, background: '#c8f04a', borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>{transaction.suggestedCategory}?</span>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => (
          <span key={cat} onClick={() => handleSelect(cat)} style={{
            fontSize: 12, padding: '6px 12px', borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
            border: selected === cat ? '0.5px solid #c8f04a' : '0.5px solid #2a2a2a',
            color: selected === cat ? '#c8f04a' : '#888',
            background: selected === cat ? '#1a1f10' : '#0d0d0d',
          }}>
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
}

function UploadZone({ onUpload }) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState([]);

  const handleFiles = (newFiles) => {
    const arr = Array.from(newFiles);
    setFiles(arr);
  };

  const handleSubmit = () => {
    if (files.length) onUpload(files);
  };

  return (
    <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 16, padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 12 }}>Upload statements</div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        style={{
          border: `0.5px dashed ${dragging ? '#c8f04a' : '#2a2a2a'}`,
          borderRadius: 12, padding: '28px 20px', textAlign: 'center',
          background: dragging ? '#0f110a' : '#0d0d0d', transition: 'all 0.2s', cursor: 'pointer'
        }}
        onClick={() => document.getElementById('file-input').click()}
      >
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
          {files.length ? `${files.length} file(s) selected` : 'Drop PDFs here'}
        </div>
        <div style={{ fontSize: 12, color: '#555' }}>Chase, Bilt, Venmo supported</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
          {['Chase CC', 'Checking', 'Bilt', 'Venmo'].map(b => (
            <span key={b} style={{ fontSize: 11, background: '#161616', border: '0.5px solid #2a2a2a', color: '#666', padding: '4px 10px', borderRadius: 20 }}>{b}</span>
          ))}
        </div>
        <input id="file-input" type="file" accept=".pdf" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
      </div>
      {files.length > 0 && (
        <button onClick={handleSubmit} style={{
          marginTop: 12, width: '100%', background: '#c8f04a', color: '#0a0a0a', border: 'none',
          padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit'
        }}>
          Process {files.length} statement{files.length > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}

// Mock data for UI demo
const MOCK_TRANSACTIONS = [
  { id: 1, description: 'VENMO · @jake', date: 'Mar 18', account: 'Venmo', amount: 45, confidence: 42, suggestedCategory: 'Dine out' },
  { id: 2, description: 'AMZN MKTP US', date: 'Mar 21', account: 'Chase CC', amount: -67.43, confidence: 55, suggestedCategory: 'Shopping' },
  { id: 3, description: 'SQ *UNKNOWN MERCHANT', date: 'Mar 24', account: 'Chase CC', amount: -23.10, confidence: 38, suggestedCategory: 'Other' },
];

function App() {
  const [activeNav, setActiveNav] = useState('Overview');
  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS);
  const [status, setStatus] = useState('');

  const handleUpload = async (files) => {
    setStatus(`Processing ${files.length} file(s)...`);
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    try {
      const res = await fetch('http://localhost:8000/upload', { method: 'POST', body: formData });
      const data = await res.json();
      setStatus(`Done: ${data.received.join(', ')}`);
    } catch {
      setStatus('Error connecting to backend — is it running?');
    }
  };

  const handleCategorize = (id, category) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, confirmedCategory: category } : t));
  };

  const navItems = ['Overview', 'Spending', 'Review'];
  const accounts = ['Chase CC', 'Chase Checking', 'Bilt', 'Venmo'];
  const savings = ['AMEX HY', 'Robinhood'];

  return (
    <div style={styles.app}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      <div style={styles.sidebar}>
        <div style={styles.logo}><div style={styles.logoDot} />myfinance</div>
        {navItems.map(n => <NavItem key={n} label={n} active={activeNav === n} onClick={() => setActiveNav(n)} />)}
        <div style={styles.navSection}>accounts</div>
        {accounts.map(a => <NavItem key={a} label={a} active={false} />)}
        <div style={styles.navSection}>savings</div>
        {savings.map(s => <NavItem key={s} label={s} active={false} />)}
      </div>

      <div style={styles.main}>
        <div style={styles.topbar}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.3px' }}>March 2025</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
              {status || `${transactions.length} transactions · ${transactions.filter(t => !t.confirmedCategory).length} need review`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 11, background: '#1a1a1a', border: '0.5px solid #2a2a2a', color: '#888', padding: '4px 10px', borderRadius: 20, fontFamily: 'monospace' }}>
              march_statements/
            </span>
            <button style={{ background: '#c8f04a', color: '#0a0a0a', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              Sync to Sheets
            </button>
          </div>
        </div>

        <div style={styles.content}>
          <div style={styles.statsGrid}>
            <StatCard label="Post-tax income" value="$6,240" sub="after deductions" type="neutral" />
            <StatCard label="Total expenses" value="$3,810" sub="excl. rent $2,500" type="negative" />
            <StatCard label="Net income" value="+$2,430" sub="38.9% savings rate" type="positive" />
            <StatCard label="Venmo offsets" value="-$180" sub="4 reimbursements" type="positive" />
          </div>

          <div style={styles.twoCol}>
            <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 16 }}>Spending breakdown</div>
              {[['Rent', 100, '#333', '$2,500'], ['Food', 72, '#c8f04a', '$580'], ['Transport', 30, '#c8f04a', '$240'], ['Utilities', 25, '#c8f04a', '$200'], ['Shopping', 20, '#c8f04a', '$160'], ['Others', 15, '#555', '$130']].map(([label, pct, color, amt]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: '#888', width: 80 }}>{label}</span>
                  <div style={{ flex: 1, height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#666', width: 50, textAlign: 'right' }}>{amt}</span>
                </div>
              ))}
            </div>

            <UploadZone onUpload={handleUpload} />
          </div>

          <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#888' }}>
                Needs review · {transactions.filter(t => !t.confirmedCategory).length} transactions
              </div>
              <span style={{ fontSize: 11, color: '#555' }}>click a category to confirm</span>
            </div>
            {transactions.map(t => <FlipCard key={t.id} transaction={t} onCategorize={handleCategorize} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;