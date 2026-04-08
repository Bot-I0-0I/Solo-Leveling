import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './AuthContext.tsx';

// Suppress benign Vite WebSocket errors in this environment
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (reason) {
    const msg = typeof reason === 'string' ? reason : (reason.message || '');
    if (msg.includes('WebSocket')) {
      event.preventDefault();
    }
  }
});

window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('WebSocket')) {
    event.preventDefault();
  }
});

const originalError = console.error;
console.error = (...args) => {
  if (args[0]) {
    const msg = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Error ? args[0].message : '');
    if (msg.includes('[vite] failed to connect to websocket') || msg.includes('WebSocket closed without opened')) {
      return;
    }
  }
  originalError(...args);
};

const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('The width(-1) and height(-1) of chart should be greater than 0')) {
    return;
  }
  originalWarn(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
