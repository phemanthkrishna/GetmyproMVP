import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MapPin, Crosshair, X, Check } from 'lucide-react'

// Fix Leaflet default marker icons with Vite
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

interface LatLng { lat: number; lng: number }

interface Props {
  initialLat?: number
  initialLng?: number
  onConfirm: (lat: number, lng: number, address: string) => void
  onClose: () => void
}

// Reverse geocode using OpenStreetMap Nominatim (free, no API key)
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'GetMyPro-App' } }
    )
    const data = await res.json()
    const d = data.address || {}
    const parts = [
      d.house_number,
      d.road || d.pedestrian || d.footway,
      d.suburb || d.neighbourhood || d.quarter,
      d.city || d.town || d.village || d.county,
      d.state,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}

// Component to re-center map
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], 17) }, [lat, lng])
  return null
}

// Tap handler inside MapContainer
function TapHandler({ onTap }: { onTap: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) { onTap({ lat: e.latlng.lat, lng: e.latlng.lng }) },
  })
  return null
}

// Forces Leaflet to recalculate map size after the container renders
function InvalidateSize() {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100)
    return () => clearTimeout(t)
  }, [])
  return null
}

export function MapPicker({ initialLat, initialLng, onConfirm, onClose }: Props) {
  const defaultLat = initialLat ?? 12.9716
  const defaultLng = initialLng ?? 77.5946 // Bangalore default

  const [pin, setPin] = useState<LatLng>({ lat: defaultLat, lng: defaultLng })
  const [address, setAddress] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [locating, setLocating] = useState(false)
  const [center, setCenter] = useState<LatLng>({ lat: defaultLat, lng: defaultLng })
  const [recenter, setRecenter] = useState(false)

  // Reverse geocode whenever pin changes
  useEffect(() => {
    setGeocoding(true)
    reverseGeocode(pin.lat, pin.lng).then(addr => {
      setAddress(addr)
      setGeocoding(false)
    })
  }, [pin.lat, pin.lng])

  function handleTap(pos: LatLng) {
    setPin(pos)
  }

  function useMyLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setPin(loc)
        setCenter(loc)
        setRecenter(r => !r)
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  function handleConfirm() {
    if (!address) return
    onConfirm(pin.lat, pin.lng, address)
  }

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-700 shrink-0">
        <button onClick={onClose} className="text-slate-400 p-1">
          <X size={20} />
        </button>
        <div>
          <p className="text-slate-50 font-bold text-sm">Pick your location</p>
          <p className="text-slate-500 text-xs">Tap on the map to set your address</p>
        </div>
        <button
          onClick={useMyLocation}
          disabled={locating}
          className="ml-auto flex items-center gap-1.5 bg-slate-700 border border-slate-600 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-300"
        >
          <Crosshair size={13} className={locating ? 'animate-spin' : ''} />
          {locating ? 'Locating…' : 'My Location'}
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <div className="absolute inset-0">
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={15}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            />
            <InvalidateSize />
            <TapHandler onTap={handleTap} />
            {recenter !== undefined && <RecenterMap lat={center.lat} lng={center.lng} />}
            <Marker position={[pin.lat, pin.lng]} icon={customerIcon} />
          </MapContainer>
        </div>

        {/* Center crosshair hint */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[1000]">
          <div className="w-1 h-1 rounded-full bg-orange-500 opacity-60" />
        </div>
      </div>

      {/* Address bar + confirm */}
      <div className="px-4 py-4 bg-slate-900 border-t border-slate-700 shrink-0">
        <div className="flex items-start gap-3 mb-3">
          <MapPin size={18} className="text-orange-400 mt-0.5 shrink-0" />
          <p className="text-slate-200 text-sm leading-relaxed flex-1">
            {geocoding ? (
              <span className="text-slate-500 animate-pulse">Getting address…</span>
            ) : (
              address || 'Tap the map to select a location'
            )}
          </p>
        </div>
        <button
          onClick={handleConfirm}
          disabled={!address || geocoding}
          className="w-full bg-orange-500 disabled:opacity-40 text-white font-bold rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform"
        >
          <Check size={16} />
          Confirm Location
        </button>
      </div>
    </div>,
    document.body
  )
}
