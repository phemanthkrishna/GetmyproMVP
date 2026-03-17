import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MapPin, Crosshair, X, Check } from 'lucide-react'

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

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], 17) }, [lat, lng])
  return null
}

function TapHandler({ onTap }: { onTap: (pos: LatLng) => void }) {
  useMapEvents({ click(e) { onTap({ lat: e.latlng.lat, lng: e.latlng.lng }) } })
  return null
}

function InvalidateSize() {
  const map = useMap()
  useEffect(() => {
    // Fire multiple times to handle any layout settling
    const t1 = setTimeout(() => map.invalidateSize(), 50)
    const t2 = setTimeout(() => map.invalidateSize(), 300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  return null
}

const HEADER_H = 56  // px
const FOOTER_H = 96  // px

export function MapPicker({ initialLat, initialLng, onConfirm, onClose }: Props) {
  const defaultLat = initialLat ?? 12.9716
  const defaultLng = initialLng ?? 77.5946

  const [pin, setPin] = useState<LatLng>({ lat: defaultLat, lng: defaultLng })
  const [address, setAddress] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [locating, setLocating] = useState(false)
  const [center, setCenter] = useState<LatLng>({ lat: defaultLat, lng: defaultLng })
  const [recenter, setRecenter] = useState(false)

  useEffect(() => {
    setGeocoding(true)
    reverseGeocode(pin.lat, pin.lng).then(addr => { setAddress(addr); setGeocoding(false) })
  }, [pin.lat, pin.lng])

  function handleTap(pos: LatLng) { setPin(pos) }

  function handleMyLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setPin(loc); setCenter(loc); setRecenter(r => !r); setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  function handleConfirm() {
    if (!address) return
    onConfirm(pin.lat, pin.lng, address)
  }

  const mapH = `calc(100dvh - ${HEADER_H}px - ${FOOTER_H}px)`

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998, display: 'flex', flexDirection: 'column', background: '#09090b' }}>

      {/* Header */}
      <div style={{ height: HEADER_H, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', background: '#0f172a', borderBottom: '1px solid #1e293b' }}>
        <button onClick={onClose} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <X size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#f8fafc', fontWeight: 700, fontSize: 14, margin: 0 }}>Pick your location</p>
          <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>Tap on the map to set your address</p>
        </div>
        <button
          onClick={handleMyLocation}
          disabled={locating}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#cbd5e1', cursor: 'pointer', opacity: locating ? 0.6 : 1 }}
        >
          <Crosshair size={13} />
          {locating ? 'Locating…' : 'My Location'}
        </button>
      </div>

      {/* Map — explicit pixel height so Leaflet always has a non-zero container */}
      <div style={{ width: '100%', height: mapH, flexShrink: 0, position: 'relative' }}>
        <MapContainer
          key={`${defaultLat}-${defaultLng}`}
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

      {/* Footer */}
      <div style={{ height: FOOTER_H, flexShrink: 0, padding: '12px 16px', background: '#0f172a', borderTop: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          <MapPin size={18} color="#f97316" style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ color: '#e2e8f0', fontSize: 13, lineHeight: 1.4, margin: 0, flex: 1 }}>
            {geocoding
              ? <span style={{ color: '#475569' }}>Getting address…</span>
              : (address || 'Tap the map to select a location')}
          </p>
        </div>
        <button
          onClick={handleConfirm}
          disabled={!address || geocoding}
          style={{ width: '100%', background: !address || geocoding ? '#7c3d1f' : '#f97316', opacity: !address || geocoding ? 0.5 : 1, color: '#fff', fontWeight: 700, borderRadius: 16, padding: '12px 0', border: 'none', cursor: !address || geocoding ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}
        >
          <Check size={16} />
          Confirm Location
        </button>
      </div>

    </div>,
    document.body
  )
}
