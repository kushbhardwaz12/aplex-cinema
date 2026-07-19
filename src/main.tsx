
const style = document.createElement('style');
style.innerHTML = `
  vite-error-overlay {
    display: none !important;
  }
`;
document.head.appendChild(style);

window.addEventListener("error", (e) => {
  e.preventDefault();
  e.stopPropagation();
  return true;
}, true);

window.addEventListener("unhandledrejection", (e) => {
  e.preventDefault();
  e.stopPropagation();
});
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
