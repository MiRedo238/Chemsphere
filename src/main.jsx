import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext';
import { DatabaseProvider } from './contexts/DatabaseContext';
import { HashRouter } from "react-router-dom";

createRoot(document.getElementById('root')).render(
  <StrictMode>
      <AuthProvider>
      <DatabaseProvider>
        <App />
      </DatabaseProvider>
    </AuthProvider>
  </StrictMode>,
)
