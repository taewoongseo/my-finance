import React, { useState, useMemo } from 'react';
import { ALL_SUBCATEGORIES, TRANSFER_KEYWORDS, CONFIDENCE_THRESHOLD } from '../config';

function detectTransfers(transactions) {
  const transfers = [];
  const nonTransfers = [];

  // group by amount
  const byAmount = {};
  transactions.forEach(t => {
    const key = t.amount.toFixed(2);
    if (!byAmount[key]) byAmount[key] = [];
    byAmount[key].push(t);
  });

  const flaggedIds = new Set();

  transactions.forEach(t => {
    const desc = t.description.toLowerCase();
    const isTransferKeyword = TRANSFER_KEYWORDS.some(k => desc.includes(k));
    if (!isTransferKeyword) return;

    // look for matching amount in different account
    const matches = (byAmount[t.amount.toFixed(2)] || []).filter(
      other => other.id !== t.id && other.account !== t.account
    );

    if (matches.length > 0 && !flaggedIds.has(t.id)) {
      flaggedIds.add(t.id);
      matches.forEach(m => flaggedIds.add(m.id));
      transfers.push({
        id: `transfer-${t.id}`,
        confidence: 'high',
        transactions: [t, matches[0]],
        label: `${t.account} ↔ ${matches[0].account}`,
        amount: t.amount,
      });
    }
  });

  // single-sided transfer keywords (no match found)
  transactions.forEach(t => {
    if (flaggedIds.has(t.id)) return;
    const desc = t.description.toLowerCase();
    const isTransferKeyword = TRANSFER_KEYWORDS.some(k => desc.includes(k));
    if (isTransferKeyword) {
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

  transactions.forEach(t => {
    if (!flaggedIds.has(t.id)) nonTransfers.push(t);
  });

  return { transfers, nonTransfers, flaggedIds };
}

export default function Step2Review({ monthData, onDone }) {
  const { transfers, nonTransfers } = useMemo(
    () => detectTransfers(monthData.transactions.map((t, i) => ({ ...t, id: i }))),
    [monthData.transactions]
  );

  const uncertainTransactions = nonTransfers.filter(t => t.needs_review);

  const [transferDecisions, setTransferDecisions] = useState({});
  const [confirmedCategories, setConfirmedCategories] = useState({});
  const [dismissedCards, setDismissedCards] = useState(new Set());
  const [showAutoExcluded, setShowAutoExcluded] = useState(false);

  const autoExcluded = transfers.filter(t => t.confidence === 'high');
  const needsTransferConfirm = transfers.filter(t => t.confidence === 'low');

  const remainingCards = uncertainTransactions.filter(t => !dismissedCards.has(t.id));
  const totalToReview = needsTransferConfirm.length + uncertainTransactions.length;
  const totalReviewed = Object.keys(transferDecisions).length + dismissedCards.size;

  const handleTransferDecision = (transferId, decision) => {
    setTransferDecisions(prev => ({ ...prev, [transferId]: decision }));
  };

  const handleCategoryConfirm = (transactionId, category) => {
    setConfirmedCategories(prev => ({ ...prev, [transactionId]: category }));
    setTimeout(() => {
      setDismissedCards(prev => new Set([...prev, transactionId]));
    }, 300);
  };

  const handleDone = () => {
    // merge confirmed categories back into transactions
    const finalTransactions = nonTransfers.map(t => ({
      ...t,
      category: confirmedCategories[t.id] || t.category,
    }));

    // exclude confirmed transfers
    const excludedIds = new Set();
    transfers.forEach(transfer => {
      const decision = transferDecisions[transfer.id];
      const isAutoExcluded = transfer.confidence === 'high';
      if (isAutoExcluded || decision === 'exclude') {
        transfer.transactions.forEach(t => excludedIds.add(t.id));
      }
    });

    const cleanTransactions = finalTransactions.filter(t => !excludedIds.has(t.id));
    onDone(cleanTransactions);
  };

  const allDone = totalReviewed >= totalToReview;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0ede8', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px' }}>
      <div style={{ width: '100%', maxWidth: 600 }}>

        {/* Header */}
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

        {/* Auto excluded transfers */}
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
                <div style={{ fontSize: 13, color: '#666', marginTop: 2, fontFamily: 'monospace' }}>
                  ${transfer.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Transfer confirmations needed */}
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
                    <button
                      onClick={() => handleTransferDecision(transfer.id, 'exclude')}
                      style={{ flex: 1, background: '#1a1f10', border: '0.5px solid #2d3d18', color: '#8ab84a', padding: '8px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Yes, exclude
                    </button>
                    <button
                      onClick={() => handleTransferDecision(transfer.id, 'keep')}
                      style={{ flex: 1, background: '#0d0d0d', border: '0.5px solid #2a2a2a', color: '#888', padding: '8px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      No, keep it
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Uncertain categories */}
        {uncertainTransactions.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Uncertain categories
              </div>
              <div style={{ fontSize: 12, color: '#555', fontFamily: 'monospace' }}>
                {remainingCards.length} remaining
              </div>
            </div>

            {remainingCards.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 20px', border: '0.5px solid #1e1e1e', borderRadius: 12, color: '#8ab84a', fontSize: 13 }}>
                ✓ All categorized
              </div>
            )}

            {remainingCards.map(t => (
              <FlipCard
                key={t.id}
                transaction={t}
                onConfirm={handleCategoryConfirm}
                confirmed={confirmedCategories[t.id]}
              />
            ))}
          </div>
        )}

        {/* Done button */}
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

function FlipCard({ transaction, onConfirm, confirmed }) {
  const [selected, setSelected] = useState(transaction.suggestedCategory || transaction.category);
  const isIncome = transaction.type === 'credit';

  const handleSelect = (cat) => {
    setSelected(cat);
    onConfirm(transaction.id, cat);
  };

  return (
    <div style={{
      background: '#111', border: `0.5px solid ${confirmed ? '#2d3d18' : '#1e1e1e'}`,
      borderRadius: 12, padding: 18, marginBottom: 10,
      transition: 'all 0.3s', opacity: confirmed ? 0.5 : 1,
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 10, background: '#1a1f10', border: '0.5px solid #2d3d18', color: '#8ab84a', padding: '3px 8px', borderRadius: 4 }}>
          AI · {transaction.confidence}%
        </span>
        <div style={{ flex: 1, height: 3, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${transaction.confidence}%`, background: '#c8f04a', borderRadius: 2 }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {ALL_SUBCATEGORIES.map(cat => (
          <span
            key={cat.id}
            onClick={() => handleSelect(cat.label)}
            style={{
              fontSize: 12, padding: '5px 11px', borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
              border: selected === cat.label ? '0.5px solid #c8f04a' : '0.5px solid #2a2a2a',
              color: selected === cat.label ? '#c8f04a' : '#666',
              background: selected === cat.label ? '#1a1f10' : '#0d0d0d',
            }}
          >
            {cat.label}
          </span>
        ))}
      </div>
    </div>
  );
}