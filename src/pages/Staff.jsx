import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, STATUS_LABEL, manilaDateKey } from '../../shared/shop.js'
import { OrderActions } from '../components/OrderBits.jsx'
import { Thumb } from '../components/Thumb.jsx'
import { ago, paymentLabel, peso } from '../format.js'
import { orderHasGroup } from '../sales.js'
import { useStore } from '../store.jsx'

const LANES = [
  { id: 'active', label: 'Active' },
  { id: 'new', label: 'New' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'road', label: 'On the way' },
  { id: 'history', label: 'History' },
  { id: 'menu', label: 'Menu' },
]

function inLane(order, lane) {
  if (lane === 'new') return order.status === 'placed'
  if (lane === 'kitchen') return ['accepted', 'preparing', 'ready'].includes(order.status)
  if (lane === 'road') return order.status === 'delivering'
  if (lane === 'history') return ['delivered', 'cancelled'].includes(order.status)
  if (lane === 'menu') return false
  return !['delivered', 'cancelled'].includes(order.status)
}

export function Staff() {
  const { orders, menu, setAvailability, user, branches } = useStore()
  const mine = branches.find((entry) => entry.id === user?.branchId)
  const visible = user?.role === 'staff' ? orders.filter((order) => order.branchId === user.branchId) : orders
  const [lane, setLane] = useState('active')
  const [date, setDate] = useState('')
  const [group, setGroup] = useState('all')
  const [error, setError] = useState('')
  const fresh = visible.filter((order) => order.status === 'placed').length
  const list = [...visible]
    .filter((order) => inLane(order, lane))
    .filter((order) => lane !== 'history' || !date || manilaDateKey(order.createdAt) === date)
    .filter((order) => lane !== 'history' || orderHasGroup(order, menu, group))
    .sort((a, b) => b.createdAt - a.createdAt)

  async function toggle(item) {
    setError('')
    try {
      await setAvailability(item.id, !item.available)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="stack">
      <header className="split">
        <div>
          <h1>Kitchen board</h1>
          <p className="muted">
            {mine ? `${mine.name} · ${mine.address}. ` : ''}
            {fresh} new {fresh === 1 ? 'order' : 'orders'} waiting. This board updates every few seconds.
          </p>
        </div>
      </header>
      <div className="cats static">
        {LANES.map((entry) => (
          <button key={entry.id} type="button" className={lane === entry.id ? 'on' : ''} onClick={() => setLane(entry.id)}>
            {entry.label}
            {entry.id === 'new' && fresh > 0 ? ` ${fresh}` : ''}
          </button>
        ))}
      </div>
      {lane === 'history' && (
        <div className="filters">
          <label className="field slim">
            Date
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          {date && <button className="btn small ghost" type="button" onClick={() => setDate('')}>All dates</button>}
          <div className="seg">
            {[['all', 'All'], ['drinks', 'Drinks'], ['food', 'Food']].map(([id, name]) => (
              <button key={id} type="button" className={group === id ? 'on' : ''} onClick={() => setGroup(id)}>{name}</button>
            ))}
          </div>
        </div>
      )}
      {lane === 'menu' ? (
        <ul className="menulist">
          {error && <li className="alert">{error}</li>}
          {menu.map((item) => (
            <li key={item.id}>
              <Thumb item={item} size="sm" />
              <div>
                <strong>{item.name}</strong>
                <small>{CATEGORIES.find((category) => category.id === item.category)?.name} · {peso(item.price)}{item.available ? '' : ' · Sold out'}</small>
              </div>
              <button className="btn small ghost" type="button" onClick={() => toggle(item)}>
                {item.available ? 'Mark sold out' : 'Mark available'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          {list.length === 0 && <p className="muted">{lane === 'history' ? 'No orders match those filters.' : 'No orders in this lane.'}</p>}
          <div className="board">
            {list.map((order) => (
              <article key={order.id} className={`ticket status-${order.status}`}>
                <header className="split">
                  <div>
                    <Link to={`/orders/${order.id}`}><strong>{order.id}</strong></Link>
                    <small>{STATUS_LABEL[order.status]} · {ago(order.createdAt)}</small>
                  </div>
                  <b>{peso(order.total)}</b>
                </header>
                <p>{order.customerName} · <a href={`tel:${order.phone}`}>{order.phone}</a></p>
                <p>{order.address}{order.landmark ? `, ${order.landmark}` : ''}</p>
                <p className="muted">{order.branchName ? `${order.branchName} · ` : ''}{order.barangayName}{Number.isFinite(order.dropLat) ? ' · Pinned house' : ''} · {order.eta} · {paymentLabel(order)}</p>
                <ul>
                  {order.items.map((item, index) => (
                    <li key={`${item.itemId}-${index}`}>
                      {item.qty}× {item.name}
                      {item.optionsLabel ? ` · ${item.optionsLabel}` : ''}
                    </li>
                  ))}
                </ul>
                {order.notes && <p className="hint">Note: {order.notes}</p>}
                <OrderActions order={order} />
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
