import { Routes, Route, Navigate } from 'react-router-dom'
import { useStoreAuth } from './context/StoreAuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import OrderDetail from './pages/OrderDetail'
import Earnings from './pages/Earnings'
import Profile from './pages/Profile'

export default function App() {
  const { store, loading } = useStoreAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!store) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/order/:id" element={<OrderDetail />} />
      <Route path="/earnings" element={<Earnings />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
