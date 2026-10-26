import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { SHOP } from '../../shared/shop.js'

function pin(label, kind) {
  return L.divIcon({
    className: `map-pin ${kind}`,
    html: `<span>${label}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

function branchPoint(order) {
  const lat = Number(order?.branchLat)
  const lng = Number(order?.branchLng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng, name: order.branchName || 'SolbayTea' }
  }
  return { lat: SHOP.lat, lng: SHOP.lng, name: SHOP.branch }
}

export function riderSpot(order, dest) {
  if (!dest || !Number.isFinite(Number(dest.lat)) || !Number.isFinite(Number(dest.lng))) return null
  const shop = branchPoint(order)
  const drop = { lat: Number(dest.lat), lng: Number(dest.lng) }
  if (order.status === 'delivered') return { ...drop, arrived: true }
  if (order.status !== 'delivering') return null
  const started = [...order.timeline].reverse().find((entry) => entry.status === 'delivering')?.at || order.updatedAt
  const progress = Math.min(0.92, Math.max(0.08, (Date.now() - started) / (10 * 60 * 1000)))
  return {
    lat: shop.lat + (drop.lat - shop.lat) * progress,
    lng: shop.lng + (drop.lng - shop.lng) * progress,
    arrived: false,
  }
}

export function RiderMap({ order, zone }) {
  const host = useRef(null)
  const riderRef = useRef(null)
  const orderRef = useRef(order)
  const zoneRef = useRef(zone)
  orderRef.current = order
  zoneRef.current = zone
  const pinned = Number.isFinite(Number(order.dropLat)) && Number.isFinite(Number(order.dropLng))
  const dest = pinned
    ? { lat: Number(order.dropLat), lng: Number(order.dropLng), name: order.address }
    : zone
      ? { lat: Number(zone.lat), lng: Number(zone.lng), name: zone.name }
      : null

  useEffect(() => {
    const area = dest
    if (!host.current || !area) return undefined
    const shopPoint = branchPoint(orderRef.current)
    const shop = [shopPoint.lat, shopPoint.lng]
    const drop = [Number(area.lat), Number(area.lng)]
    const map = L.map(host.current, { scrollWheelZoom: false }).setView(shop, 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)
    L.marker(shop, { icon: pin('Shop', 'shop') }).addTo(map).bindPopup(`SolbayTea ${shopPoint.name}`)
    L.marker(drop, { icon: pin('You', 'drop') }).addTo(map).bindPopup(area.name)
    L.polyline([shop, drop], { color: '#5c3317', weight: 3, dashArray: '7 8' }).addTo(map)
    const rider = L.marker(shop, { icon: pin('Rider', 'rider') }).addTo(map)
    riderRef.current = rider
    map.fitBounds(L.latLngBounds([shop, drop]).pad(0.35))

    function place() {
      const current = zoneRef.current
      const spotDest = Number.isFinite(Number(orderRef.current.dropLat))
        ? { lat: Number(orderRef.current.dropLat), lng: Number(orderRef.current.dropLng) }
        : current
      const spot = riderSpot(orderRef.current, spotDest)
      if (!riderRef.current) return
      if (!spot) {
        riderRef.current.setLatLng(shop)
        return
      }
      riderRef.current.setLatLng([spot.lat, spot.lng])
    }
    place()
    const timer = setInterval(place, 4000)
    const frame = requestAnimationFrame(() => map.invalidateSize())
    return () => {
      clearInterval(timer)
      cancelAnimationFrame(frame)
      map.remove()
      riderRef.current = null
    }
  }, [order.id, zone?.id, order.dropLat, order.dropLng])

  const moving = order.status === 'delivering'
  const arrived = order.status === 'delivered'
  const placeName = pinned ? order.address : order.barangayName
  if (!dest) return null
  return (
    <section className="rider card">
      <h2>Rider locator</h2>
      <p className="muted">
        {moving && `Estimated location on the way to ${placeName}.`}
        {arrived && `The rider has reached ${placeName}.`}
        {!moving && !arrived && 'The rider pin starts moving when the order is on the way.'}
      </p>
      <div ref={host} className="map" role="img" aria-label={`Map from SolbayTea ${branchPoint(order).name} to ${placeName}`} />
      <p className="fine">
        {pinned
          ? 'The house pin is the one the customer saved. The rider position is still an estimate, not a live GPS feed.'
          : 'Estimated route to the barangay. It is not a live GPS feed.'}
      </p>
    </section>
  )
}
