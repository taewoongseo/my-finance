import React, { useState } from 'react';
import Step1Upload from './components/Step1Upload';
import Step2Review from './components/Step2Review';

export default function App() {
  const [step, setStep] = useState(1);
  const [monthData, setMonthData] = useState(null);
  const [finalTransactions, setFinalTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleProcess = async ({ month, uploads }) => {
    setLoading(true);
    const formData = new FormData();
    uploads.forEach(({ account, file }) => {
      formData.append('files', file);
      formData.append('account_names', account.name);
      formData.append('account_types', account.type);
    });
    formData.append('month', month);

    try {
      const res = await fetch('http://localhost:8000/upload', { method: 'POST', body: formData });
      const data = await res.json();
      setMonthData({ ...data, month });
      setStep(2);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewDone = (cleanTransactions) => {
    setFinalTransactions(cleanTransactions);
    setStep(3);
  };

  return (
    <div>
      {step === 1 && <Step1Upload onProcess={handleProcess} loading={loading} />}
      {step === 2 && <Step2Review monthData={monthData} onDone={handleReviewDone} />}
      {step === 3 && (
        <div style={{ color: 'white', padding: 40, background: '#0a0a0a', minHeight: '100vh' }}>
          Step 3 coming next — {finalTransactions.length} clean transactions ready
        </div>
      )}
    </div>
  );
}