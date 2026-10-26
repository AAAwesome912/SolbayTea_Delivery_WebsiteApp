import { useState } from 'react'
import { CUSTOMER_STATUS, STATUS_FLOW, STATUS_LABEL } from '../../shared/shop.js'
import { clock, paymentLabel, peso } from '../format.js'
import { useStore } from '../store.jsx'

const CANCEL_REASONS = [
  'Changed my mind',
  'Ordered by mistake',
  'Wrong items',
  'Wrong address',
  'Taking too long',
  'Others',
]

export function Tracker({ order }) {
  if (order.status === 'cancelled') {
    return (
      <div className="alert">
        <strong>Cancelled.</strong> {order.cancelReason}
      </div>
    )
  }
  const index = STATUS_FLOW.indexOf(order.status)
  return (
    <ol className="steps">
      {STATUS_FLOW.map((status, step) => {
        const hit = [...order.timeline].reverse().find((entry) => entry.status === status)
        const state = step < index ? 'done' : step === index ? 'current' : ''
        return (
          <li key={status} className={state}>
            <span />
            <div>
              <strong>{STATUS_LABEL[status]}</strong>
              {hit && <small>{clock(hit.at)} · {hit.by}</small>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function OrderActions({ order }) {
  const { user, updateOrder } = useStore()
  const [reason, setReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (!user || ['delivered', 'cancelled'].includes(order.status)) return null
  const staff = user.role !== 'customer'
  const next = {
    placed: 'accepted',
    accepted: 'preparing',
    preparing: 'ready',
    ready: 'delivering',
    delivering: 'delivered',
  }[order.status]
  const nextLabel = {
    placed: 'Accept order',
    accepted: 'Start preparing',
    preparing: 'Mark ready',
    ready: 'Out for delivery',
    delivering: 'Mark delivered',
  }[order.status]
  const needsPay = staff && order.payment === 'gcash' && order.paymentStatus === 'pending' && order.status !== 'placed'
  const canCancel = order.status === 'placed'
  const cancelText = reason === 'Others' ? otherReason.trim() : reason
  const cancelReady = reason === 'Others' ? cancelText.length >= 3 : reason.length > 0

  async function run(patch) {
    setBusy(true)
    setError('')
    try {
      await updateOrder(order.id, patch)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="actions no-print">
      {staff && order.payment === 'gcash' && order.paymentStatus === 'pending' && (
        <button className="btn primary" type="button" disabled={busy} onClick={() => run({ paymentStatus: 'confirmed' })}>
          Confirm GCash
        </button>
      )}
      {staff && next && !needsPay && (
        <button className="btn primary" type="button" disabled={busy} onClick={() => run({ status: next })}>
          {nextLabel}
        </button>
      )}
      {canCancel && (
        <div className="cancelrow">
          <select value={reason} onChange={(event) => setReason(event.target.value)} aria-label="Reason for cancelling">
            <option value="">Choose a reason</option>
            {CANCEL_REASONS.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
          </select>
          {reason === 'Others' && (
            <input
              value={otherReason}
              onChange={(event) => setOtherReason(event.target.value)}
              placeholder="Type the reason"
              aria-label="Other cancel reason"
              maxLength={140}
            />
          )}
          <button
            className="btn danger"
            type="button"
            disabled={busy || !cancelReady}
            onClick={() => run({ status: 'cancelled', cancelReason: cancelText })}
          >
            Cancel order
          </button>
        </div>
      )}
      {error && <p className="alert">{error}</p>}
    </div>
  )
}

export function OrderSummary({ order }) {
  return (
    <article className="sheet">
      <header className="split">
        <div>
          <p className="eyebrow">{order.id}</p>
          <h2 className="no-print">{CUSTOMER_STATUS[order.status]}</h2>
          <h2 className="print-only">Order slip</h2>
          <p className="muted no-print">{paymentLabel(order)} · ETA {order.eta}</p>
          <p className="muted print-only">{paymentLabel(order)}</p>
          {order.branchName && <p className="muted">{order.branchName} branch{order.branchAddress ? ` · ${order.branchAddress}` : ''}</p>}
        </div>
        <strong className="price">{peso(order.total)}</strong>
      </header>
      <div className="no-print">
        <Tracker order={order} />
      </div>
      <ul className="cartlines">
        {order.items.map((line, index) => (
          <li key={`${line.itemId}-${index}`}>
            <div>
              <strong>{line.qty}× {line.name}</strong>
              {line.optionsLabel && <small>{line.optionsLabel}</small>}
            </div>
            <span>{peso(line.unitPrice * line.qty)}</span>
          </li>
        ))}
      </ul>
      <dl className="totals">
        <div><dt>Subtotal</dt><dd>{peso(order.subtotal)}</dd></div>
        <div><dt>Delivery · {order.barangayName}</dt><dd>{order.deliveryFee ? peso(order.deliveryFee) : 'Free'}</dd></div>
        {order.discount > 0 && <div><dt>Promo {order.promoCode}</dt><dd>−{peso(order.discount)}</dd></div>}
        <div className="grand"><dt>Total</dt><dd>{peso(order.total)}</dd></div>
      </dl>
      <p>
        {order.customerName} · <a href={`tel:${order.phone}`}>{order.phone}</a>
      </p>
      <p>{order.address}{order.landmark ? ` · ${order.landmark}` : ''}, {order.barangayName}, Malinao</p>
      {Number.isFinite(order.dropLat) && <p className="muted no-print">House pin saved for the rider.</p>}
      {order.notes && <p className="muted">Note: {order.notes}</p>}
      <p className="muted">{order.utensils ? 'Utensils included' : 'No utensils'}</p>
      <OrderActions order={order} />
    </article>
  )
}
