import React, { useState, useEffect } from 'react';
import { CATEGORY_HIERARCHY } from '../config';
import { saveMonthData, getSavingsAccounts, saveSavingsAccount, deleteSavingsAccount, getMonthIncome, saveMonthIncome } from '../utils/storage';

function aggregateByCategory(transactions, offsets) {
  const totals = {};

  // init all categories
  CATEGORY_HIERARCHY.forEach(parent => {
    totals[parent.id] = {
      ...parent,
      total: 0,
      subcategories: parent.subcategories.map(sub => ({
        ...sub,
        total: 0,
        transactions: [],
      }))
    };
  });

  // add transactions
  transactions.forEach(t => {
    if (t.type === 'credit') return; // skip income for spending
    if (t.category === 'Transfer' || t.category === 'Income') return;

    CATEGORY_HIERARCHY.forEach(parent => {
      parent.subcategories.forEach((sub, subIdx) => {
        if (sub.label === t.category) {
          totals[parent.id].subcategories[subIdx].transactions.push(t);
          totals[parent.id].subcategories[subIdx].total += t.amount;
          totals[parent.id].total += t.amount;
        }
      });
    });
  });

  // apply offsets
  offsets.forEach(offset => {
    CATEGORY_HIERARCHY.forEach(parent => {
      parent.subcategories.forEach((sub, subIdx) => {
        if (sub.label === offset.offset_category) {
          totals[parent.id].subcategories[subIdx].transactions.push({
            ...offset,
            isOffset: true,
          });
          totals[parent.id].subcategories[subIdx].total += offset.amount; // negative
          totals[parent.id].total += offset.amount;
        }
      });
    });
  });

  return Object.values(totals);
}

