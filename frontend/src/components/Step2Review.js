import React, { useState, useMemo } from 'react';
import { ALL_SUBCATEGORIES, TRANSFER_KEYWORDS } from '../config';

function detectTransfers(transactions) {
  const transfers = [];
  const flaggedIds = new Set();

  const byAmount = {};
  transactions.forEach(t => {
    const key = t.amount.toFixed(2);
    if (!byAmount[key]) byAmount[key] = [];
    byAmount[key].push(t);
  });

  transactions.forEach(t => {
    if (flaggedIds.has(t.id)) return;
    const desc = t.description.toLowerCase();
    const isKeyword = TRANSFER_KEYWORDS.some(k => desc.includes(k));
    if (!isKeyword) return;

    const matches = (byAmount[t.amount.toFixed(2)] || []).filter(
      other => other.id !== t.id && other.account !== t.account && !flaggedIds.has(other.id)
    );

    if (matches.length > 0) {
      flaggedIds.add(t.id);
      flaggedIds.add(matches[0].id);
      transfers.push({
        id: `transfer-${t.id}`,
        confidence: 'high',
        transactions: [t, matches[0]],
        label: `${t.account} ↔ ${matches[0].account}`,
        amount: t.amount,
      });
    } else {
      flaggedIds.add(t.id);
      transfers.push({
        id: `transfer-single-${t.id}`,
        confidence: 'low',
        transactions: [t],
        label: t.description,
        amount: t.amount,
      });
    }
  });

  const nonTransfers = transactions.filter(t => !flaggedIds.has(t.id));
  return { transfers, nonTransfers, flaggedIds };
}

