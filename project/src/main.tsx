import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ConfirmProvider } from './components/feedback/ConfirmProvider.tsx';
import { ToastProvider } from './components/feedback/ToastProvider.tsx';
import './index.css';

window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (!root || root.children.length > 0) return;

  root.innerHTML = `
    <div style="font-family: system-ui, sans-serif; padding: 32px; color: #1f2937;">
      <h1 style="font-size: 24px; margin-bottom: 8px;">No se pudo cargar la tienda</h1>
      <p style="margin-bottom: 16px;">El navegador tenia datos antiguos o hubo un error al iniciar.</p>
      <pre style="white-space: pre-wrap; background: #f3f4f6; padding: 12px; border-radius: 8px;">${event.message}</pre>
      <button id="clear-app-data" style="background: #059669; color: white; border: 0; border-radius: 8px; padding: 10px 14px; cursor: pointer;">Limpiar datos locales y recargar</button>
    </div>
  `;

  document.getElementById('clear-app-data')?.addEventListener('click', () => {
    localStorage.clear();
    window.location.reload();
  });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>
);
