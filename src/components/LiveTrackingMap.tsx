import { useState, useEffect, useCallback, useRef } from 'react'
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api'
import { ref, onValue } from 'firebase/database'
import { database } from '../lib/firebase'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

const darkStyles = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#2b2b2b' }] },
]

const pinIcon = (color: string, size: number) =>
  `data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" fill="${encodeURIComponent(color)}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`

interface Props {
  workerId: string
  workerName: string
  customerLat?: number | null
  customerLng?: number | null
}

interface WorkerPos { lat: number; lng: number }

export function LiveTrackingMap({ workerId, workerName, customerLat, customerLng }: Props) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: MAPS_KEY,
  })

  const [workerPos, setWorkerPos] = useState<WorkerPos | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    const locRef = ref(database, `worker_locations/${workerId}`)
    const unsub = onValue(locRef, snapshot => {
      const data = snapshot.val()
      if (data?.lat && data?.lng) setWorkerPos({ lat: data.lat, lng: data.lng })
    }, error => {
      console.error('Firebase location read failed:', error.message)
    })
    return () => unsub()
  }, [workerId])

  // Fit bounds when positions update
  useEffect(() => {
    if (!mapRef.current || !isLoaded || !window.google) return
    if (workerPos && customerLat && customerLng) {
      const bounds = new window.google.maps.LatLngBounds()
      bounds.extend(workerPos)
      bounds.extend({ lat: customerLat, lng: customerLng })
      mapRef.current.fitBounds(bounds, 50)
    } else if (workerPos) {
      mapRef.current.panTo(workerPos)
    } else if (customerLat && customerLng) {
      mapRef.current.panTo({ lat: customerLat, lng: customerLng })
    }
  }, [workerPos, customerLat, customerLng, isLoaded])

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  const defaultCenter = workerPos
    ? workerPos
    : customerLat && customerLng
      ? { lat: customerLat, lng: customerLng }
      : { lat: 12.9716, lng: 77.5946 }

  return (
    <div>
      <div className="rounded-2xl overflow-hidden border border-slate-700" style={{ height: 220 }}>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={defaultCenter}
            zoom={15}
            onLoad={onMapLoad}
            options={{ disableDefaultUI: true, styles: darkStyles }}
          >
            {customerLat && customerLng && (
              <Marker
                position={{ lat: customerLat, lng: customerLng }}
                icon={{
                  url: pinIcon('#f97316', 32),
                  scaledSize: new window.google.maps.Size(32, 32),
                  anchor: new window.google.maps.Point(16, 32),
                }}
              />
            )}
            {workerPos && (
              <Marker
                position={workerPos}
                icon={{
                  url: pinIcon('#3b82f6', 40),
                  scaledSize: new window.google.maps.Size(40, 40),
                  anchor: new window.google.maps.Point(20, 40),
                }}
              />
            )}
          </GoogleMap>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111318', color: '#475569', fontSize: 13 }}>
            Loading map…
          </div>
        )}
      </div>
      <div className="flex gap-4 mt-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
          <span className="text-slate-500 text-xs">Your location</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
          <span className="text-slate-500 text-xs">{workerName || 'Pro'} live location</span>
        </div>
        {!workerPos && (
          <span className="text-slate-600 text-xs ml-auto animate-pulse">Waiting for Pro's location…</span>
        )}
      </div>
    </div>
  )
}
