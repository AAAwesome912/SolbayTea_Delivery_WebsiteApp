import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Frame } from './components/Frame.jsx'
import { Account } from './pages/Account.jsx'
import { Admin } from './pages/Admin.jsx'
import { Checkout } from './pages/Checkout.jsx'
import { Login } from './pages/Login.jsx'
import { OrderDetail } from './pages/OrderDetail.jsx'
import { Orders } from './pages/Orders.jsx'
import { Shop } from './pages/Shop.jsx'
import { Staff } from './pages/Staff.jsx'
import { useStore } from './store.jsx'

function Guard({ roles, children }) {
  const { user, booting } = useStore()
  const location = useLocation()
  if (booting) return null
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (!roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function Boot() {
  const { booting, offline, bootError } = useStore()
  if (!booting && !offline) return null
  return (
    <div className="boot">
      <h1>SolbayTea</h1>
      {offline ? (
        <>
          <p>{bootError || 'The shop server is not responding.'}</p>
          <p>Start it from the project folder with <code>npm run dev</code>, then refresh.</p>
        </>
      ) : (
        <p>Loading the Malinao menu…</p>
      )}
    </div>
  )
}

export default function App() {
  const { booting, offline } = useStore()
  if (booting || offline) return <Boot />
  return (
    <Routes>
      <Route element={<Frame />}>
        <Route index element={<Shop />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="account" element={<Account />} />
        <Route path="login" element={<Login />} />
        <Route path="staff" element={<Guard roles={['staff', 'admin']}><Staff /></Guard>} />
        <Route path="admin" element={<Guard roles={['admin']}><Admin /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
