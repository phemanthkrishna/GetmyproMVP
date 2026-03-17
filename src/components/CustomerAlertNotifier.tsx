import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { SERVICES } from '../constants'

interface Props {
  customerId: string
}

export function CustomerAlertNotifier({ customerId }: Props) {
  const navigate = useNavigate()
  const notifiedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    checkAndNotify()
    const ch = supabase
      .channel('customer-alert-notifier')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'workers' }, () => {
        checkAndNotify()
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [customerId])

  async function checkAndNotify() {
    const { data: alerts } = await supabase
      .from('service_alerts')
      .select('service')
      .eq('customer_id', customerId)

    if (!alerts?.length) { notifiedRef.current.clear(); return }

    const { data: onlineWorkers } = await supabase
      .from('workers')
      .select('service, service_categories')
      .eq('verified', true)
      .eq('is_active', true)
      .eq('is_online', true)

    const readyServices = alerts
      .filter(a => a.service && (onlineWorkers || []).some(w =>
        w.service === a.service ||
        (Array.isArray(w.service_categories) && w.service_categories.includes(a.service))
      ))
      .map(a => a.service)

    notifiedRef.current.forEach(s => {
      if (!readyServices.includes(s)) notifiedRef.current.delete(s)
    })

    readyServices.forEach(service => {
      if (notifiedRef.current.has(service)) return
      notifiedRef.current.add(service)
      const emoji = SERVICES.find(s => s.name === service)?.emoji || '🔧'
      toast.success(`${emoji} ${service} pros are online!`, {
        description: 'A partner is available — book now before they go offline.',
        duration: Infinity,
        action: {
          label: 'Book Now',
          onClick: async () => {
            notifiedRef.current.delete(service)
            await supabase.from('service_alerts').delete()
              .eq('customer_id', customerId).eq('service', service)
            navigate(`/customer/book?service=${encodeURIComponent(service)}`)
          },
        },
        onDismiss: () => { notifiedRef.current.delete(service) },
      })
    })
  }

  return null
}
