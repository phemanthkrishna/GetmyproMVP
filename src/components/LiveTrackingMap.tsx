import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { ref, onValue } from 'firebase/database'
import { database } from '../lib/firebase'

interface Props {
  workerId: string
  workerName: string
  customerLat: number
  customerLng: number
}

interface WorkerPos { lat: number; lng: number }

const customerIcon = L.divIcon({
  html: `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center">
    <svg viewBox="0 0 24 24" fill="#f97316" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
})

const workerIcon = L.divIcon({
  html: `<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center">
    <svg viewBox="0 0 24 24" fill="#3b82f6" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
})

function FitBounds({ workerPos, customerLat, customerLng }: { workerPos: WorkerPos | null; customerLat: number; customerLng: number }) {
  const map = useMap()
  useEffect(() => {
    if (workerPos) {
      const bounds = L.latLngBounds(
        [workerPos.lat, workerPos.lng],
        [customerLat, customerLng]
      )
      map.fitBounds(bounds, { padding: [50, 50] })
    } else {
      map.setView([customerLat, customerLng], 15)
    }
  }, [workerPos?.lat, workerPos?.lng])
  return null
}

export function LiveTrackingMap({ workerId, workerName, customerLat, customerLng }: Props) {
  const [workerPos, setWorkerPos] = useState<WorkerPos | null>(null)

  useEffect(() => {
    const locRef = ref(database, `worker_locations/${workerId}`)
    const unsub = onValue(locRef, snapshot => {
      const data = snapshot.val()
      if (data?.lat && data?.lng) {
        setWorkerPos({ lat: data.lat, lng: data.lng })
      }
    })
    return () => unsub()
  }, [workerId])

  return (
    <div>
      <div className="rounded-2xl overflow-hidden border border-slate-700" style={{ height: 220 }}>
        <MapContainer
          center={[customerLat, customerLng]}
          zoom={15}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          scrollWheelZoom={false}
          dragging={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          />
          <FitBounds workerPos={workerPos} customerLat={customerLat} customerLng={customerLng} />
          <Marker position={[customerLat, customerLng]} icon={customerIcon} />
          {workerPos && <Marker position={[workerPos.lat, workerPos.lng]} icon={workerIcon} />}
        </MapContainer>
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
