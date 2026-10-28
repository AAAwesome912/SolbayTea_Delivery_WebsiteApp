import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, SHOP, STATUS_LABEL, hoursText, orderBlock, orderingOpen, withinPostedHours } from '../../shared/shop.js'
import { ItemDialog } from '../components/ItemDialog.jsx'
import { CartPanel } from '../components/CartPanel.jsx'
import { Thumb } from '../components/Thumb.jsx'
import { peso } from '../format.js'
import { useStore } from '../store.jsx'

function needsDialog(item) {
  return item.sugar || item.ice || item.spice || item.sizes?.length > 0 || item.addons?.length > 0
}

export function Shop() {
  const { menu, settings, zoneId, branchId, branches, setBranchId, user, orders, addToCart } = useStore()
  const [query, setQuery] = useState('')
  const [catQuery, setCatQuery] = useState('')
  const [active, setActive] = useState('popular')
  const [dialog, setDialog] = useState(null)
  const open = settings ? orderingOpen(settings) : false
  const held = orderBlock(user)
  const canOrder = open && !held
  const zone = settings?.zones.find((entry) => entry.id === zoneId) || settings?.zones[0]
  const branch = branches.find((entry) => entry.id === branchId) || branches[0]
  const q = query.trim().toLowerCase()

  const visible = useMemo(() => menu.filter((item) => {
    if (!q) return true
    return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
  }), [menu, q])

  const groups = CATEGORIES.map((category) => ({
    ...category,
    items: visible.filter((item) => item.category === category.id),
  })).filter((group) => group.items.length)

  const popular = visible.filter((item) => item.popular)
  const catQ = catQuery.trim().toLowerCase()
  const catOptions = useMemo(() => {
    const list = []
    if (!q && popular.length > 0) list.push({ id: 'popular', name: 'Popular' })
    groups.forEach((group) => list.push({ id: group.id, name: group.name }))
    if (!catQ) return list
    return list.filter((entry) => entry.name.toLowerCase().includes(catQ))
  }, [groups, popular.length, q, catQ])
  const live = user?.role === 'customer'
    ? orders.find((order) => !['delivered', 'cancelled'].includes(order.status))
    : null

  useEffect(() => {
    const nodes = [...document.querySelectorAll('[data-section]')]
    if (!nodes.length) return undefined
    const observer = new IntersectionObserver((entries) => {
      const hit = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (hit) setActive(hit.target.dataset.section)
    }, { rootMargin: '-35% 0px -50% 0px', threshold: 0.2 })
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [q, menu])

  function jump(id) {
    setActive(id)
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function pickCategory(id) {
    jump(id)
    setCatQuery('')
  }

  function onCatChange(event) {
    const value = event.target.value
    setCatQuery(value)
    const needle = value.trim().toLowerCase()
    if (!needle) return
    const exact = (!q && popular.length > 0 && needle === 'popular')
      ? { id: 'popular' }
      : groups.find((group) => group.name.toLowerCase() === needle)
    if (exact) pickCategory(exact.id)
  }

  function onCatKey(event) {
    if (event.key !== 'Enter' || !catOptions.length) return
    event.preventDefault()
    pickCategory(catOptions[0].id)
  }

  function add(item, event) {
    event.stopPropagation()
    if (!item.available || !canOrder) return
    if (needsDialog(item)) setDialog(item)
    else addToCart(item, { qty: 1 }, 1)
  }

  return (
    <div className="shop-grid">
      <div>
        {user && user.role !== 'customer' && (
          <p className="rolestrip">
            You are signed in as {user.role}.{' '}
            <Link to={user.role === 'admin' ? '/admin' : '/staff'}>Open the {user.role} desk</Link>
          </p>
        )}
        {live && (
          <Link className="live" to={`/orders/${live.id}`}>
            <span>
              <strong>{live.id} is {STATUS_LABEL[live.status] || live.status}</strong>
              <small>See where this order is</small>
            </span>
            <span className="track">Track order</span>
          </Link>
        )}
        <section className="shophead">
          <p className="eyebrow">{SHOP.cuisines.join(' · ')}</p>
          <h1>{SHOP.name}</h1>
          <p className="tag">{SHOP.tagline}</p>
          <p className="slogan">{SHOP.slogan}</p>
          <div className="chips">
            <span className={open ? 'badge on' : 'badge off'}>{open ? 'Accepting orders' : 'Orders paused'}</span>
            <span>★ {SHOP.rating}</span>
            <span>{zone?.eta}</span>
            <span>From {peso(zone?.fee || 0)} delivery</span>
            <span>Min {peso(settings?.minOrder || 0)}</span>
          </div>
          <p className="hours">{branch ? `${branch.name} · ${branch.address}` : SHOP.address} · {hoursText(settings)}</p>
          {branches.length > 1 && (
            <label className="field">
              Ordering from
              <select value={branch?.id || ''} onChange={(event) => setBranchId(event.target.value)} aria-label="SolbayTea branch">
                {branches.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select>
            </label>
          )}
          {settings?.openOverride && !withinPostedHours(settings) && open && (
            <p className="hours">Outside the posted hours ({hoursText(settings)}), ordering is still open.</p>
          )}
        </section>

        {settings?.announcement && <p className="announce">{settings.announcement}</p>}
        {held && <p className="alert">{held}</p>}
        {!open && !held && <p className="alert">The shop is not accepting delivery orders right now. You can still browse the menu.</p>}

        <div className="menu-tools">
          <label className="search">
            <span className="sr">Search the menu</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search milk tea, sisig, pizza…"
            />
          </label>

          <label className="search cat-find">
            <span className="sr">Find a category</span>
            <input
              value={catQuery}
              onChange={onCatChange}
              onKeyDown={onCatKey}
              placeholder="Type a category… burgers, set meals, batchoy"
              list="menu-category-list"
              autoComplete="off"
            />
            <datalist id="menu-category-list">
              {catOptions.map((entry) => <option key={entry.id} value={entry.name} />)}
            </datalist>
          </label>

          <div className="cats">
            {catOptions.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={active === entry.id ? 'on' : ''}
                onClick={() => pickCategory(entry.id)}
              >
                {entry.name}
              </button>
            ))}
            {catQ && catOptions.length === 0 && (
              <span className="muted cat-empty">No category matches “{catQuery.trim()}”.</span>
            )}
          </div>
        </div>

        {!q && popular.length > 0 && (
          <section id="cat-popular" data-section="popular" className="section">
            <h2>Popular</h2>
            {popular.map((item) => (
              <MenuRow key={item.id} item={item} open={canOrder} onOpen={() => item.available && canOrder && setDialog(item)} onAdd={add} />
            ))}
          </section>
        )}

        {groups.map((group) => (
          <section key={group.id} id={`cat-${group.id}`} data-section={group.id} className="section">
            <h2>{group.name}</h2>
            {group.items.map((item) => (
              <MenuRow key={item.id} item={item} open={canOrder} onOpen={() => item.available && canOrder && setDialog(item)} onAdd={add} />
            ))}
          </section>
        ))}

        {groups.length === 0 && <p className="muted">Nothing on the menu matches that search.</p>}
      </div>
      <div className="sidecart">
        <CartPanel />
      </div>
      {dialog && <ItemDialog item={dialog} onClose={() => setDialog(null)} />}
    </div>
  )
}

function MenuRow({ item, open, onOpen, onAdd }) {
  return (
    <div className={item.available ? 'item' : 'item sold'}>
      <Thumb item={item} />
      <div className="info" onClick={onOpen} onKeyDown={(event) => { if (event.key === 'Enter') onOpen() }} role="button" tabIndex={0}>
        <h3>{item.name}</h3>
        {item.description && <p>{item.description}</p>}
        <strong className="price">{peso(item.price)}{item.sizes?.length > 1 ? '+' : ''}</strong>
      </div>
      {item.available ? (
        <button className="add" type="button" disabled={!open} onClick={(event) => onAdd(item, event)} aria-label={`Add ${item.name}`}>
          +
        </button>
      ) : (
        <span className="soldtag">Sold out</span>
      )}
    </div>
  )
}
