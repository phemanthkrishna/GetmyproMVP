import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthContext'
import { useOrders } from '../../hooks/useOrders'
import { supabase } from '../../lib/supabase'
import { StatusBadge } from '../../components/StatusBadge'
import { BottomNav } from '../../components/BottomNav'
import { formatDate } from '../../lib/utils'
import { Briefcase, DollarSign, User, History } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import type { Worker } from '../../types'

const NAV = [
  { to: '/worker', icon: Briefcase, label: 'Jobs' },
  { to: '/worker/earnings', icon: DollarSign, label: 'Earnings' },
  { to: '/worker/history', icon: History, label: 'History' },
  { to: '/worker/profile', icon: User, label: 'Profile' },
]

export default function WorkerJobs() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [workerInfo, setWorkerInfo] = useState<Worker | null>(null)

  const { orders: myJobs } = useOrders({ worker_id: session?.id || '' })
  const activeJobs = myJobs.filter(o => !['completed', 'cancelled'].includes(o.status))
  const totalEarned = myJobs
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + (o.quote_labour || 0), 0)

  // Available jobs (unassigned, booked)
  const [available, setAvailable] = useState<typeof myJobs>([])

  useEffect(() => {
    supabase
      .from('workers')
      .select('*')
      .eq('id', session?.id)
      .single()
      .then(({ data }) => setWorkerInfo(data))

    fetchAvailable()

    // Real-time: new booked orders (INSERT and UPDATE)
    const channel = supabase
      .channel('available-jobs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => fetchAvailable())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => fetchAvailable())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchAvailable() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'booked')
      .is('worker_id', null)
      .order('created_at', { ascending: false })
    setAvailable((data as any) || [])
  }

  async function toggleOnline() {
    if (!workerInfo) return
    const newVal = !workerInfo.is_online
    const { error } = await supabase.from('workers').update({ is_online: newVal }).eq('id', workerInfo.id)
    if (error) { toast.error(error.message); return }
    setWorkerInfo(w => w ? { ...w, is_online: newVal } : w)
    toast.success(newVal ? 'You are now Online' : 'You are now Offline')
  }

  // Filter available jobs by service_categories
  const filteredAvailable = available.filter(o => {
    const cats = workerInfo?.service_categories
    if (!cats || cats.length === 0) return true
    return cats.includes(o.service)
  })

  const isVerified = workerInfo?.verified ?? false

  return (
    <div className="page-content px-5 py-6">
      {/* Pending verification banner */}
      {workerInfo && !isVerified && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4 text-amber-400 text-sm">
          ⏳ Pending verification — jobs visible after admin approves
        </div>
      )}

      {/* Offline banner */}
      {workerInfo && isVerified && !workerInfo.is_online && (
        <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-3 mb-4 text-slate-400 text-sm">
          You're offline — toggle online to see available jobs
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-slate-400 text-sm">Welcome back,</p>
          <h1 className="text-2xl font-black font-heading text-slate-50">{session?.name?.split(' ')[0]}</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Online/Offline toggle */}
          {workerInfo && (
            <button
              onClick={toggleOnline}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                workerInfo.is_online
                  ? 'bg-green-500/20 border-green-500/40 text-green-400'
                  : 'bg-slate-700 border-slate-600 text-slate-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${workerInfo.is_online ? 'bg-green-400' : 'bg-slate-500'}`} />
              {workerInfo.is_online ? 'Online' : 'Offline'}
            </button>
          )}
          <div className="text-right">
            <p className="text-slate-500 text-xs">Total Earned</p>
            <p className="text-green-400 font-black text-lg">{formatCurrency(totalEarned)}</p>
          </div>
        </div>
      </div>

      {/* My Active Jobs */}
      {activeJobs.length > 0 && (
        <>
          <h2 className="text-base font-bold text-slate-300 mb-3">My Active Jobs</h2>
          <div className="flex flex-col gap-3 mb-6">
            {activeJobs.map(o => (
              <JobCard key={o.id} order={o} onClick={() => navigate(`/worker/job/${o.id}`)} />
            ))}
          </div>
        </>
      )}

      {/* Available Jobs — only for verified + online workers */}
      {isVerified && workerInfo?.is_online && (
        <>
          <h2 className="text-base font-bold text-slate-300 mb-3">Available Jobs</h2>
          {filteredAvailable.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-500">No jobs available right now</p>
              <p className="text-slate-600 text-xs mt-1">Check back soon</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredAvailable.map(o => (
                <JobCard key={o.id} order={o} onClick={() => navigate(`/worker/job/${o.id}`)} />
              ))}
            </div>
          )}
        </>
      )}

      <BottomNav items={NAV} />
    </div>
  )
}

function JobCard({ order, onClick }: { order: any; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-left btn-press w-full"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{order.service_emoji}</span>
        <div className="flex-1">
          <p className="font-bold text-slate-50">{order.service}</p>
          <p className="text-slate-500 text-xs truncate">{order.address}</p>
          <p className="text-slate-600 text-xs mt-0.5">{formatDate(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
    </button>
  )
}
