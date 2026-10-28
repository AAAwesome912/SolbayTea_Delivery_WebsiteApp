import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { quote } from '../../shared/shop.js'
import { peso } from '../format.js'
import { useStore } from '../store.jsx'

export function Totals({ totals, zone }) {
  return (
    <dl className="totals">
      <div><dt>Subtotal</dt><dd>{peso(totals.subtotal)}</dd></div>
      <div>
        <dt>Delivery · {zone?.name}</dt>
        <dd>{totals.deliveryFee ? peso(totals.deliveryFee) : 'Free'}</dd>
      </div>
      {totals.discount > 0 && (
        <div><dt>Promo</dt><dd>−{peso(totals.discount)}</dd></div>
      )}
      <div className="grand"><dt>Total</dt><dd>{peso(totals.total)}</dd></div>
    </dl>
  )
}

export function CartPanel({ onCheckout, promoCode = '' }) {
  const { cart, setQty, settings, zoneId } = useStore()
  const navigate = useNavigate()
  if (!settings) return null
  const zone = settings.zones.find((entry) => entry.id === zoneId) || settings.zones[0]
  const totals = quote({ lines: cart, zone, settings, promoCode })
  const freeGap = settings.freeDeliveryOver > 0 ? settings.freeDeliveryOver - totals.subtotal : 0

  return (
    <aside className="cart">
      <h2>Your order</h2>
      {cart.length === 0 ? (
        <p className="muted">Your cart is empty. Add milk tea or a rice meal to start a delivery.</p>
      ) : (
        <ul className="cartlines">
          {cart.map((line) => (
            <li key={line.key}>
              <div>
                <strong>{line.qty}× {line.name}</strong>
                {line.optionsLabel && <small>{line.optionsLabel}</small>}
              </div>
                <div className="line-end">
                  <span>{peso(line.unitPrice * line.qty)}</span>
                  <div className="stepper mini">
                    <button type="button" onClick={() => setQty(line.key, line.qty - 1)} aria-label={`Remove one ${line.name}`}>−</button>
                    <span>{line.qty}</span>
                    <button type="button" onClick={() => setQty(line.key, line.qty + 1)} aria-label={`Add another ${line.name}`}>+</button>
                  </div>
                  <button className="remove-line" type="button" onClick={() => setQty(line.key, 0)}>Remove</button>
                </div>
            </li>
          ))}
        </ul>
      )}
      {cart.length > 0 && (
        <>
          {freeGap > 0 && <p className="hint">Add {peso(freeGap)} for free delivery.</p>}
          {totals.minShortfall > 0 && (
            <p className="hint">Add {peso(totals.minShortfall)} to reach the {peso(settings.minOrder)} minimum.</p>
          )}
          <Totals totals={totals} zone={zone} />
          {onCheckout !== false && (
            <button
              className="btn primary block"
              type="button"
              onClick={() => (onCheckout ? onCheckout() : navigate('/checkout'))}
            >
              Checkout · {peso(totals.total)}
            </button>
          )}
        </>
      )}
    </aside>
  )
}

export function CartDrawer({ open, onClose }) {
  const navigate = useNavigate()
  if (!open) return null
  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div className="drawer" role="dialog" aria-modal="true" aria-label="Your order" onClick={(event) => event.stopPropagation()}>
        <button className="iconbtn" type="button" onClick={onClose} aria-label="Close cart">×</button>
        <CartPanel onCheckout={() => { onClose(); navigate('/checkout') }} />
      </div>
    </div>,
    document.body,
  )
}
