import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@/theme/global.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Не найден элемент #root — проверьте index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
