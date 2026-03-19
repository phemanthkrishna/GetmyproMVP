import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { JobCallScreen } from './components/JobCallScreen'
import { CustomerAlertNotifier } from './components/CustomerAlertNotifier'

// Pages
import Landing from './pages/Landing'

// Customer
import CustomerLogin from './pages/customer/Login'
import CustomerHome from './pages/customer/Home'
import Book from './pages/customer/Book'
import CustomerOrders from './pages/customer/Orders'
import CustomerOrderDetail from './pages/customer/OrderDetail'
import CustomerProfile from './pages/customer/Profile'

// Worker
import WorkerLogin from './pages/worker/Login'
import WorkerRegister from './pages/worker/Register'
import WorkerJobs from './pages/worker/Jobs'
import WorkerEarnings from './pages/worker/Earnings'
import WorkerProfile from './pages/worker/Profile'
import WorkerHistory from './pages/worker/WorkHistory'
import JobDetail from './pages/worker/JobDetail'

// Admin
import AdminLogin from './pages/admin/Login'
import AdminDashboard from './pages/admin/Dashboard'
import AdminOrderDetail from './pages/admin/OrderDetail'
import AdminWorkers from './pages/admin/Workers'
import AdminPayments from './pages/admin/Payments'
import AdminMaterials from './pages/admin/Materials'
import AdminStores from './pages/admin/Stores'

function RequireAuth({ children, role }: { children: JSX.Element; role?: string }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="p-6 text-slate-400">Loading...</div>
  if (!session) return <Navigate to="/" replace />
  if (role && session.role !== role) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { session } = useAuth()
  return (
    <>
    {session?.role === 'worker' && (
      <JobCallScreen
        workerId={session.id}
        workerName={session.name}
        workerPhone={session.phone}
      />
    )}
    {session?.role === 'customer' && (
      <CustomerAlertNotifier customerId={session.id} />
    )}
    <Routes>
      <Route path="/" element={<Landing />} />

      {/* Customer */}
      <Route path="/customer/login" element={<CustomerLogin />} />
      <Route path="/customer" element={<RequireAuth role="customer"><CustomerHome /></RequireAuth>} />
      <Route path="/customer/book" element={<RequireAuth role="customer"><Book /></RequireAuth>} />
      <Route path="/customer/orders" element={<RequireAuth role="customer"><CustomerOrders /></RequireAuth>} />
      <Route path="/customer/orders/:orderId" element={<RequireAuth role="customer"><CustomerOrderDetail /></RequireAuth>} />
      <Route path="/customer/profile" element={<RequireAuth role="customer"><CustomerProfile /></RequireAuth>} />

      {/* Worker */}
      <Route path="/worker/login" element={<WorkerLogin />} />
      <Route path="/worker/register" element={<WorkerRegister />} />
      <Route path="/worker" element={<RequireAuth role="worker"><WorkerJobs /></RequireAuth>} />
      <Route path="/worker/earnings" element={<RequireAuth role="worker"><WorkerEarnings /></RequireAuth>} />
      <Route path="/worker/history" element={<RequireAuth role="worker"><WorkerHistory /></RequireAuth>} />
      <Route path="/worker/profile" element={<RequireAuth role="worker"><WorkerProfile /></RequireAuth>} />
      <Route path="/worker/job/:orderId" element={<RequireAuth role="worker"><JobDetail /></RequireAuth>} />

      {/* Admin */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
      <Route path="/admin/orders/:orderId" element={<RequireAuth role="admin"><AdminOrderDetail /></RequireAuth>} />
      <Route path="/admin/workers" element={<RequireAuth role="admin"><AdminWorkers /></RequireAuth>} />
      <Route path="/admin/payments" element={<RequireAuth role="admin"><AdminPayments /></RequireAuth>} />
      <Route path="/admin/materials" element={<RequireAuth role="admin"><AdminMaterials /></RequireAuth>} />
      <Route path="/admin/stores" element={<RequireAuth role="admin"><AdminStores /></RequireAuth>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
