import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { StoreAuthProvider } from './context/StoreAuthContext'
import { ThemeProvider } from './context/ThemeContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ThemeProvider>
    <AuthProvider>
    <StoreAuthProvider>
      <div className="app-shell">
        <App />
      </div>
      <Toaster
        position="top-center"
        offset={{ top: 'max(16px, env(safe-area-inset-top, 16px))' } as any}
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          },
        }}
      />
    </StoreAuthProvider>
    </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
)
