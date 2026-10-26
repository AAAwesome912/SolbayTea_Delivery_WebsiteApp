import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { kmBetween, orderBlock, orderingOpen, phoneText, quote } from '../../shared/shop.js'
import { AddressPin } from '../components/AddressPin.jsx'
import { Totals } from '../components/CartPanel.jsx'
import { peso } from '../format.js'
import { useStore } from '../store.jsx'

export function Checkout() {
  const { cart, settings, zoneId, setZoneId, branches, branchId, setBranchId, user, placeOrder, setQty } = useStore()
  const navigate = useNavigate()
  const [barangayId, setBarangayId] = useState(user?.barangayId || zoneId)
  const [address, setAddress] = useState(user?.address || '')
  const [landmark, setLandmark] = useState(user?.landmark || '')
  const [pin, setPin] = useState(() => (
    Number.isFinite(user?.pinLat) && Number.isFinite(user?.pinLng) ? { lat: user.pinLat, lng: user.pinLng } : null
  ))
  const [phone, setPhone] = useState(user?.phone || '')
  const [notes, setNotes] = useState('')
  const [utensils, setUtensils] = useState(true)
  const [payment, setPayment] = useState('cod')
  const [promoCode, setPromoCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (pin || !Number.isFinite(user?.pinLat) || !Number.isFinite(user?.pinLng)) return
    setPin({ lat: user.pinLat, lng: user.pinLng })
  }, [user, pin])

  if (!settings) return null
  const zone = settings.zones.find((entry) => entry.id === barangayId) || settings.zones[0]
  const branch = branches.find((entry) => entry.id === branchId) || branches[0]
  const totals = quote({ lines: cart, zone, settings, promoCode })
  const open = orderingOpen(settings)
  const phoneOk = /^09\d{9}$/.test(phone)
  const far = pin && zone && kmBetween(pin, zone) > 4
  const held = orderBlock(user)
  const blocked = !open || !!held || cart.length === 0 || address.trim().length < 8 || !pin || !phoneOk || totals.minShortfall > 0 || !!totals.promoError || user?.role !== 'customer'

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (user?.role !== 'customer') {
      setError('Sign in with a customer account to place a delivery.')
      return
    }
    setBusy(true)
    try {
      const order = await placeOrder({
        barangayId,
        address,
        landmark,
        pin,
        branchId: branch?.id,
        phone,
        notes,
        utensils,
        payment,
        promoCode,
        items: cart.map((line) => ({ itemId: line.itemId, ...line.selection, qty: line.qty })),
      })
      navigate(`/orders/${order.id}`, { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="checkout">
      <div>
        <h1>Checkout</h1>
        <p className="muted">From {branch?.name || 'SolbayTea'}{branch?.address ? ` · ${branch.address}` : ''}. {zone.eta} to {zone.name}.</p>
        {branches.length > 1 && (
          <label className="field">
            Branch
            <select value={branch?.id || ''} onChange={(event) => setBranchId(event.target.value)}>
              {branches.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </select>
          </label>
        )}
        {cart.length === 0 && (
          <p className="alert">Your cart is empty. <Link to="/">Back to the menu</Link></p>
        )}
        {!user && (
          <p className="alert">
            <Link to="/login" state={{ from: '/checkout' }}>Sign in</Link> or create a customer account to place this order.
          </p>
        )}
        {user && user.role !== 'customer' && (
          <p className="alert">This desk is for {user.role}. Log out and use a customer account to order.</p>
        )}
        <form onSubmit={submit}>
          <label className="field">
            Barangay
            <select value={barangayId} onChange={(event) => { setBarangayId(event.target.value); setZoneId(event.target.value) }}>
              {settings.zones.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name} · {peso(entry.fee)} · {entry.eta}</option>
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
          <div className="field">
            <span>House pin</span>
            <AddressPin pin={pin} center={zone} onPick={(lat, lng) => setPin({ lat, lng })} />
            <p className="fine">{pin ? 'Pin set for this delivery. Drag it if the house is somewhere else.' : 'Tap the map to drop a pin on the house.'}</p>
            {far && <p className="hint">This pin is outside {zone.name}. Choose the barangay that matches the house so the delivery fee is right.</p>}
          </div>
          <label className="field">
            Mobile number
            <input value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 11))} inputMode="numeric" placeholder="09XXXXXXXXX" required />
          </label>
          <label className="field">
            Notes for the rider
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={180} rows={3} />
          </label>
          <label className="check">
            <input type="checkbox" checked={utensils} onChange={(event) => setUtensils(event.target.checked)} />
            Include utensils
          </label>
          <fieldset className="pay">
            <legend>Payment</legend>
            <label className={payment === 'cod' ? 'paycard on' : 'paycard'}>
              <input type="radio" name="pay" checked={payment === 'cod'} onChange={() => setPayment('cod')} />
              <span>
                <strong>Cash on delivery</strong>
                <small>Pay the rider when the order arrives.</small>
              </span>
            </label>
            <label className={payment === 'gcash' ? 'paycard on' : 'paycard'}>
              <input type="radio" name="pay" checked={payment === 'gcash'} onChange={() => setPayment('gcash')} />
              <span>
                <strong>GCash</strong>
                <small>Send to {phoneText(settings.phone)} and use the order number as the reference. The shop confirms it before cooking.</small>
              </span>
            </label>
          </fieldset>
          <label className="field">
            Promo code
            <input value={promoCode} onChange={(event) => setPromoCode(event.target.value.toUpperCase())} placeholder={settings.promo.code} />
          </label>
          {totals.promoError && promoCode && <p className="alert">{totals.promoError}</p>}
          {totals.minShortfall > 0 && (
            <p className="hint">Add {peso(totals.minShortfall)} more to reach the {peso(settings.minOrder)} minimum.</p>
          )}
          {held && <p className="alert">{held}</p>}
          {error && <p className="alert">{error}</p>}
          <button className="btn primary block" type="submit" disabled={blocked || busy}>
            {busy ? 'Placing order…' : `Place order · ${peso(totals.total)}`}
          </button>
        </form>
      </div>
      <div className="sidecart">
        <aside className="cart">
          <h2>Summary</h2>
          <ul className="cartlines">
            {cart.map((line) => (
              <li key={line.key}>
                <div>
                  <strong>{line.qty}× {line.name}</strong>
                  {line.optionsLabel && <small>{line.optionsLabel}</small>}
                </div>
                <div className="line-end">
                  <span>{peso(line.unitPrice * line.qty)}</span>
                  <button className="remove-line" type="button" onClick={() => setQty(line.key, 0)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
          <Totals totals={totals} zone={zone} />
        </aside>
      </div>
    </div>
  )
}
