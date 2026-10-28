import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { SHOP, hoursText, phoneText } from '../../shared/shop.js'
import { useStore } from '../store.jsx'
import { CartDrawer } from './CartPanel.jsx'
import { Logo } from './Logo.jsx'
import { peso } from '../format.js'
import { quote } from '../../shared/shop.js'

const TITLES = {
  '/': 'Menu',
  '/checkout': 'Checkout',
  '/orders': 'Orders',
  '/account': 'Account',
  '/login': 'Sign in',
  '/staff': 'Kitchen',
  '/admin': 'Shop desk',
}

export function Frame() {
  const { user, cart, cartCount, settings, branches, zoneId, setZoneId, logout } = useStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [cartOpen, setCartOpen] = useState(false)
  const ops = location.pathname.startsWith('/staff') || location.pathname.startsWith('/admin')

  useEffect(() => {
    const base = TITLES[location.pathname] || 'Order'
    document.title = `${base} · SolbayTea Malinao`
    setCartOpen(false)
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [location.pathname])

  const zone = settings?.zones.find((entry) => entry.id === zoneId) || settings?.zones[0]
  const totals = settings ? quote({ lines: cart, zone, settings, promoCode: '' }) : null

  return (
    <div className={ops ? 'app ops' : 'app'}>
      <header className="topbar">
        <Link to={ops ? (user?.role === 'admin' ? '/admin' : '/staff') : '/'} className="brandlink" aria-label="SolbayTea home">
          <Logo />
        </Link>
        {!ops && settings && (
          <label className="loc">
            <span>Deliver to</span>
            <select value={zone?.id} onChange={(event) => setZoneId(event.target.value)} aria-label="Delivery barangay">
              {settings.zones.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name} · {peso(entry.fee)}</option>
              ))}
            </select>
          </label>
        )}
        {ops && <span className="rolepill">{user?.role === 'admin' ? 'Admin' : 'Staff'}</span>}
        <div className="grow" />
        {ops ? (
          <nav className="opsnav">
            {user?.role === 'admin' && <NavLink to="/admin">Shop desk</NavLink>}
            <NavLink to="/staff">Kitchen</NavLink>
            <NavLink to="/">Menu</NavLink>
            <button type="button" onClick={() => logout().then(() => navigate('/'))}>Log out</button>
          </nav>
        ) : (
          <nav className="desk">
            <NavLink to="/" end>Menu</NavLink>
            <NavLink to="/orders">Orders</NavLink>
            {user ? (
              <NavLink to="/account">{user.name.split(' ')[0]}</NavLink>
            ) : (
              <NavLink to="/login">Sign in</NavLink>
            )}
          </nav>
        )}
        {!ops && (
          <button className="cartbtn" type="button" onClick={() => setCartOpen(true)} aria-label={`Open cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}>
            <CartIcon />
            <span>Cart</span>
            {cartCount > 0 && <em>{cartCount}</em>}
          </button>
        )}
      </header>
      <main className="main">
        <Outlet />
      </main>
      {!ops && <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />}
      {!ops && cartCount > 0 && totals && (
        <button className="cartbar" type="button" onClick={() => setCartOpen(true)}>
          <span>Cart · {cartCount}</span>
          <strong>{peso(totals.total)}</strong>
        </button>
      )}
      {!ops && (
        <nav className="bottomnav">
          <NavLink to="/" end>Menu</NavLink>
          <NavLink to="/orders">Orders</NavLink>
          <NavLink to={user ? '/account' : '/login'}>{user ? 'Account' : 'Sign in'}</NavLink>
        </nav>
      )}
      <footer className="footer">
        <div>
          {(branches.length ? branches : [{ id: 'malinao', name: SHOP.branch, address: SHOP.address }]).map((branch) => (
            <p key={branch.id}><strong>{SHOP.name} · {branch.name}</strong><br />{branch.address}</p>
          ))}
          <p>{hoursText(settings)} daily · {SHOP.landline} · {phoneText(settings?.phone)}</p>
        </div>
        <div className="footer-links">
          <a href={SHOP.facebook} target="_blank" rel="noreferrer">Facebook page</a>
          <a href={SHOP.facebookPost} target="_blank" rel="noreferrer">Latest post</a>
          <a href={SHOP.maps} target="_blank" rel="noreferrer">Map</a>
        </div>
        <p className="fine">
          Menu prices follow the posted SolbayTea Malinao menu. Delivery fees in this app are sample amounts.
          Confirm today’s cakes and specials with the shop before a large order.
        </p>
      </footer>
    </div>
  )
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M6 6h15l-1.6 9H7.2L6 6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6 6L4.8 3H2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="20" r="1.5" fill="currentColor" />
      <circle cx="17" cy="20" r="1.5" fill="currentColor" />
    </svg>
  )
}
