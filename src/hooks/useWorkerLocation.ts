import { useEffect, useRef } from 'react'
import { ref, set, remove } from 'firebase/database'
import { database } from '../lib/firebase'

export function useWorkerLocation(workerId: string, isActive: boolean) {
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isActive || !workerId || !navigator.geolocation) return

    const locRef = ref(database, `worker_locations/${workerId}`)

    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        set(locRef, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          ts: Date.now(),
        })
      },
      err => { console.error('Worker GPS error:', err.code, err.message) },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      remove(locRef)
    }
  }, [workerId, isActive])
}
