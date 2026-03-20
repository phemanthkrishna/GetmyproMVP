import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { BottomNav } from '../../components/BottomNav'
import { ClipboardList, Users, DollarSign, Package, Store, Trash2, Plus, Copy, ToggleLeft, ToggleRight } from 'lucide-react'

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
  phone: string
  commission_pct: number
  store_id: string
  is_active: boolean
  created_at: string
}

const EMPTY_FORM = { name: '', store_type: '', contact: '', phone: '', commission_pct: 15 }

function generateStoreId() {
  const num = Math.floor(100000 + Math.random() * 900000)
  return `STR-${num}`
}

export default function AdminStores() {
  const [stores, setStores] = useState<StoreRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [createdStoreId, setCreatedStoreId] = useState<string | null>(null)

  useEffect(() => { fetchStores() }, [])

  async function fetchStores() {
    const { data, error } = await supabase.from('stores').select('*').order('created_at', { ascending: false })
    if (error) console.error('Failed to load stores:', error.message)
    setStores((data as StoreRow[]) || [])
  }

  async function addStore() {
    if (!form.name.trim()) return toast.error('Enter store name')
    if (!form.store_type.trim()) return toast.error('Enter store type')
    if (!form.contact.trim()) return toast.error('Enter contact')
    if (form.commission_pct <= 0 || form.commission_pct > 100) return toast.error('Commission % must be between 1 and 100')
    setSaving(true)
    const newStoreId = generateStoreId()
    const { error } = await supabase.from('stores').insert({
      name: form.name.trim(),
      store_type: form.store_type.trim(),
      contact: form.contact.trim(),
      phone: form.phone.trim() || form.contact.trim(),
      commission_pct: form.commission_pct,
      store_id: newStoreId,
      is_active: true,
    })
    if (error) { toast.error(error.message); setSaving(false); return }
    setCreatedStoreId(newStoreId)
    setForm(EMPTY_FORM)
    setShowForm(false)
    fetchStores()
    setSaving(false)
  }

  async function toggleActive(store: StoreRow) {
    setToggling(store.id)
    const { error } = await supabase.from('stores').update({ is_active: !store.is_active }).eq('id', store.id)
    if (error) { toast.error(error.message); setToggling(null); return }
    setStores(s => s.map(st => st.id === store.id ? { ...st, is_active: !store.is_active } : st))
    toast.success(store.is_active ? 'Store deactivated' : 'Store activated')
    setToggling(null)
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

  function copyStoreId(storeId: string) {
    navigator.clipboard.writeText(storeId).then(() => toast.success('Store ID copied!'))
  }

  return (
    <div className="page-content px-5 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-black font-heading text-slate-50">Partner Stores</h1>
        <button
          onClick={() => { setShowForm(s => !s); setCreatedStoreId(null) }}
          className="flex items-center gap-1 text-sm font-bold text-orange-400 border border-orange-500/30 rounded-xl px-3 py-1.5"
        >
          <Plus size={14} /> Add Store
        </button>
      </div>

      {/* Created store ID banner */}
      {createdStoreId && (
        <Card className="mb-5 border-green-500/30 bg-green-500/10">
          <p className="font-bold text-green-400 mb-1">Store Created!</p>
          <p className="text-slate-400 text-sm mb-3">Share this Store ID with the store owner to log in.</p>
          <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-xl px-4 py-3">
            <span className="font-mono font-black text-2xl text-slate-50 tracking-widest">{createdStoreId}</span>
            <button onClick={() => copyStoreId(createdStoreId)} className="text-blue-400 flex items-center gap-1 text-sm font-semibold">
              <Copy size={14} /> Copy
            </button>
          </div>
          <button onClick={() => setCreatedStoreId(null)} className="mt-3 text-slate-500 text-xs w-full text-center">Dismiss</button>
        </Card>
      )}

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
              label="Login Phone (for store app)"
              placeholder="10-digit number"
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
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
          <Card key={s.id} className={s.is_active ? '' : 'opacity-60'}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Store size={14} className="text-orange-400" />
                  <p className="font-bold text-slate-50">{s.name}</p>
                  {!s.is_active && <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">Inactive</span>}
                </div>
                <p className="text-slate-500 text-xs">{s.store_type}</p>
                <p className="text-slate-500 text-xs mt-0.5">{s.contact}</p>
                {s.store_id && (
                  <button
                    onClick={() => copyStoreId(s.store_id)}
                    className="flex items-center gap-1 mt-1.5 text-blue-400 text-xs font-mono font-bold"
                  >
                    {s.store_id} <Copy size={10} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                  {s.commission_pct}%
                </span>
                <button
                  onClick={() => toggleActive(s)}
                  disabled={toggling === s.id}
                  className="text-slate-400 disabled:opacity-50"
                  title={s.is_active ? 'Deactivate' : 'Activate'}
                >
                  {s.is_active ? <ToggleRight size={22} className="text-green-400" /> : <ToggleLeft size={22} />}
                </button>
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
