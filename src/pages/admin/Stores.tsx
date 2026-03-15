import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { BottomNav } from '../../components/BottomNav'
import { ClipboardList, Users, DollarSign, Package, Store, Trash2, Plus } from 'lucide-react'

const NAV = [
  { to: '/admin', icon: ClipboardList, label: 'Orders' },
  { to: '/admin/workers', icon: Users, label: 'Workers' },
  { to: '/admin/payments', icon: DollarSign, label: 'Payments' },
  { to: '/admin/materials', icon: Package, label: 'Materials' },
  { to: '/admin/stores', icon: Store, label: 'Stores' },
]

interface StoreRow {
  id: string
  name: string
  store_type: string
  contact: string
  commission_pct: number
  created_at: string
}

const EMPTY_FORM = { name: '', store_type: '', contact: '', commission_pct: 15 }

export default function AdminStores() {
  const [stores, setStores] = useState<StoreRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { fetchStores() }, [])

  async function fetchStores() {
    const { data } = await supabase.from('stores').select('*').order('created_at', { ascending: false })
    setStores((data as StoreRow[]) || [])
  }

  async function addStore() {
    if (!form.name.trim()) return toast.error('Enter store name')
    if (!form.store_type.trim()) return toast.error('Enter store type')
    if (!form.contact.trim()) return toast.error('Enter contact')
    setSaving(true)
    const { error } = await supabase.from('stores').insert({
      name: form.name.trim(),
      store_type: form.store_type.trim(),
      contact: form.contact.trim(),
      commission_pct: form.commission_pct,
    })
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Store added ✓')
    setForm(EMPTY_FORM)
    setShowForm(false)
    fetchStores()
    setSaving(false)
  }

  async function deleteStore(id: string, name: string) {
    if (!confirm(`Delete store "${name}"?`)) return
    setDeleting(id)
    const { error } = await supabase.from('stores').delete().eq('id', id)
    if (error) { toast.error(error.message); setDeleting(null); return }
    toast.success('Store deleted')
    fetchStores()
    setDeleting(null)
  }

  return (
    <div className="page-content px-5 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-black font-heading text-slate-50">Partner Stores</h1>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1 text-sm font-bold text-orange-400 border border-orange-500/30 rounded-xl px-3 py-1.5"
        >
          <Plus size={14} /> Add Store
        </button>
      </div>

      {/* Add store form */}
      {showForm && (
        <Card className="mb-5 border-orange-500/30">
          <p className="font-bold text-slate-50 mb-4">New Partner Store</p>
          <div className="flex flex-col gap-3">
            <Input
              label="Store Name"
              placeholder="e.g. Sharma Hardware"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Store Type"
              placeholder="e.g. Hardware, Electrical, Plumbing"
              value={form.store_type}
              onChange={e => setForm(f => ({ ...f, store_type: e.target.value }))}
            />
            <Input
              label="Contact (Phone)"
              placeholder="10-digit number"
              type="tel"
              value={form.contact}
              onChange={e => setForm(f => ({ ...f, contact: e.target.value.replace(/\D/g, '') }))}
            />
            <Input
              label="Commission %"
              type="number"
              placeholder="15"
              value={String(form.commission_pct)}
              onChange={e => setForm(f => ({ ...f, commission_pct: Number(e.target.value) }))}
            />
            <div className="flex gap-2">
              <Button variant="accent" loading={saving} onClick={addStore} className="flex-1">
                Add Store ✓
              </Button>
              <Button variant="primary" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {stores.length === 0 && !showForm && (
        <div className="text-center py-16 text-slate-500 text-sm">
          No partner stores yet. Add one to get started.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {stores.map(s => (
          <Card key={s.id}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Store size={14} className="text-orange-400" />
                  <p className="font-bold text-slate-50">{s.name}</p>
                </div>
                <p className="text-slate-500 text-xs">{s.store_type}</p>
                <p className="text-slate-500 text-xs mt-0.5">{s.contact}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                  {s.commission_pct}% commission
                </span>
                <button
                  onClick={() => deleteStore(s.id, s.name)}
                  disabled={deleting === s.id}
                  className="text-red-400 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <BottomNav items={NAV} />
    </div>
  )
}
