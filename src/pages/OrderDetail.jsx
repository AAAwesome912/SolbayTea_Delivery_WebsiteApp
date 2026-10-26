import { Link, useNavigate, useParams } from 'react-router-dom'
import { OrderSummary } from '../components/OrderBits.jsx'
import { RiderMap } from '../components/RiderMap.jsx'
import { useStore } from '../store.jsx'

export function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { orders, user, addToCart, menu, settings } = useStore()
  const order = orders.find((entry) => entry.id === id)
  const zone = settings?.zones.find((entry) => entry.id === order?.barangayId)

  function reorder() {
    if (!order) return
    order.items.forEach((line) => {
      const item = menu.find((entry) => entry.id === line.itemId && entry.available)
      if (item) addToCart(item, line.selection, line.qty)
    })
    navigate('/checkout')
  }

  if (!order) {
    return (
      <div className="stack">
        <h1>Order not found</h1>
        <p className="muted">It may belong to another account, or the shop reset the demo orders.</p>
        <Link to="/orders">Back to orders</Link>
      </div>
    )
  }

  return (
    <div className="stack narrow">
      <Link to={user?.role === 'customer' || !user ? '/orders' : '/staff'} className="back no-print">← Orders</Link>
      <OrderSummary order={order} />
      {zone || Number.isFinite(order.dropLat) ? <div className="no-print"><RiderMap order={order} zone={zone} /></div> : null}
      <div className="row no-print">
        <button className="btn ghost" type="button" onClick={reorder}>Order these again</button>
        <button className="btn ghost" type="button" onClick={() => window.print()}>Print slip</button>
        <a className="btn ghost" href="tel:09099869876">Call the shop</a>
      </div>
    </div>
  )
}
