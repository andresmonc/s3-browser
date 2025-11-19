import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { ToastProvider } from './contexts/ToastContext'
import { CredentialProvider } from './contexts/CredentialContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <CredentialProvider>
          <App />
        </CredentialProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
