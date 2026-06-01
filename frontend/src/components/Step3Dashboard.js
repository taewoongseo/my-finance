import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
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
    if (t.type === 'credit' && t.category !== 'Rent') return;
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

function TransactionRow({ transaction, onCategoryChange, onOffsetCategoryChange, onDelete, onDeleteOffset, activeDropdown, setActiveDropdown }) {
  const transactionId = transaction._id ?? transaction.id;
  const showDropdown = activeDropdown === transactionId;
  const effectiveCategory = transaction.isOffset
    ? (transaction.offset_category ?? transaction.category)
    : transaction.category;

  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = () => setActiveDropdown(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showDropdown]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 16px', fontSize: 12,
      borderLeft: '0.5px solid #222', marginLeft: 4,
      position: 'relative',
    }}>
      {/* Date */}
      <span style={{ color: '#555', fontFamily: 'monospace', minWidth: 80 }}>
        {transaction.date}
      </span>

      {/* Description */}
      <span style={{ color: transaction.isOffset ? '#8ab84a' : '#888', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {transaction.description}{transaction.isOffset ? ' (offset)' : ''}
        {transaction.isManual && (
          <span style={{ fontSize: 10, background: '#1a1f10', border: '0.5px solid #2d3d18', color: '#8ab84a', padding: '2px 5px', borderRadius: 3, marginLeft: 6 }}>
            manual
          </span>
        )}
      </span>

      {/* Category dropdown */}
      <div style={{ position: 'relative' }}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(showDropdown ? null : transactionId);
          }}
          style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
            background: '#1a1a1a', border: '0.5px solid #2a2a2a', color: '#888',
            display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#c8f04a'}
          onMouseLeave={e => { if (!showDropdown) e.currentTarget.style.borderColor = '#2a2a2a'; }}
        >
          {effectiveCategory} ▾
        </div>

        {showDropdown && (
          <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 4,
                background: '#111', border: '0.5px solid #2a2a2a', borderRadius: 10,
                zIndex: 9999, minWidth: 200, maxHeight: 300, overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {CATEGORY_HIERARCHY.map(parent => (
              <div key={parent.id}>
                <div style={{
                  fontSize: 10, color: '#444', padding: '8px 12px 4px',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  {parent.label}
                </div>
                {parent.subcategories.map(sub => (
                  <div
                    key={sub.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (transaction.isOffset && !transaction.isManual) {
                        onOffsetCategoryChange(transactionId, sub.label);
                      } else {
                        onCategoryChange(transactionId, sub.label);
                      }
                      setActiveDropdown(null);
                    }}
                    style={{
                      padding: '7px 12px', fontSize: 12, cursor: 'pointer',
                      color: effectiveCategory === sub.label ? '#c8f04a' : '#888',
                      background: effectiveCategory === sub.label ? '#1a1f10' : 'transparent',
                      transition: 'all 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (effectiveCategory !== sub.label)
                        e.currentTarget.style.background = '#161616';
                    }}
                    onMouseLeave={e => {
                      if (effectiveCategory !== sub.label)
                        e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {sub.label}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Amount */}
      <span style={{ fontFamily: 'monospace', color: transaction.isOffset ? '#c8f04a' : '#666', minWidth: 60, textAlign: 'right' }}>
        {transaction.isOffset ? '-' : ''}${Math.abs(transaction.amount).toFixed(2)}
      </span>

      {/* Delete */}
      <span
        onClick={() => transaction.isOffset
          ? (transaction.isManual ? onDelete(transactionId) : onDeleteOffset(transactionId))
          : onDelete(transactionId)
        }
        style={{ color: '#333', cursor: 'pointer', fontSize: 14, padding: '0 2px', transition: 'color 0.15s' }}
        onMouseEnter={e => e.target.style.color = '#ff6b6b'}
        onMouseLeave={e => e.target.style.color = '#333'}
      >
        ×
      </span>
    </div>
  );
}

function AddTransactionForm({ month, onAdd, onCancel }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(`${month}-01`);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense'); // expense | income | offset

  const isValid = date && description.trim() && parseFloat(amount) > 0 &&
    (type === 'income' || category);

  const handleAdd = () => {
    if (!isValid) return;
    const transaction = {
      _id: `manual-${Date.now()}`,
      id: `manual-${Date.now()}`,
      date,
      description: description.trim(),
      amount: parseFloat(amount),
      category: type === 'income' ? 'Income' : category,
      type: type === 'income' ? 'credit' : 'debit',
      account: 'Manual',
      isManual: true,
      isOffset: type === 'offset',
      offset_category: type === 'offset' ? category : undefined,
    };
    onAdd(transaction);
  };

  const inputStyle = {
    background: '#111', border: '0.5px solid #2a2a2a',
    color: '#f0ede8', padding: '9px 12px', borderRadius: 8,
    fontSize: 13, fontFamily: 'inherit', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  };

  const selectStyle = {
    ...inputStyle,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '12px',
    cursor: 'pointer',
  };

  const labelStyle = { fontSize: 11, color: '#555', marginBottom: 6, display: 'block' };

  return (
    <div style={{
      background: '#0d0d0d', border: '0.5px solid #2a2a2a',
      borderRadius: 12, padding: 20, marginBottom: 16,
    }}>
      {/* Row 1 — Date + Amount */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Date</label>
          <input
            style={{ ...inputStyle, fontFamily: 'monospace' }}
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Amount</label>
          <input
            style={{ ...inputStyle, fontFamily: 'monospace' }}
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>
      </div>

      {/* Row 2 — Description */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Description</label>
        <input
          style={inputStyle}
          type="text"
          placeholder="e.g. Farmer's market, Cash tip..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && isValid && handleAdd()}
        />
      </div>

      {/* Row 3 — Type + Category */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Type</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['expense', 'offset'].map(t => (
              <div
                key={t}
                onClick={() => setType(t)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 11,
                  textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                  border: type === t
                    ? t === 'expense' ? '0.5px solid #ff6b6b44' : '0.5px solid #c8f04a44'
                    : '0.5px solid #2a2a2a',
                  background: type === t
                    ? t === 'expense' ? '#1a0f0f' : '#1a1f10'
                    : 'transparent',
                  color: type === t
                    ? t === 'expense' ? '#ff8f8f' : '#c8f04a'
                    : '#555',
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </div>
            ))}
          </div>
        </div>

        {/* Category — hidden for income */}
        {type !== 'income' && (
          <div>
            <label style={labelStyle}>
              {type === 'offset' ? 'Offset category' : 'Category'}
            </label>
            <select
              style={selectStyle}
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">Select...</option>
              {CATEGORY_HIERARCHY.map(parent => (
                <optgroup key={parent.id} label={parent.label}>
                  {parent.subcategories.map(sub => (
                    <option key={sub.id} value={sub.label}>{sub.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            background: 'transparent', border: '0.5px solid #2a2a2a',
            color: '#555', padding: '8px 16px', borderRadius: 8,
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleAdd}
          disabled={!isValid}
          style={{
            background: isValid ? '#c8f04a' : '#1a1a1a',
            color: isValid ? '#0a0a0a' : '#444',
            border: 'none', padding: '8px 20px', borderRadius: 8,
            fontSize: 13, fontWeight: 500,
            cursor: isValid ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', transition: 'all 0.2s',
          }}
        >
          Add transaction →
        </button>
      </div>
    </div>
  );
}

function CategoryRow({ category, maxAmount, onCategoryChange, onOffsetCategoryChange, onDelete, onDeleteOffset }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedSub, setExpandedSub] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const pct = maxAmount > 0 ? (category.total / maxAmount) * 100 : 0;

  const hasOffsets = category.subcategories.some(s => s.transactions.some(t => t.isOffset));
  if (category.total === 0 && !hasOffsets) return null;

  return (
    <div style={{ marginBottom: 4 }}>
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

      {expanded && (
        <div style={{ marginLeft: 28, marginBottom: 4 }}>
          {category.subcategories.filter(s => s.total !== 0 || s.transactions.some(t => t.isOffset)).map(sub => (
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

              {expandedSub === sub.id && (
                <div style={{ marginLeft: 32, marginBottom: 8 }}>
                  {sub.transactions.map((t, i) => (
                    <TransactionRow
                      key={i}
                      transaction={t}
                      onCategoryChange={onCategoryChange}
                      onOffsetCategoryChange={onOffsetCategoryChange}
                      onDelete={onDelete}
                      onDeleteOffset={onDeleteOffset}
                      activeDropdown={activeDropdown}
                      setActiveDropdown={setActiveDropdown}
                    />
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
  const { getToken } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [amounts, setAmounts] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingsLoaded, setSavingsLoaded] = useState(false);

  useEffect(() => {
    setSavingsLoaded(false);
    getSavingsAccounts(getToken).then(saved => {
      setAccounts(saved);
      const savedAmounts = JSON.parse(localStorage.getItem(`savings_amounts_${month}`) || '{}');
      setAmounts(savedAmounts);
      setSavingsLoaded(true);
    });
  }, [month]);

  const handleAddAccount = async () => {
    if (!newName.trim()) return;
    const account = { id: Date.now().toString(), name: newName.trim() };
    const updated = await saveSavingsAccount(account, getToken);
    setAccounts(updated);
    setNewName('');
    setShowAdd(false);
  };

  const handleAmountChange = (id, value) => {
    const updated = { ...amounts, [id]: value };
    setAmounts(updated);
    localStorage.setItem(`savings_amounts_${month}`, JSON.stringify(updated));
  };

  const handleDelete = async (id) => {
    const updated = await deleteSavingsAccount(id, getToken);
    setAccounts(updated);
  };

  const total = accounts.reduce((sum, a) => sum + (parseFloat(amounts[a.id]) || 0), 0);

  useEffect(() => {
    if (!savingsLoaded) return;
    if (onTotalChange) onTotalChange(total);
  }, [total, savingsLoaded]);

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
    const { getToken } = useAuth();
    const [income, setIncome] = useState({ directDeposit: 0, other: [] });
    const [incomeLoaded, setIncomeLoaded] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [newLabel, setNewLabel] = useState('');

    useEffect(() => {
      setIncomeLoaded(false);
      getMonthIncome(month, getToken).then(data => {
        setIncome(data);
        setIncomeLoaded(true);
      });
    }, [month]);

    useEffect(() => {
      if (!incomeLoaded) return;
      if (autoIncome > 0 && income.directDeposit === 0) {
        const updated = { ...income, directDeposit: autoIncome };
        setIncome(updated);
        saveMonthIncome(month, updated, getToken);
      }
    }, [autoIncome, incomeLoaded]);

    const handleDirectDepositChange = (val) => {
      const updated = { ...income, directDeposit: parseFloat(val) || 0 };
      setIncome(updated);
      saveMonthIncome(month, updated, getToken);
    };

    const handleOtherChange = (id, val) => {
      const updated = {
        ...income,
        other: income.other.map(o => o.id === id ? { ...o, amount: parseFloat(val) || 0 } : o)
      };
      setIncome(updated);
      saveMonthIncome(month, updated, getToken);
    };

    const handleAddOther = () => {
      if (!newLabel.trim()) return;
      const updated = {
        ...income,
        other: [...income.other, { id: Date.now().toString(), label: newLabel.trim(), amount: 0 }]
      };
      setIncome(updated);
      saveMonthIncome(month, updated, getToken);
      setNewLabel('');
      setShowAdd(false);
    };

    const handleDeleteOther = (id) => {
      const updated = { ...income, other: income.other.filter(o => o.id !== id) };
      setIncome(updated);
      saveMonthIncome(month, updated, getToken);
    };
  
    const total = income.directDeposit + income.other.reduce((s, o) => s + o.amount, 0);
  
    useEffect(() => {
      if (!incomeLoaded) return;
      onTotalChange(total);
    }, [total, incomeLoaded]);
  
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

  export default function Step3Dashboard({ finalTransactions: initialTransactions, offsets, month, onBack, onReprocess }) {
    const { getToken } = useAuth();
    const [transactions, setTransactions] = useState(initialTransactions);
    const [totalIncome, setTotalIncome] = useState(null);
    const [totalSaved, setTotalSaved] = useState(null);
  
    const handleCategoryChange = (transactionId, newCategory) => {
      setTransactions(prev => prev.map(t =>
        t._id === transactionId || t.id === transactionId
          ? { ...t, category: newCategory, ...(t.isOffset ? { offset_category: newCategory } : {}) }
          : t
      ));
    };
  
    const handleDeleteTransaction = (transactionId) => {
      setTransactions(prev => prev.filter(t =>
        t._id !== transactionId && t.id !== transactionId
      ));
    };

    const [showAddForm, setShowAddForm] = useState(false);

    const handleAddTransaction = (transaction) => {
      if (transaction.isOffset) {
        setTransactions(prev => [...prev, {
          ...transaction,
          amount: -transaction.amount,
          category: transaction.offset_category,
          type: 'debit',
          isOffset: true,
        }]);
      } else {
        setTransactions(prev => [...prev, transaction]);
      }
      setShowAddForm(false);
    };

    const [localOffsets, setLocalOffsets] = useState(offsets || []);

    const handleDeleteOffset = (offsetId) => {
      setLocalOffsets(prev => prev.filter(o =>
        (o._id ?? o.id) !== offsetId
      ));
    };

    const handleOffsetCategoryChange = (offsetId, newCategory) => {
      setLocalOffsets(prev => prev.map(o =>
        (o._id ?? o.id) === offsetId ? { ...o, offset_category: newCategory } : o
      ));
    };
  
    const categories = aggregateByCategory(transactions, localOffsets || []);
    const maxAmount = Math.max(...categories.map(c => c.total), 1);
    const totalExpenses = categories.reduce((sum, c) => sum + Math.max(c.total, 0), 0);
    const cashFlow = (totalIncome ?? 0) - totalExpenses - (totalSaved ?? 0);
    const savingsRate = totalIncome > 0 ? (((totalSaved ?? 0) / totalIncome) * 100).toFixed(1) : '—';
  
    const autoIncome = transactions
      .filter(t => t.type === 'credit' && t.category === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);
  
    const monthLabel = new Date(month + '-15').toLocaleString('default', { month: 'long', year: 'numeric' });
  
    useEffect(() => {
      saveMonthData(month, { transactions, offsets: localOffsets, totalExpenses, totalIncome }, getToken);
    }, [month, transactions, localOffsets, totalIncome]);
  
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
              ← All months
            </div>
            {onReprocess && (
              <div onClick={onReprocess} style={{ fontSize: 12, color: '#444', cursor: 'pointer', padding: '8px 12px' }}>
                ↺ Reprocess
              </div>
            )}
          </div>
        </div> {/* ← sidebar closes here */}
  
        {/* Main content */}
        <div style={{ padding: 32, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.5px', marginBottom: 4 }}>{monthLabel}</h1>
              <div style={{ fontSize: 12, color: '#555' }}>{transactions.length} transactions</div>
            </div>
          </div>
  
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 32 }}>
            <StatCard label="Net income" value={totalIncome === null ? '—' : `$${totalIncome.toFixed(2)}`} type="neutral" />
            <StatCard label="Expenses" value={`$${totalExpenses.toFixed(2)}`} type="negative" />
            <StatCard label="Saved" value={totalSaved === null ? '—' : `$${totalSaved.toFixed(2)}`} type="positive" />
            <StatCard label="Savings rate" value={totalIncome === null ? '—' : `${savingsRate}%`} sub={totalSaved > 0 ? `${savingsRate}% of income` : 'add savings below'} type="positive" />
            <StatCard label="Cash flow" value={totalIncome === null || totalSaved === null ? '—' : `$${cashFlow.toFixed(2)}`} sub="unaccounted" type={cashFlow >= 0 ? 'positive' : 'negative'} />
          </div>
  
          {/* Income section */}
          <IncomeSection
            month={month}
            autoIncome={autoIncome}
            onTotalChange={setTotalIncome}
          />
  
          {/* Spending breakdown */}
          <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 16, padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#888' }}>Spending breakdown</div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                style={{
                  fontSize: 12, background: 'transparent',
                  border: `0.5px solid ${showAddForm ? '#c8f04a' : '#2a2a2a'}`,
                  color: showAddForm ? '#c8f04a' : '#666',
                  padding: '5px 12px', borderRadius: 6,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                + Add transaction
              </button>
            </div>

            {showAddForm && (
              <AddTransactionForm
                month={month}
                onAdd={handleAddTransaction}
                onCancel={() => setShowAddForm(false)}
              />
            )}

            {categories.filter(c => c.total > 0).length === 0 && !showAddForm && (
              <div style={{ fontSize: 13, color: '#444', textAlign: 'center', padding: '20px 0' }}>
                No spending data yet
              </div>
            )}
            {categories.map(cat => (
              <CategoryRow
                key={cat.id}
                category={cat}
                maxAmount={maxAmount}
                onCategoryChange={handleCategoryChange}
                onOffsetCategoryChange={handleOffsetCategoryChange}
                onDelete={handleDeleteTransaction}
                onDeleteOffset={handleDeleteOffset}
              />
            ))}
          </div>
  
          {/* Savings */}
          <SavingsSection month={month} onTotalChange={setTotalSaved} />
  
        </div> 
      </div> 
    );
  }