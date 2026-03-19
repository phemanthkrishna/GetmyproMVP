import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lat, lng } = await req.json()

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return new Response(JSON.stringify({ error: 'lat and lng are required numbers' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Option A: Nominatim (free, no key needed) ──────────────────
    // To switch to Google Maps, set GEOCODE_API_KEY in Supabase Edge
    // Function secrets and uncomment Option B below.
    const apiKey = Deno.env.get('GEOCODE_API_KEY')

    let address = ''

    if (apiKey) {
      // ── Option B: Google Maps Geocoding API ──────────────────────
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      const res = await fetch(url)
      const data = await res.json()
      address = data.results?.[0]?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    } else {
      // ── Option A: Nominatim (OpenStreetMap) ──────────────────────
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'GetMyPro/1.0' },
      })
      const data = await res.json()
      const d = data.address ?? {}
      const parts = [
        d.house_number,
        d.road,
        d.suburb || d.neighbourhood,
        d.city || d.town || d.village,
        d.state,
      ].filter(Boolean)
      address = parts.length ? parts.join(', ') : data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    }

    return new Response(JSON.stringify({ address }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
