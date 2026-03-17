import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { BottomNav } from '../../components/BottomNav'
import { Briefcase, DollarSign, User, LogOut, Edit2, Check, X, History } from 'lucide-react'
import { SERVICES } from '../../constants'
import type { Worker } from '../../types'

const NAV = [
  { to: '/worker', icon: Briefcase, label: 'Jobs' },
  { to: '/worker/earnings', icon: DollarSign, label: 'Earnings' },
  { to: '/worker/history', icon: History, label: 'History' },
  { to: '/worker/profile', icon: User, label: 'Profile' },
]

export default function WorkerProfile() {
  const { session, signOut } = useAuth()
  const [worker, setWorker] = useState<Worker | null>(null)
  const [editingServices, setEditingServices] = useState(false)
  const [draftCategories, setDraftCategories] = useState<string[]>([])
  const [savingServices, setSavingServices] = useState(false)
  const [editingUpi, setEditingUpi] = useState(false)
  const [draftUpi, setDraftUpi] = useState('')

  useEffect(() => {
    supabase.from('workers').select('*').eq('id', session?.id).single()
      .then(({ data }) => setWorker(data))
  }, [session?.id])

  async function toggleOnline() {
    if (!worker) return
    const newVal = !worker.is_online
    const { error } = await supabase.from('workers').update({ is_online: newVal }).eq('id', worker.id)
    if (error) { toast.error(error.message); return }
    setWorker(w => w ? { ...w, is_online: newVal } : w)
    toast.success(newVal ? 'You are now Online' : 'You are now Offline')
  }

  function startEditServices() {
    setDraftCategories(worker?.service_categories || [])
    setEditingServices(true)
  }

  async function saveUpi() {
    if (!session) return
    const { error } = await supabase.from('workers').update({ upi_id: draftUpi.trim() || null }).eq('id', session.id)
    if (error) { toast.error(error.message); return }
    setWorker(w => w ? { ...w, upi_id: draftUpi.trim() || undefined } : w)
    toast.success('UPI ID updated ✓')
    setEditingUpi(false)
  }

  async function saveServices() {
    if (draftCategories.length === 0) { toast.error('Select at least one service'); return }
    if (!session) return
    setSavingServices(true)
    const { error } = await supabase.from('workers').update({
      service_categories: draftCategories,
      service: draftCategories[0],
    }).eq('id', session.id)
    if (error) { toast.error(error.message); setSavingServices(false); return }
    setWorker(w => w ? { ...w, service_categories: draftCategories, service: draftCategories[0] } : w)
    toast.success('Services updated ✓')
    setEditingServices(false)
    setSavingServices(false)
  }

  return (
    <div className="page-content px-5 py-6">
      <h1 className="text-2xl font-black font-heading text-slate-50 mb-4">Profile</h1>

      {/* Online/Offline toggle */}
      <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 mb-5">
        <div>
          <p className="text-slate-50 font-semibold text-sm">Availability</p>
          <p className="text-slate-500 text-xs">{worker?.is_online ? 'Online — receiving jobs' : 'Offline — not receiving jobs'}</p>
        </div>
        <button
          onClick={toggleOnline}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            worker?.is_online ? 'bg-green-500' : 'bg-slate-600'
          }`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
            worker?.is_online ? 'left-6' : 'left-0.5'
          }`} />
        </button>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-orange-500/20 border border-orange-500/30 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-black text-orange-400">
          {worker?.photo_url
            ? <img src={worker.photo_url} alt={session?.name} className="w-full h-full object-cover" />
            : session?.name?.[0]?.toUpperCase()
          }
        </div>
        <div>
          <p className="text-xl font-black text-slate-50">{session?.name}</p>
          <p className="text-slate-400 text-sm">{session?.phone}</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl divide-y divide-slate-700 mb-4">
        <Row label="Phone" value={session?.phone || '—'} />
        <Row
          label="Status"
          value={worker?.verified ? '✓ Verified' : '⏳ Pending Verification'}
          valueClass={worker?.verified ? 'text-green-400' : 'text-amber-400'}
        />
        <Row label="Member since" value={worker?.created_at ? new Date(worker.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
      </div>

      {/* UPI ID */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-slate-50 font-semibold text-sm">UPI ID</p>
          {!editingUpi && (
            <button onClick={() => { setDraftUpi(worker?.upi_id || ''); setEditingUpi(true) }} className="text-blue-400 flex items-center gap-1 text-xs">
              <Edit2 size={12} /> Edit
            </button>
          )}
        </div>
        {!editingUpi ? (
          <p className={`text-sm ${worker?.upi_id ? 'text-slate-300 font-mono' : 'text-slate-600'}`}>
            {worker?.upi_id || 'Not set — add your UPI ID to receive payments'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              value={draftUpi}
              onChange={e => setDraftUpi(e.target.value)}
              placeholder="yourname@upi or phone@bank"
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-slate-50 text-sm outline-none focus:border-blue-500"
            />
            <div className="flex gap-2">
              <button onClick={saveUpi} className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white text-xs font-bold rounded-xl">
                <Check size={12} /> Save
              </button>
              <button onClick={() => setEditingUpi(false)} className="flex items-center gap-1 px-4 py-2 bg-slate-700 text-slate-300 text-xs font-bold rounded-xl">
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Service categories */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-slate-50 font-semibold text-sm">My Services</p>
          {!editingServices && (
            <button onClick={startEditServices} className="text-blue-400 flex items-center gap-1 text-xs">
              <Edit2 size={12} /> Edit
            </button>
          )}
        </div>

        {!editingServices ? (
          <div className="flex flex-wrap gap-2">
            {(worker?.service_categories || [worker?.service].filter(Boolean)).map((cat, i) => (
              <span key={i} className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-300 text-xs font-semibold">
                {cat}
              </span>
            ))}
            {!worker?.service_categories?.length && !worker?.service && (
              <span className="text-slate-500 text-sm">No services set</span>
            )}
          </div>
        ) : (
          <>
            <p className="text-slate-400 text-xs mb-2">Select up to 2 services</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {SERVICES.map(s => {
                const selected = draftCategories.includes(s.name)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      if (selected) {
                        setDraftCategories(prev => prev.filter(c => c !== s.name))
                      } else if (draftCategories.length < 2) {
                        setDraftCategories(prev => [...prev, s.name])
                      } else {
                        toast.error('You can select up to 2 services')
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                      selected
                        ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                        : 'border-slate-600 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <span>{s.emoji}</span>
                    <span>{s.name}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveServices}
                disabled={savingServices}
                className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white text-xs font-bold rounded-xl disabled:opacity-50"
              >
                <Check size={12} /> {savingServices ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setEditingServices(false)}
                className="flex items-center gap-1 px-4 py-2 bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                <X size={12} /> Cancel
              </button>
            </div>
          </>
        )}
      </div>

      {!worker?.verified && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4 text-amber-400 text-sm">
          Your account is under review. Admin will verify your Aadhaar and activate your account.
        </div>
      )}

      {/* Sign out */}
      <button
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 rounded-xl py-3 text-red-400 font-semibold text-sm"
      >
        <LogOut size={16} />
        Sign Out
      </button>

      <BottomNav items={NAV} />
    </div>
  )
}

function Row({ label, value, valueClass = 'text-slate-50' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  )
}
