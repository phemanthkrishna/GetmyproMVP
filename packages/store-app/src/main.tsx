import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { StoreAuthProvider } from './context/StoreAuthContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreAuthProvider>
        <div className="app-shell">
          <App />
          <Toaster position="top-center" richColors />
        </div>
      </StoreAuthProvider>
    </BrowserRouter>
  </StrictMode>
)
