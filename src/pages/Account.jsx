import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { kmBetween, orderBlock, phoneText } from '../../shared/shop.js'
import { AddressPin } from '../components/AddressPin.jsx'
import { peso } from '../format.js'
import { useStore } from '../store.jsx'

export function Account() {
  const { user, logout } = useStore()
  const navigate = useNavigate()
  if (!user) {
    return (
      <div className="stack">
        <h1>Account</h1>
        <p className="muted">Sign in to track deliveries and save your address.</p>
        <Link className="btn primary" to="/login">Sign in</Link>
      </div>
    )
  }
  return (
    <div className="stack narrow">
      <h1>{user.name}</h1>
      <p className="muted">{user.email}</p>
      <dl className="totals">
        <div><dt>Role</dt><dd>{user.role}</dd></div>
        <div><dt>Mobile</dt><dd>{user.phone ? phoneText(user.phone) : '—'}</dd></div>
      </dl>
      {orderBlock(user) && <p className="alert">{orderBlock(user)}</p>}
      {user.dataConsentAt && (
        <p className="fine">
          You agreed on {new Date(user.dataConsentAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })} that SolbayTea may use your name, mobile, email, address, and orders for delivery and shop records.
        </p>
      )}
      {user.role === 'customer' ? <AddressForm user={user} /> : (
        <p className="muted">{user.address ? `${user.address}, ${user.barangayId}` : 'No delivery address on this desk.'}</p>
      )}
      {user.role === 'admin' && <Link className="btn" to="/admin">Open shop desk</Link>}
      {user.role !== 'customer' && <Link className="btn" to="/staff">Open kitchen board</Link>}
      <Link className="btn ghost" to="/orders">Order history</Link>
      <button className="btn danger" type="button" onClick={() => logout().then(() => navigate('/'))}>Log out</button>
    </div>
  )
}

function AddressForm({ user }) {
  const { settings, saveAddress, setZoneId } = useStore()
  const savedPin = Number.isFinite(user.pinLat) && Number.isFinite(user.pinLng)
    ? { lat: user.pinLat, lng: user.pinLng }
    : null
  const [barangayId, setBarangayId] = useState(user.barangayId || settings?.zones[0]?.id || '')
  const [address, setAddress] = useState(user.address || '')
  const [landmark, setLandmark] = useState(user.landmark || '')
  const [pin, setPin] = useState(savedPin)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const zone = settings?.zones.find((entry) => entry.id === barangayId) || settings?.zones[0]
  const far = pin && zone && kmBetween(pin, zone) > 4

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSaved(false)
    setBusy(true)
    try {
      await saveAddress({ barangayId, address, landmark, pin })
      setZoneId(barangayId)
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!settings || !zone) return null
  return (
    <form className="card stack" onSubmit={submit}>
      <h2>Pinned address</h2>
      <p className="muted">Tap the map or drag the pin onto the house. Checkout uses this spot for the rider.</p>
      <label className="field">
        Barangay
        <select value={barangayId} onChange={(event) => setBarangayId(event.target.value)}>
          {settings.zones.map((entry) => (
            <option key={entry.id} value={entry.id}>{entry.name} · {peso(entry.fee)}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Street address
        <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="House no., street, purok" required />
      </label>
      <label className="field">
        Landmark
        <input value={landmark} onChange={(event) => setLandmark(event.target.value)} placeholder="Near the plaza, blue gate…" />
      </label>
      <AddressPin pin={pin} center={zone} onPick={(lat, lng) => setPin({ lat, lng })} />
      <p className="fine">{pin ? 'Pin set. Drag it if the house is somewhere else.' : 'Tap the map to drop your pin.'}</p>
      {far && <p className="hint">This pin is outside {zone.name}. Choose the barangay that matches the house so the delivery fee is right.</p>}
      {error && <p className="alert">{error}</p>}
      {saved && <p className="hint">Pinned address saved.</p>}
      <button className="btn primary" type="submit" disabled={busy || !pin || address.trim().length < 8}>
        {busy ? 'Saving…' : 'Save pinned address'}
      </button>
    </form>
  )
}
