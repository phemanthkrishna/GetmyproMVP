import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CustomerApp from './apps/CustomerApp'
import WorkerApp from './apps/WorkerApp'
import StoreApp from './apps/StoreApp'
import AdminApp from './apps/AdminApp'
import './index.css'

const portal = import.meta.env.VITE_PORTAL

const AppComponent =
  portal === 'worker' ? WorkerApp :
  portal === 'store'  ? StoreApp  :
  portal === 'admin'  ? AdminApp  :
  CustomerApp

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppComponent />
  </StrictMode>
)
