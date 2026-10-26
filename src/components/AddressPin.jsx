import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function dropIcon() {
  return L.divIcon({
    className: 'map-pin drop',
    html: '<span>You</span>',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

export function AddressPin({ pin, center, onPick, label = 'Map. Tap or drag the pin to the delivery house.' }) {
  const host = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  useEffect(() => {
    const start = pin || center
    if (!host.current || !start) return undefined
    const map = L.map(host.current, { scrollWheelZoom: false }).setView([start.lat, start.lng], pin ? 16 : 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)
    const marker = L.marker([start.lat, start.lng], { icon: dropIcon(), draggable: true }).addTo(map)
    marker.on('dragend', () => {
      const spot = marker.getLatLng()
      onPickRef.current(spot.lat, spot.lng)
    })
    map.on('click', (event) => {
      marker.setLatLng(event.latlng)
      onPickRef.current(event.latlng.lat, event.latlng.lng)
    })
    mapRef.current = map
    markerRef.current = marker
    const frame = requestAnimationFrame(() => map.invalidateSize())
    return () => {
      cancelAnimationFrame(frame)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    const spot = pin || center
    if (!map || !marker || !spot) return
    const next = L.latLng(spot.lat, spot.lng)
    if (marker.getLatLng().distanceTo(next) > 8) {
      marker.setLatLng(next)
      map.panTo(next)
    }
  }, [pin?.lat, pin?.lng, center?.lat, center?.lng])

  return <div ref={host} className="map pinmap" role="application" aria-label={label} />
}
