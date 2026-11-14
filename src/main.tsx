import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { waitForUser } from './services/firebase/FirebaseAuthRepository';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Ждём восстановления сессии Firebase, чтобы getCurrentUser() был готов
// к первому рендеру ProtectedRoute.
waitForUser().finally(() => {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
});