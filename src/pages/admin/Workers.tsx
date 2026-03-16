import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { BottomNav } from '../../components/BottomNav'
import { ClipboardList, Users, DollarSign, ChevronDown, ChevronUp, Package, Store } from 'lucide-react'
import type { Worker } from '../../types'

const NAV = [
  { to: '/admin', icon: ClipboardList, label: 'Orders' },
  { to: '/admin/workers', icon: Users, label: 'Workers' },
  { to: '/admin/payments', icon: DollarSign, label: 'Payments' },
  { to: '/admin/materials', icon: Package, label: 'Materials' },
  { to: '/admin/stores', icon: Store, label: 'Stores' },
]

export default function AdminWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetchWorkers()
    const channel = supabase
      .channel('admin-workers')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workers' }, () => fetchWorkers())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'workers' }, () => fetchWorkers())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchWorkers() {
    const { data, error } = await supabase.from('workers').select('*').order('created_at', { ascending: false })
    if (error) console.error('Failed to load workers:', error.message)
    setWorkers((data as Worker[]) || [])
  }

  async function verify(w: Worker) {
    setSaving(w.id)
    await supabase.from('workers').update({ verified: true }).eq('id', w.id)
    toast.success(`${w.name} verified ✓`)
    fetchWorkers()
    setSaving(null)
  }

  async function reject(w: Worker) {
    if (!confirm(`Reject ${w.name}? Their account will be deactivated and hidden.`)) return
    setSaving(w.id)
    // Soft-delete: mark as inactive and not verified rather than hard deleting.
    // This preserves order history and Aadhaar record for compliance/audit.
    const { error: wErr } = await supabase
      .from('workers')
      .update({ verified: false, is_active: false, is_online: false })
      .eq('id', w.id)
    if (wErr) { toast.error('Failed to reject worker, please try again'); setSaving(null); return }
    // Unlink from any open (non-terminal) orders so they can be reassigned
    const { error: unlinkErr } = await supabase
      .from('orders')
      .update({ worker_id: null, worker_name: null, worker_phone: null })
      .eq('worker_id', w.id)
      .not('status', 'in', '("completed","cancelled")')
    if (unlinkErr) console.error('Failed to unlink open orders:', unlinkErr.message)
    toast.success('Worker rejected and deactivated')
    fetchWorkers()
    setSaving(null)
  }

  async function deactivate(w: Worker) {
    if (!confirm(`Deactivate ${w.name}? They will be removed from the job pool.`)) return
    setSaving(w.id)
    const { error } = await supabase.from('workers').update({ is_active: false, verified: false }).eq('id', w.id)
    if (error) { toast.error('Failed to deactivate worker, please try again'); setSaving(null); return }
    toast.success(`${w.name} deactivated`)
    fetchWorkers()
    setSaving(null)
  }

  return (
    <div className="page-content px-5 py-6">
      <h1 className="text-2xl font-black font-heading text-slate-50 mb-5">Workers</h1>

      {workers.length === 0 && (
        <div className="text-center py-10 text-slate-500">No workers registered yet</div>
      )}

      <div className="flex flex-col gap-3">
        {workers.map(w => (
          <Card key={w.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-700 rounded-full overflow-hidden flex items-center justify-center font-bold text-slate-50 shrink-0">
                  {w.photo_url
                    ? <img src={w.photo_url} alt={w.name} className="w-full h-full object-cover" />
                    : w.name[0]
                  }
                </div>
                <div>
                  <p className="font-bold text-slate-50">{w.name}</p>
                  <p className="text-slate-500 text-xs">{w.service} · {w.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {w.is_active === false ? (
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-600/40 text-slate-400">
                    Inactive
                  </span>
                ) : (
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    w.verified
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {w.verified ? '✓ Verified' : '⏳ Pending'}
                  </span>
                )}
                {w.aadhaar_url && (
                  <button
                    onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                    className="text-slate-500"
                  >
                    {expanded === w.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                )}
              </div>
            </div>

            {expanded === w.id && w.aadhaar_url && (
              <div className="mt-3 border-t border-slate-700 pt-3">
                <p className="text-slate-400 text-xs mb-1">Aadhaar Number</p>
                <p className="text-slate-50 font-mono text-lg tracking-widest">
                  {`XXXX XXXX ${w.aadhaar_url.replace(/\s/g, '').slice(-4)}`}
                </p>
                <p className="text-slate-600 text-xs mt-1">Only last 4 digits shown for security</p>
              </div>
            )}

            {!w.verified && w.is_active !== false && (
              <div className="flex gap-2 mt-3">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  loading={saving === w.id}
                  onClick={() => verify(w)}
                >
                  Verify & Activate ✓
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1"
                  loading={saving === w.id}
                  onClick={() => reject(w)}
                >
                  Reject
                </Button>
              </div>
            )}

            {w.verified && w.is_active !== false && (
              <div className="flex gap-2 mt-3">
                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1"
                  loading={saving === w.id}
                  onClick={() => deactivate(w)}
                >
                  Deactivate
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1"
                  loading={saving === w.id}
                  onClick={() => reject(w)}
                >
                  Delete
                </Button>
              </div>
            )}

            {w.is_active === false && (
              <div className="flex gap-2 mt-3">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  loading={saving === w.id}
                  onClick={() => verify(w)}
                >
                  Re-Activate
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <BottomNav items={NAV} />
    </div>
  )
}
