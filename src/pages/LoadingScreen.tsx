import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#FFF1DD' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '4px solid #6B3E1D', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 12, color: '#6B3E1D' }}>Loading...</p>
      </div>
      <style>
        {`@keyframes spin { to { transform: rotate(360deg); } }`}
      </style>
    </div>
  );
};

export default LoadingScreen;