function FlagCard({ transaction, onConfirm }) {
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [excluded, setExcluded] = useState(false);
  const [undoTimer, setUndoTimer] = useState(null);
  const isIncoming = transaction.type === 'credit';

  const handleConfirm = () => {
    if (!selected) return;
    setDismissing(true);
    setTimeout(() => {
      setConfirmed(true);
      onConfirm(transaction.id, selected, isIncoming);
    }, 350);
  };

  const handleExclude = () => {
    setExcluded(true);
    const timer = setTimeout(() => {
      setConfirmed(true);
      onConfirm(transaction.id, 'EXCLUDE', isIncoming);
    }, 3000);
    setUndoTimer(timer);
  };

  const handleUndo = () => {
    if (undoTimer) clearTimeout(undoTimer);
    setUndoTimer(null);
    setExcluded(false);
  };

  if (confirmed) return null;

  if (excluded) {
    return (
      <div style={{
        background: '#111', border: '0.5px solid #1e1e1e',
        borderRadius: 12, padding: 18, marginBottom: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        opacity: 0.5, transition: 'all 0.3s',
      }}>
        <div>
          <div style={{ fontSize: 13, color: '#555', textDecoration: 'line-through' }}>
            {transaction.description}
          </div>
          <div style={{ fontSize: 11, color: '#444', marginTop: 3 }}>
            Excluded from spending
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#444' }}>
            ${Math.abs(transaction.amount).toFixed(2)}
          </span>
          <span
            onClick={handleUndo}
            style={{ fontSize: 12, color: '#c8f04a', cursor: 'pointer', textDecoration: 'underline' }}
          >
            undo
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#111',
      border: '0.5px solid #2a2a1a',
      borderRadius: 12, padding: 18, marginBottom: 10,
      transition: 'all 0.35s ease',
      opacity: dismissing ? 0 : 1,
      transform: dismissing ? 'translateX(40px)' : 'translateX(0)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{transaction.description}</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 3, fontFamily: 'monospace' }}>
            {transaction.date} · {transaction.account}
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 500, fontFamily: 'monospace', color: isIncoming ? '#c8f04a' : '#ff8f8f' }}>
          {isIncoming ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
        </div>
      </div>

      <div style={{
        fontSize: 12, color: '#8ab84a', marginBottom: 14,
        padding: '7px 12px', background: '#1a1f10',
        border: '0.5px solid #2d3d18', borderRadius: 8,
      }}>
        {isIncoming ? 'What did they pay you for?' : 'What was this payment for?'}
        {transaction.flag_message?.includes('·') && (
          <span style={{ color: '#c8f04a' }}>
            {' · ' + transaction.flag_message.split('·')[1]}
          </span>
        )}
      </div>

      {/* Exclude option */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <span
          onClick={handleExclude}
          style={{ fontSize: 11, color: '#444', cursor: 'pointer', textDecoration: 'underline', transition: 'color 0.15s' }}
          onMouseEnter={e => e.target.style.color = '#ff6b6b'}
          onMouseLeave={e => e.target.style.color = '#444'}
        >
          exclude from spending
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {ALL_SUBCATEGORIES.map(cat => (
          <span
            key={cat.id}
            onClick={() => setSelected(cat.label)}
            style={{
              fontSize: 12, padding: '5px 11px', borderRadius: 6,
              cursor: 'pointer', transition: 'all 0.15s',
              border: selected === cat.label ? '0.5px solid #c8f04a' : '0.5px solid #2a2a2a',
              color: selected === cat.label ? '#c8f04a' : '#666',
              background: selected === cat.label ? '#1a1f10' : '#0d0d0d',
            }}
          >
            {cat.label}
          </span>
        ))}
        {isIncoming && (
          <span
            onClick={() => setSelected('Income')}
            style={{
              fontSize: 12, padding: '5px 11px', borderRadius: 6,
              cursor: 'pointer', transition: 'all 0.15s',
              border: selected === 'Income' ? '0.5px solid #c8f04a' : '0.5px solid #2a2a2a',
              color: selected === 'Income' ? '#c8f04a' : '#666',
              background: selected === 'Income' ? '#1a1f10' : '#0d0d0d',
            }}
          >
            Income
          </span>
        )}
      </div>

      <button
        onClick={handleConfirm}
        disabled={!selected}
        style={{
          width: '100%',
          background: selected ? '#c8f04a' : '#1a1a1a',
          color: selected ? '#0a0a0a' : '#444',
          border: 'none', padding: '9px', borderRadius: 8,
          fontSize: 13, fontWeight: 500,
          cursor: selected ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit', transition: 'all 0.2s',
        }}
      >
        {selected
          ? isIncoming
            ? selected === 'Income' ? 'Add to income' : `Offset ${selected}`
            : `Add to ${selected}`
          : 'Select a category'}
      </button>
    </div>
  );
}

function FlipCard({ transaction, onConfirm }) {
  const [selected, setSelected] = useState(
    ALL_SUBCATEGORIES.find(c => c.label === transaction.category) && transaction.category !== 'Misc. Spending'
      ? transaction.category
      : null
  );
  const [confirmed, setConfirmed] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [excluded, setExcluded] = useState(false);
  const [undoTimer, setUndoTimer] = useState(null);
  const isIncome = transaction.type === 'credit';

  const handleConfirm = () => {
    if (!selected) return;
    setDismissing(true);
    setTimeout(() => {
      setConfirmed(true);
      onConfirm(transaction.id, selected, false);
    }, 350);
  };

  const handleExclude = () => {
    setExcluded(true);
    const timer = setTimeout(() => {
      setConfirmed(true);
      onConfirm(transaction.id, 'EXCLUDE', false);
    }, 3000);
    setUndoTimer(timer);
  };

  const handleUndo = () => {
    if (undoTimer) clearTimeout(undoTimer);
    setUndoTimer(null);
    setExcluded(false);
  };

  if (confirmed) return null;

  // soft dismiss state — show excluded UI
  if (excluded) {
    return (
      <div style={{
        background: '#111', border: '0.5px solid #1e1e1e',
        borderRadius: 12, padding: 18, marginBottom: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        opacity: 0.5, transition: 'all 0.3s',
      }}>
        <div>
          <div style={{ fontSize: 13, color: '#555', textDecoration: 'line-through' }}>
            {transaction.description}
          </div>
          <div style={{ fontSize: 11, color: '#444', marginTop: 3 }}>
            Excluded from spending
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#444' }}>
            ${Math.abs(transaction.amount).toFixed(2)}
          </span>
          <span
            onClick={handleUndo}
            style={{ fontSize: 12, color: '#c8f04a', cursor: 'pointer', textDecoration: 'underline' }}
          >
            undo
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#111',
      border: `0.5px solid ${dismissing ? '#2d3d18' : '#1e1e1e'}`,
      borderRadius: 12, padding: 18, marginBottom: 10,
      transition: 'all 0.35s ease',
      opacity: dismissing ? 0 : 1,
      transform: dismissing ? 'translateX(40px)' : 'translateX(0)',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{transaction.description}</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 3, fontFamily: 'monospace' }}>
            {transaction.date} · {transaction.account}
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 500, fontFamily: 'monospace', color: isIncome ? '#c8f04a' : '#ff8f8f' }}>
          {isIncome ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 10, background: '#1a1f10', border: '0.5px solid #2d3d18', color: '#8ab84a', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>
          AI · {transaction.confidence}%
        </span>
        <div style={{ flex: 1, height: 3, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${transaction.confidence}%`, background: '#c8f04a', borderRadius: 2 }} />
        </div>
        {transaction.category && (
          <span style={{ fontSize: 10, color: '#555', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            {transaction.category}?
          </span>
        )}
      </div>

      {/* Exclude option */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <span
          onClick={handleExclude}
          style={{ fontSize: 11, color: '#444', cursor: 'pointer', textDecoration: 'underline', transition: 'color 0.15s' }}
          onMouseEnter={e => e.target.style.color = '#ff6b6b'}
          onMouseLeave={e => e.target.style.color = '#444'}
        >
          exclude from spending
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {ALL_SUBCATEGORIES.map(cat => (
          <span
            key={cat.id}
            onClick={() => setSelected(cat.label)}
            style={{
              fontSize: 12, padding: '5px 11px', borderRadius: 6,
              cursor: 'pointer', transition: 'all 0.15s',
              border: selected === cat.label ? '0.5px solid #c8f04a' : '0.5px solid #2a2a2a',
              color: selected === cat.label ? '#c8f04a' : '#666',
              background: selected === cat.label ? '#1a1f10' : '#0d0d0d',
            }}
          >
            {cat.label}
          </span>
        ))}
      </div>

      <button
        onClick={handleConfirm}
        disabled={!selected}
        style={{
          width: '100%',
          background: selected ? '#c8f04a' : '#1a1a1a',
          color: selected ? '#0a0a0a' : '#444',
          border: 'none', padding: '9px', borderRadius: 8,
          fontSize: 13, fontWeight: 500,
          cursor: selected ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit', transition: 'all 0.2s',
        }}
      >
        {selected ? `Confirm — ${selected}` : 'Select a category'}
      </button>
    </div>
  );
}

export default function Step2Review({ monthData, onDone }) {
  const allTransactions = useMemo(
    () => monthData.transactions.map((t, i) => ({ ...t, id: i })),
    [monthData.transactions]
  );

  const { transfers, nonTransfers } = useMemo(
    () => detectTransfers(allTransactions),
    [allTransactions]
  );

  const uncertainTransactions = nonTransfers.filter(t => t.needs_review);
  const autoApproved = nonTransfers.filter(t => !t.needs_review);
  const autoExcluded = transfers.filter(t => t.confidence === 'high');
  const needsTransferConfirm = transfers.filter(t => t.confidence === 'low');

  const flaggedTransactions = useMemo(
    () => (monthData.needs_review || [])
      .filter(t => t.flag_type)
      .map((t, i) => ({ ...t, id: `flag-${t._id ?? i}` })),
    [monthData.needs_review]
  );

  const [transferDecisions, setTransferDecisions] = useState({});
  const [confirmedCategories, setConfirmedCategories] = useState({});
  const [dismissedCards, setDismissedCards] = useState(new Set());
  const [showAutoExcluded, setShowAutoExcluded] = useState(false);

  const remainingUncertain = uncertainTransactions.filter(t => !dismissedCards.has(t.id));
  const remainingFlagged = flaggedTransactions.filter(t => !dismissedCards.has(t.id));

  const totalToReview = needsTransferConfirm.length + uncertainTransactions.length + flaggedTransactions.length;
  const totalReviewed = Object.keys(transferDecisions).length + dismissedCards.size;
  const allDone = totalReviewed >= totalToReview;

  console.log('total transactions:', allTransactions.length);
  console.log('needs review:', uncertainTransactions.length);
  console.log('flagged:', flaggedTransactions.length);
  console.log('auto approved:', autoApproved.length);
  console.log('transfers detected:', transfers.length);

  const handleTransferDecision = (transferId, decision) => {
    setTransferDecisions(prev => ({ ...prev, [transferId]: decision }));
  };

  const handleCategoryConfirm = (transactionId, category, isIncoming) => {
    setConfirmedCategories(prev => ({
      ...prev,
      [transactionId]: { category, isIncoming }
    }));
    setDismissedCards(prev => new Set([...prev, transactionId]));
  };

  const handleDone = () => {
    const finalTransactions = nonTransfers.map(t => ({
      ...t,
      category: confirmedCategories[t.id]?.category === 'EXCLUDE'
        ? null
        : confirmedCategories[t.id]?.category || t.category,
    })).filter(t => t.category !== null); // ← drop excluded FlipCard transactions
  
    const newOffsets = [];
    const newTransactions = [];
  
    flaggedTransactions.forEach(t => {
      const decision = confirmedCategories[t.id];
      if (!decision) return;
      const { category, isIncoming } = decision;
  
      if (category === 'EXCLUDE') return; // ← drop excluded FlagCard transactions
  
      if (isIncoming) {
        if (category === 'Income') {
          newTransactions.push({ ...t, type: 'credit', category: 'Income' });
        } else {
          newOffsets.push({
            ...t,
            isOffset: true,
            offset_category: category,
            amount: -Math.abs(t.amount),
          });
        }
      } else {
        newTransactions.push({ ...t, category, type: 'debit' });
      }
    });
  
    const excludedIds = new Set();
    transfers.forEach(transfer => {
      const isAutoExcluded = transfer.confidence === 'high';
      const decision = transferDecisions[transfer.id];
      if (isAutoExcluded || decision === 'exclude') {
        transfer.transactions.forEach(t => excludedIds.add(t.id));
      }
    });
  
    const cleanTransactions = [
      ...finalTransactions.filter(t => !excludedIds.has(t.id)),
      ...newTransactions,
    ];
  
    onDone(cleanTransactions, newOffsets);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0ede8', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px' }}>
      <div style={{ width: '100%', maxWidth: 600 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, background: '#c8f04a', borderRadius: '50%' }} />
            <span style={{ fontFamily: 'monospace', fontSize: 15 }}>myfinance</span>
          </div>
          <div style={{ fontSize: 12, color: '#555', fontFamily: 'monospace' }}>
            {totalReviewed} / {totalToReview} reviewed
          </div>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.5px', marginBottom: 4 }}>Review</h1>
        <p style={{ fontSize: 13, color: '#555', marginBottom: 32 }}>
          Confirm transfers and categorize uncertain transactions
        </p>

        {autoExcluded.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div
              onClick={() => setShowAutoExcluded(!showAutoExcluded)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 10, cursor: 'pointer', marginBottom: 8 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, background: '#1a1f10', border: '0.5px solid #2d3d18', color: '#8ab84a', padding: '3px 8px', borderRadius: 4 }}>
                  Auto-excluded
                </span>
                <span style={{ fontSize: 13, color: '#888' }}>
                  {autoExcluded.length} inter-account transfer{autoExcluded.length > 1 ? 's' : ''}
                </span>
              </div>
              <span style={{ color: '#555', fontSize: 12 }}>{showAutoExcluded ? '▲' : '▼'}</span>
            </div>
            {showAutoExcluded && autoExcluded.map(transfer => (
              <div key={transfer.id} style={{ background: '#0d0d0d', border: '0.5px solid #1a1a1a', borderRadius: 8, padding: '10px 16px', marginBottom: 6 }}>
                <div style={{ fontSize: 12, color: '#555' }}>{transfer.label}</div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 2, fontFamily: 'monospace' }}>${transfer.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}

        {needsTransferConfirm.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              Confirm transfers
            </div>
            {needsTransferConfirm.map(transfer => (
              <div key={transfer.id} style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 12, padding: 16, marginBottom: 10 }}>
                <div style={{ fontSize: 13, marginBottom: 4 }}>{transfer.label}</div>
                <div style={{ fontSize: 12, color: '#555', fontFamily: 'monospace', marginBottom: 14 }}>
                  ${transfer.amount.toFixed(2)} · {transfer.transactions[0].date}
                </div>
                {transferDecisions[transfer.id] ? (
                  <div style={{ fontSize: 12, color: '#8ab84a' }}>
                    ✓ {transferDecisions[transfer.id] === 'exclude' ? 'Excluded' : 'Kept'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleTransferDecision(transfer.id, 'exclude')}
                      style={{ flex: 1, background: '#1a1f10', border: '0.5px solid #2d3d18', color: '#8ab84a', padding: '8px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Yes, exclude
                    </button>
                    <button onClick={() => handleTransferDecision(transfer.id, 'keep')}
                      style={{ flex: 1, background: '#0d0d0d', border: '0.5px solid #2a2a2a', color: '#888', padding: '8px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                      No, keep it
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {flaggedTransactions.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Needs clarification
              </div>
              <div style={{ fontSize: 12, color: '#555', fontFamily: 'monospace' }}>
                {remainingFlagged.length} remaining
              </div>
            </div>
            {remainingFlagged.map(t => (
              <FlagCard key={t.id} transaction={t} onConfirm={handleCategoryConfirm} />
            ))}
            {remainingFlagged.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 20px', border: '0.5px solid #1e1e1e', borderRadius: 12, color: '#8ab84a', fontSize: 13 }}>
                ✓ All clarified
              </div>
            )}
          </div>
        )}

        {uncertainTransactions.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Uncertain categories
              </div>
              <div style={{ fontSize: 12, color: '#555', fontFamily: 'monospace' }}>
                {remainingUncertain.length} remaining
              </div>
            </div>
            {remainingUncertain.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 20px', border: '0.5px solid #1e1e1e', borderRadius: 12, color: '#8ab84a', fontSize: 13 }}>
                ✓ All categorized
              </div>
            )}
            {remainingUncertain.map(t => (
              <FlipCard key={t.id} transaction={t} onConfirm={handleCategoryConfirm} />
            ))}
          </div>
        )}

        <button
          onClick={handleDone}
          disabled={!allDone}
          style={{
            width: '100%',
            background: allDone ? '#c8f04a' : '#1a1a1a',
            color: allDone ? '#0a0a0a' : '#444',
            border: 'none', padding: '14px', borderRadius: 10,
            fontSize: 14, fontWeight: 500,
            cursor: allDone ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', transition: 'all 0.2s',
          }}
        >
          {allDone ? 'See results →' : `${totalToReview - totalReviewed} left to review`}
        </button>
      </div>
    </div>
  );
}