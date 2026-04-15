import React, { useState } from 'react';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('');

  const handleUpload = async () => {
    if (!files.length) return;
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    setStatus('Uploading...');
    const res = await fetch('http://localhost:8000/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    setStatus(`Received: ${data.received.join(', ')}`);
  };

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>💰 My Finance 💰</h1>
      <input
        type="file"
        accept=".pdf"
        multiple
        onChange={e => setFiles(Array.from(e.target.files))}
      />
      <button onClick={handleUpload} style={{ marginLeft: 12 }}>
        Upload
      </button>
      {status && <p>{status}</p>}
    </div>
  );
}

export default App;