function CategoryRow({ category, maxAmount }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedSub, setExpandedSub] = useState(null);
  const pct = maxAmount > 0 ? (category.total / maxAmount) * 100 : 0;

  if (category.total === 0) return null;

  return (
    <div style={{ marginBottom: 4 }}>
      {/* Parent row */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
          background: expanded ? '#161616' : 'transparent',
          transition: 'all 0.15s',
        }}
      >
        <span style={{ fontSize: 13, color: '#888', width: 16 }}>
          {expanded ? '▼' : '▶'}
        </span>
        <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>
          {category.label}
        </span>
        <div style={{ width: 120, height: 3, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#c8f04a', borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: 14, fontFamily: 'monospace', color: '#f0ede8', width: 80, textAlign: 'right' }}>
          ${category.total.toFixed(2)}
        </span>
      </div>

      {/* Subcategories */}
      {expanded && (
        <div style={{ marginLeft: 28, marginBottom: 4 }}>
          {category.subcategories.filter(s => s.total !== 0).map(sub => (
            <div key={sub.id}>
              <div
                onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                  background: expandedSub === sub.id ? '#111' : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 11, color: '#555', width: 16 }}>
                  {sub.transactions.length > 0 ? (expandedSub === sub.id ? '▼' : '▶') : ''}
                </span>
                <span style={{ fontSize: 13, color: '#888', flex: 1 }}>{sub.label}</span>
                <span style={{ fontSize: 13, fontFamily: 'monospace', color: sub.total < 0 ? '#c8f04a' : '#666' }}>
                  ${sub.total.toFixed(2)}
                </span>
              </div>

              {/* Individual transactions */}
              {expandedSub === sub.id && (
                <div style={{ marginLeft: 32, marginBottom: 8 }}>
                  {sub.transactions.map((t, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 16px', fontSize: 12,
                      borderLeft: '0.5px solid #222', marginLeft: 4,
                    }}>
                      <div>
                        <span style={{ color: '#555', fontFamily: 'monospace', marginRight: 10 }}>
                          {t.date}
                        </span>
                        <span style={{ color: t.isOffset ? '#8ab84a' : '#888' }}>
                          {t.description}
                          {t.isOffset && ' (offset)'}
                        </span>
                      </div>
                      <span style={{ fontFamily: 'monospace', color: t.isOffset ? '#c8f04a' : '#666' }}>
                        {t.isOffset ? '-' : ''}${Math.abs(t.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '6px 16px', fontSize: 12, borderTop: '0.5px solid #222',
                    marginTop: 4, marginLeft: 4,
                  }}>
                    <span style={{ color: '#555' }}>Total</span>
                    <span style={{ fontFamily: 'monospace', color: '#f0ede8' }}>
                      ${sub.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, type = 'neutral' }) {
  const colors = { positive: '#c8f04a', negative: '#ff6b6b', neutral: '#f0ede8' };
  return (
    <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, fontFamily: 'monospace', letterSpacing: '-1px', color: colors[type] }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SavingsSection({ month, onTotalChange }) {
  const [accounts, setAccounts] = useState([]);
  const [amounts, setAmounts] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const saved = getSavingsAccounts();
    setAccounts(saved);
    const savedAmounts = JSON.parse(localStorage.getItem(`savings_amounts_${month}`) || '{}');
    setAmounts(savedAmounts);
  }, [month]);

  const handleAddAccount = () => {
    if (!newName.trim()) return;
    const account = { id: Date.now().toString(), name: newName.trim() };
    const updated = saveSavingsAccount(account);
    setAccounts(updated);
    setNewName('');
    setShowAdd(false);
  };

  const handleAmountChange = (id, value) => {
    const updated = { ...amounts, [id]: value };
    setAmounts(updated);
    localStorage.setItem(`savings_amounts_${month}`, JSON.stringify(updated));
  };

  const handleDelete = (id) => {
    const updated = deleteSavingsAccount(id);
    setAccounts(updated);
  };

  const total = accounts.reduce((sum, a) => sum + (parseFloat(amounts[a.id]) || 0), 0);

  useEffect(() => {
    if (onTotalChange) onTotalChange(total); // ← report total upward
  }, [total]);

  return (
    <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 16, padding: 24, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#888' }}>Savings</div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{ fontSize: 12, background: 'transparent', border: '0.5px solid #2a2a2a', color: '#666', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          + Add account
        </button>
      </div>

      {showAdd && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddAccount()}
            placeholder="e.g. HY Savings (AMEX)"
            style={{
              flex: 1, background: '#0a0a0a', border: '0.5px solid #2a2a2a',
              color: '#f0ede8', padding: '8px 12px', borderRadius: 8,
              fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
            }}
          />
          <button
            onClick={handleAddAccount}
            style={{ background: '#c8f04a', color: '#0a0a0a', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Add
          </button>
        </div>
      )}

      {accounts.length === 0 && !showAdd && (
        <div style={{ fontSize: 13, color: '#444', textAlign: 'center', padding: '20px 0' }}>
          No savings accounts yet
        </div>
      )}

      {accounts.map(account => (
        <div key={account.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{ flex: 1, fontSize: 13, color: '#888' }}>{account.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 13, color: '#555' }}>$</span>
            <input
              type="number"
              value={amounts[account.id] || ''}
              onChange={e => handleAmountChange(account.id, e.target.value)}
              placeholder="0.00"
              style={{
                width: 100, background: '#0a0a0a', border: '0.5px solid #2a2a2a',
                color: '#f0ede8', padding: '6px 10px', borderRadius: 6,
                fontSize: 13, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <span
            onClick={() => handleDelete(account.id)}
            style={{ color: '#333', cursor: 'pointer', fontSize: 16, padding: '0 4px', transition: 'color 0.15s' }}
            onMouseEnter={e => e.target.style.color = '#ff6b6b'}
            onMouseLeave={e => e.target.style.color = '#333'}
          >×</span>
        </div>
      ))}

      {accounts.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '0.5px solid #1e1e1e', paddingTop: 12, marginTop: 8 }}>
          <span style={{ fontSize: 13, color: '#888' }}>Total savings</span>
          <span style={{ fontSize: 14, fontFamily: 'monospace', color: '#c8f04a' }}>${total.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

function IncomeSection({ month, autoIncome, onTotalChange }) {
    const [income, setIncome] = useState(() => getMonthIncome(month));
    const [showAdd, setShowAdd] = useState(false);
    const [newLabel, setNewLabel] = useState('');
  
    useEffect(() => {
      // pre-populate direct deposit from auto-detected
      if (autoIncome > 0 && income.directDeposit === 0) {
        const updated = { ...income, directDeposit: autoIncome };
        setIncome(updated);
        saveMonthIncome(month, updated);
      }
    }, [autoIncome]);
  
    const handleDirectDepositChange = (val) => {
      const updated = { ...income, directDeposit: parseFloat(val) || 0 };
      setIncome(updated);
      saveMonthIncome(month, updated);
    };
  
    const handleOtherChange = (id, val) => {
      const updated = {
        ...income,
        other: income.other.map(o => o.id === id ? { ...o, amount: parseFloat(val) || 0 } : o)
      };
      setIncome(updated);
      saveMonthIncome(month, updated);
    };
  
    const handleAddOther = () => {
      if (!newLabel.trim()) return;
      const updated = {
        ...income,
        other: [...income.other, { id: Date.now().toString(), label: newLabel.trim(), amount: 0 }]
      };
      setIncome(updated);
      saveMonthIncome(month, updated);
      setNewLabel('');
      setShowAdd(false);
    };
  
    const handleDeleteOther = (id) => {
      const updated = { ...income, other: income.other.filter(o => o.id !== id) };
      setIncome(updated);
      saveMonthIncome(month, updated);
    };
  
    const total = income.directDeposit + income.other.reduce((s, o) => s + o.amount, 0);
  
    useEffect(() => {
      onTotalChange(total);
    }, [total]);
  
    return (
      <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#888' }}>Income</div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            style={{ fontSize: 12, background: 'transparent', border: '0.5px solid #2a2a2a', color: '#666', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            + Add income
          </button>
        </div>
  
        {/* Direct deposit row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{ flex: 1, fontSize: 13, color: '#888' }}>
            Direct deposit
            {autoIncome > 0 && (
              <span style={{ fontSize: 10, color: '#8ab84a', marginLeft: 8, background: '#1a1f10', padding: '2px 6px', borderRadius: 4 }}>
                auto-detected
              </span>
            )}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 13, color: '#555' }}>$</span>
            <input
              type="number"
              value={income.directDeposit || ''}
              onChange={e => handleDirectDepositChange(e.target.value)}
              placeholder="0.00"
              style={{
                width: 110, background: '#0a0a0a', border: '0.5px solid #2a2a2a',
                color: '#f0ede8', padding: '6px 10px', borderRadius: 6,
                fontSize: 13, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
  
        {/* Other income lines */}
        {income.other.map(o => (
          <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ flex: 1, fontSize: 13, color: '#888' }}>{o.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 13, color: '#555' }}>$</span>
              <input
                type="number"
                value={o.amount || ''}
                onChange={e => handleOtherChange(o.id, e.target.value)}
                placeholder="0.00"
                style={{
                  width: 110, background: '#0a0a0a', border: '0.5px solid #2a2a2a',
                  color: '#f0ede8', padding: '6px 10px', borderRadius: 6,
                  fontSize: 13, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <span
              onClick={() => handleDeleteOther(o.id)}
              style={{ color: '#333', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
              onMouseEnter={e => e.target.style.color = '#ff6b6b'}
              onMouseLeave={e => e.target.style.color = '#333'}
            >×</span>
          </div>
        ))}
  
        {/* Add income form */}
        {showAdd && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              autoFocus
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddOther()}
              placeholder="e.g. Freelance, Bonus..."
              style={{
                flex: 1, background: '#0a0a0a', border: '0.5px solid #2a2a2a',
                color: '#f0ede8', padding: '8px 12px', borderRadius: 8,
                fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
              }}
            />
            <button
              onClick={handleAddOther}
              style={{ background: '#c8f04a', color: '#0a0a0a', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Add
            </button>
          </div>
        )}
  
        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '0.5px solid #1e1e1e', paddingTop: 12, marginTop: 8 }}>
          <span style={{ fontSize: 13, color: '#888' }}>Total income</span>
          <span style={{ fontSize: 14, fontFamily: 'monospace', color: '#c8f04a' }}>${total.toFixed(2)}</span>
        </div>
      </div>
    );
  }

  export default function Step3Dashboard({ finalTransactions, offsets, month, onBack }) {
    const [totalIncome, setTotalIncome] = useState(0);
    const [totalSaved, setTotalSaved] = useState(0);
    
    const categories = aggregateByCategory(finalTransactions, offsets || []);
    const maxAmount = Math.max(...categories.map(c => c.total), 1);
    const totalExpenses = categories.reduce((sum, c) => sum + Math.max(c.total, 0), 0);
    const cashFlow = totalIncome - totalExpenses - totalSaved;
    const savingsRate = totalIncome > 0 ? ((totalSaved / totalIncome) * 100).toFixed(1) : '—';
  
    // auto-detect direct deposits from transactions
    const autoIncome = finalTransactions
      .filter(t => t.type === 'credit' && t.category === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);
  
    // auto-detect other income (Venmo/Zelle confirmed as income in review)
    const autoOtherIncome = finalTransactions
      .filter(t => t.type === 'credit' && t.category !== 'Income' && t.category !== 'Transfer')
      .reduce((sum, t) => sum + t.amount, 0);
  
    const netIncome = totalIncome - totalExpenses;
    const monthLabel = new Date(month + '-15').toLocaleString('default', { month: 'long', year: 'numeric' });
  
    useEffect(() => {
      saveMonthData(month, { transactions: finalTransactions, offsets, totalExpenses, totalIncome });
    }, [month, finalTransactions, totalIncome]);
  
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0ede8', fontFamily: "'DM Sans', sans-serif", display: 'grid', gridTemplateColumns: '200px 1fr' }}>
        {/* Sidebar */}
        <div style={{ background: '#111', borderRight: '0.5px solid #1a1a1a', padding: '28px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
            <div style={{ width: 8, height: 8, background: '#c8f04a', borderRadius: '50%' }} />
            <span style={{ fontFamily: 'monospace', fontSize: 15 }}>myfinance</span>
          </div>
          {[['Spending', true], ['Savings', false], ['Overview', false]].map(([label, active]) => (
            <div key={label} style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 13,
              color: active ? '#f0ede8' : '#555',
              background: active ? '#1e1e1e' : 'transparent',
              marginBottom: 4, cursor: 'pointer',
            }}>
              {label}
            </div>
          ))}
          <div style={{ marginTop: 32, paddingTop: 32, borderTop: '0.5px solid #1a1a1a' }}>
            <div onClick={onBack} style={{ fontSize: 12, color: '#444', cursor: 'pointer', padding: '8px 12px' }}>
              ← Back to review
            </div>
          </div>
        </div>
  
        {/* Main content */}
        <div style={{ padding: 32, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.5px', marginBottom: 4 }}>{monthLabel}</h1>
              <div style={{ fontSize: 12, color: '#555' }}>{finalTransactions.length} transactions</div>
            </div>
            <button style={{
              background: '#c8f04a', color: '#0a0a0a', border: 'none',
              padding: '10px 20px', borderRadius: 8, fontSize: 13,
              fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Sync to Sheets
            </button>
          </div>
  
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 32 }}>
            <StatCard 
              label="Net income" 
              value={`$${totalIncome.toFixed(2)}`} 
              type="neutral" 
            />
            <StatCard 
              label="Expenses" 
              value={`$${totalExpenses.toFixed(2)}`} 
              type="negative" 
            />
            <StatCard 
              label="Saved" 
              value={`$${totalSaved.toFixed(2)}`} 
              type="positive" 
            />
            <StatCard 
              label="Savings rate" 
              value={`${savingsRate}%`} 
              sub={totalSaved > 0 ? `${savingsRate}% of income` : 'add savings below'} 
              type="positive" 
            />
            <StatCard 
              label="Cash flow" 
              value={`$${cashFlow.toFixed(2)}`}
              sub="unaccounted"
              type={cashFlow >= 0 ? 'positive' : 'negative'} 
            />
          </div>
  
          {/* Income section */}
          <IncomeSection
            month={month}
            autoIncome={autoIncome}
            onTotalChange={setTotalIncome}
          />
  
          {/* Spending breakdown */}
          <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 16, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 20 }}>Spending breakdown</div>
            {categories.filter(c => c.total > 0).length === 0 && (
              <div style={{ fontSize: 13, color: '#444', textAlign: 'center', padding: '20px 0' }}>
                No spending data yet
              </div>
            )}
            {categories.map(cat => (
              <CategoryRow key={cat.id} category={cat} maxAmount={maxAmount} />
            ))}
          </div>
  
          {/* Savings */}
          <SavingsSection 
            month={month} 
            onTotalChange={setTotalSaved}
          />
        </div>
      </div>
    );
  }