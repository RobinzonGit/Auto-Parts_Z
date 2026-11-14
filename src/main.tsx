import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { waitForUser } from './services/firebase/FirebaseAuthRepository';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

waitForUser().finally(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});