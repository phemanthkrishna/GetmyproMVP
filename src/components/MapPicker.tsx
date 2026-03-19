import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useJsApiLoader, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api'
import { MapPin, Crosshair, X, Check, Search } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
const LIBRARIES: ('places')[] = ['places']

const darkStyles = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#2b2b2b' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
]

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

const HEADER_H = 56
const SEARCH_H = 56
const FOOTER_H = 292

const pinIcon = (color: string, size: number) =>
  `data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" fill="${encodeURIComponent(color)}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`

export function MapPicker({ initialLat, initialLng, onConfirm, onClose }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const C = {
    bg:        isDark ? '#09090B'  : '#FAFAFA',
    surface:   isDark ? '#131316'  : '#FFFFFF',
    border:    isDark ? '#27272A'  : '#E4E4E7',
    text:      isDark ? '#FAFAFA'  : '#09090B',
    muted:     isDark ? '#A1A1AA'  : '#71717A',
    subtle:    isDark ? '#A1A1AA'  : '#A1A1AA',
    btnBg:     isDark ? '#1C1C1F'  : '#F4F4F5',
    btnBorder: isDark ? '#27272A'  : '#D4D4D8',
    btnText:   isDark ? '#A1A1AA'  : '#52525B',
    addrText:  isDark ? '#FAFAFA'  : '#27272A',
    loadingBg: isDark ? '#131316'  : '#F4F4F5',
  }

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: MAPS_KEY,
    libraries: LIBRARIES,
  })

  const defaultLat = initialLat ?? 12.9716
  const defaultLng = initialLng ?? 77.5946

  // Stable reference — never recreated on re-renders.
  // If we pass a new object every render, @react-google-maps/api's center
  // useEffect fires on every re-render and panTo() resets the map position,
  // undoing any imperative panTo/setZoom calls (e.g. My Location, autocomplete).
  const initialCenter = useRef<LatLng>({ lat: defaultLat, lng: defaultLng })

  const [pin, setPin] = useState<LatLng>({ lat: defaultLat, lng: defaultLng })
  const [address, setAddress] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [locating, setLocating] = useState(false)
  const [apartmentName, setApartmentName] = useState('')
  const [streetName, setStreetName] = useState('')
  const [flatNo, setFlatNo] = useState('')
  const [floorNo, setFloorNo] = useState('')
  const mapRef = useRef<google.maps.Map | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  useEffect(() => {
    setGeocoding(true)
    reverseGeocode(pin.lat, pin.lng).then(addr => { setAddress(addr); setGeocoding(false) })
  }, [pin.lat, pin.lng])

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) setPin({ lat: e.latLng.lat(), lng: e.latLng.lng() })
  }, [])

  const onAutocompleteLoad = useCallback((ac: google.maps.places.Autocomplete) => {
    autocompleteRef.current = ac
  }, [])

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (!place?.geometry?.location) return
    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    setPin({ lat, lng })
    mapRef.current?.panTo({ lat, lng })
    mapRef.current?.setZoom(17)
    if (place.formatted_address) setAddress(place.formatted_address)
    if (place.geometry?.viewport) mapRef.current?.fitBounds(place.geometry.viewport)
  }, [])

  function handleMyLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setPin(loc)
        mapRef.current?.panTo(loc)
        mapRef.current?.setZoom(17)
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  function handleConfirm() {
    if (!address) return
    const details = [
      apartmentName,
      flatNo && `Flat ${flatNo}`,
      floorNo && `Floor ${floorNo}`,
      streetName,
    ].filter(Boolean).join(', ')
    const fullAddress = details ? `${details}, ${address}` : address
    onConfirm(pin.lat, pin.lng, fullAddress)
  }

  const mapH = `calc(100dvh - ${HEADER_H}px - ${SEARCH_H}px - ${FOOTER_H}px)`

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998, display: 'flex', flexDirection: 'column', background: C.bg }}>

      {/* Header */}
      <div style={{ height: HEADER_H, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={onClose} style={{ color: C.subtle, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <X size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 14, margin: 0 }}>Pick your location</p>
          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Search or tap the map</p>
        </div>
        <button
          onClick={handleMyLocation}
          disabled={locating}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.btnBg, border: `1px solid ${C.btnBorder}`, borderRadius: 12, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: C.btnText, cursor: 'pointer', opacity: locating ? 0.6 : 1 }}
        >
          <Crosshair size={13} />
          {locating ? 'Locating…' : 'My Location'}
        </button>
      </div>

      {/* Search bar */}
      <div style={{ height: SEARCH_H, flexShrink: 0, padding: '8px 16px', background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Search size={16} color={C.subtle} style={{ flexShrink: 0 }} />
        {isLoaded ? (
          <Autocomplete
            onLoad={onAutocompleteLoad}
            onPlaceChanged={onPlaceChanged}
            options={{ componentRestrictions: { country: 'in' } }}
          >
            <input
              type="text"
              placeholder="Search for a place or area…"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: C.text,
                fontSize: 14,
                fontFamily: 'inherit',
              }}
            />
          </Autocomplete>
        ) : (
          <input
            type="text"
            placeholder="Loading search…"
            disabled
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: C.subtle, fontSize: 14, fontFamily: 'inherit' }}
          />
        )}
      </div>

      {/* Map */}
      <div style={{ width: '100%', height: mapH, flexShrink: 0 }}>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={initialCenter.current}
            zoom={15}
            onClick={handleMapClick}
            onLoad={onMapLoad}
            options={{ disableDefaultUI: true, zoomControl: true, styles: isDark ? darkStyles : [] }}
          >
            <Marker
              position={pin}
              icon={{
                url: pinIcon('#f97316', 36),
                scaledSize: new window.google.maps.Size(36, 36),
                anchor: new window.google.maps.Point(18, 36),
              }}
            />
          </GoogleMap>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.loadingBg, color: C.subtle, fontSize: 14 }}>
            Loading map…
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ height: FOOTER_H, flexShrink: 0, padding: '12px 16px', background: C.surface, borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Reverse-geocoded street address */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <MapPin size={16} color="#f97316" style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ color: C.addrText, fontSize: 12, lineHeight: 1.4, margin: 0, flex: 1 }}>
            {geocoding
              ? <span style={{ color: C.muted }}>Getting address…</span>
              : (address || 'Tap the map to select a location')}
          </p>
        </div>
        {/* Address detail inputs */}
        <input
          placeholder="Apartment / Building name (e.g. Sunrise Towers)"
          value={apartmentName}
          onChange={e => setApartmentName(e.target.value)}
          style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '7px 10px', color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
        <input
          placeholder="Street name (e.g. MG Road)"
          value={streetName}
          onChange={e => setStreetName(e.target.value)}
          style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '7px 10px', color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Flat / Unit no."
            value={flatNo}
            onChange={e => setFlatNo(e.target.value)}
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '7px 10px', color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
          />
          <input
            placeholder="Floor no."
            value={floorNo}
            onChange={e => setFloorNo(e.target.value)}
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '7px 10px', color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
        <button
          onClick={handleConfirm}
          disabled={!address || geocoding}
          style={{ width: '100%', background: '#f97316', opacity: !address || geocoding ? 0.4 : 1, color: '#fff', fontWeight: 700, borderRadius: 16, padding: '11px 0', border: 'none', cursor: !address || geocoding ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}
        >
          <Check size={16} />
          Confirm Location
        </button>
      </div>

    </div>,
    document.body
  )
}
