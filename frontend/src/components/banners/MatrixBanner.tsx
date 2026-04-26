import React, { useState } from 'react';

interface MatrixBannerProps {
  username: string;
  palette: string[];
  ratingsCount: number;
  followersCount: number;
  settings?: { opacity?: number };
}

const MatrixBanner: React.FC<MatrixBannerProps> = ({ username, settings }) => {
  const [durations] = useState(() => Array.from({ length: 20 }, () => 2 + Math.random() * 3));
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.8)',
        color: '#0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        zIndex: 0,
        overflow: 'hidden',
        opacity: settings?.opacity || 0.5,
      }}
    >
      <div>
        {durations.map((dur, i) => (
          <div key={i} style={{ animation: `matrixFall ${dur}s linear infinite` }}>
            {username.split('').map((char, j) => (
              <span key={j} style={{ display: 'block' }}>
                {char}
              </span>
            ))}
          </div>
        ))}
      </div>
      <style>
        {`
          @keyframes matrixFall {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
          }
        `}
      </style>
    </div>
  );
};

export default MatrixBanner;
