import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { AppProviders } from './app/providers';
import { clearLegacyToken } from './lib/api';

clearLegacyToken();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <AppProviders>
        <App />
      </AppProviders>
    </Router>
  </StrictMode>,
);
