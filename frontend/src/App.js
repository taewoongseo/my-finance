import React, { useState } from 'react';
import Step1Upload from './components/Step1Upload';
import Step2Review from './components/Step2Review';
import Step3Dashboard from './components/Step3Dashboard';

export default function App() {
  const [step, setStep] = useState(1);
  const [monthData, setMonthData] = useState(null);
  const [finalTransactions, setFinalTransactions] = useState([]);
  const [allOffsets, setAllOffsets] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleProcess = async ({ month, uploads, savingsAccounts }) => {
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

    try {
      const res = await fetch('http://localhost:8000/upload', { method: 'POST', body: formData });
      const data = await res.json();
      setMonthData({ ...data, month });
      setAllOffsets(data.offsets || []); // ← store balancer auto-offsets
      setStep(2);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewDone = (cleanTransactions, newOffsets) => { // ← accept newOffsets
    setFinalTransactions(cleanTransactions);
    setAllOffsets(prev => [...prev, ...(newOffsets || [])]); // ← merge with balancer offsets
    setStep(3);
  };

  return (
    <div>
      {step === 1 && <Step1Upload onProcess={handleProcess} loading={loading} />}
      {step === 2 && <Step2Review monthData={monthData} onDone={handleReviewDone} />}
      {step === 3 && (
        <Step3Dashboard
          finalTransactions={finalTransactions}
          offsets={allOffsets}  // ← combined auto + manual offsets
          month={monthData?.month}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}