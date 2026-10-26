import { Link, Navigate } from 'react-router-dom'
import { STATUS_LABEL } from '../../shared/shop.js'
import { ago, peso } from '../format.js'
import { useStore } from '../store.jsx'

export function Orders() {
  const { user, orders, booting } = useStore()
  if (!booting && !user) return <Navigate to="/login" state={{ from: '/orders' }} replace />
  const list = [...orders].sort((a, b) => b.createdAt - a.createdAt)
  return (
    <div className="stack">
      <h1>Your orders</h1>
      {list.length === 0 && <p className="muted">No deliveries yet. <Link to="/">Order from the menu</Link>.</p>}
      <ul className="orderlist">
        {list.map((order) => (
          <li key={order.id}>
            <Link to={`/orders/${order.id}`}>
              <div>
                <strong>{order.id}</strong>
                <small>{order.items.map((item) => `${item.qty}× ${item.name}`).join(', ')}</small>
              </div>
              <div className="line-end">
                <b>{peso(order.total)}</b>
                <small>{STATUS_LABEL[order.status]} · {ago(order.createdAt)}</small>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
