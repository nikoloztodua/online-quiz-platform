// Online Quiz Platform — Frontend Root
// Authors: Nikoloz Todua, Iakobi Gogebashvili

import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // ბექენდის შემოწმება — call backend health endpoint
    fetch('http://localhost:3000/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '720px' }}>
      <h1>Online Quiz Platform</h1>
      <p style={{ color: '#666' }}>
        Group 1 — Nikoloz Todua, Iakobi Gogebashvili
      </p>

      <h3>Backend connection test</h3>

      {error && (
        <p style={{ color: 'red' }}>
          ❌ Backend error: {error}
        </p>
      )}

      {health && (
        <div>
          <p style={{ color: 'green' }}>✅ Backend connected</p>
          <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '6px' }}>
            {JSON.stringify(health, null, 2)}
          </pre>
        </div>
      )}

      {!health && !error && <p>Loading...</p>}
    </div>
  );
}

export default App;