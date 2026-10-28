import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { CATEGORIES, SHOP, hoursText, manilaDateKey, phoneText } from '../../shared/shop.js'
import { ago, paymentLabel, peso } from '../format.js'
import { inPeriod, matchingAmount } from '../sales.js'
import { AddressPin } from '../components/AddressPin.jsx'
import { Thumb, readMenuPhoto } from '../components/Thumb.jsx'
import { useStore } from '../store.jsx'

const TABS = ['Overview', 'Orders', 'Menu', 'Team', 'Settings']

export function Admin() {
  const { orders, menu, directory, settings, branches, user } = useStore()
  const [tab, setTab] = useState('Overview')
  const mine = branches.find((entry) => entry.id === user?.branchId)
  return (
    <div className="stack">
      <header className="split">
        <div>
          <h1>Shop desk</h1>
          <p className="muted">{mine ? `${mine.name} · ${mine.address}` : 'SolbayTea'} · {phoneText(settings?.phone)}</p>
        </div>
      </header>
      <div className="cats static">
        {TABS.map((entry) => (
          <button key={entry} type="button" className={tab === entry ? 'on' : ''} onClick={() => setTab(entry)}>{entry}</button>
        ))}
      </div>
      {tab === 'Overview' && <Overview orders={orders} menu={menu} />}
      {tab === 'Orders' && <OrderTable orders={orders} />}
      {tab === 'Menu' && <MenuEditor menu={menu} />}
      {tab === 'Team' && <Team directory={directory} branches={branches} user={user} />}
      {tab === 'Settings' && <SettingsForm settings={settings} />}
    </div>
  )
}

function Overview({ orders, menu }) {
  const today = manilaDateKey()
  const [period, setPeriod] = useState('month')
  const [day, setDay] = useState(today)
  const [month, setMonth] = useState(today.slice(0, 7))
  const [year, setYear] = useState(today.slice(0, 4))
  const [group, setGroup] = useState('all')
  const value = period === 'day' ? day : period === 'month' ? month : year
  const matched = orders.filter((order) => order.status !== 'cancelled' && inPeriod(order.createdAt, period, value))
  const sales = matched.reduce((sum, order) => sum + matchingAmount(order, menu, group), 0)
  const drinkSales = matched.reduce((sum, order) => sum + matchingAmount(order, menu, 'drinks'), 0)
  const foodSales = matched.reduce((sum, order) => sum + matchingAmount(order, menu, 'food'), 0)
  const bars = useMemo(() => {
    if (period === 'day') return []
    if (period === 'year') {
      return Array.from({ length: 12 }, (_, index) => {
        const key = `${year}-${String(index + 1).padStart(2, '0')}`
        const sum = orders
          .filter((order) => order.status !== 'cancelled' && inPeriod(order.createdAt, 'month', key))
          .reduce((total, order) => total + matchingAmount(order, menu, group), 0)
        return { label: new Date(`${key}-02`).toLocaleDateString('en-PH', { month: 'short' }), sum }
      })
    }
    const [y, m] = month.split('-').map(Number)
    const days = new Date(y, m, 0).getDate()
    return Array.from({ length: days }, (_, index) => {
      const key = `${month}-${String(index + 1).padStart(2, '0')}`
      const sum = orders
        .filter((order) => order.status !== 'cancelled' && inPeriod(order.createdAt, 'day', key))
        .reduce((total, order) => total + matchingAmount(order, menu, group), 0)
      return { label: String(index + 1), sum }
    })
  }, [orders, menu, period, month, year, group])
  const max = Math.max(...bars.map((bar) => bar.sum), 1)
  const label = group === 'drinks' ? 'Drink sales' : group === 'food' ? 'Food sales' : 'Sales'
  return (
    <>
      <div className="filters">
        <div className="seg">
          {['day', 'month', 'year'].map((entry) => (
            <button key={entry} type="button" className={period === entry ? 'on' : ''} onClick={() => setPeriod(entry)}>
              {entry[0].toUpperCase() + entry.slice(1)}
            </button>
          ))}
        </div>
        {period === 'day' && <input type="date" value={day} onChange={(event) => setDay(event.target.value)} aria-label="Sales date" />}
        {period === 'month' && <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Sales month" />}
        {period === 'year' && (
          <input type="number" min="2020" max="2100" value={year} onChange={(event) => setYear(event.target.value)} aria-label="Sales year" />
        )}
        <div className="seg">
          {[['all', 'All'], ['drinks', 'Drinks'], ['food', 'Food']].map(([id, name]) => (
            <button key={id} type="button" className={group === id ? 'on' : ''} onClick={() => setGroup(id)}>{name}</button>
          ))}
        </div>
      </div>
      <div className="stats">
        <article><span>{label}</span><strong>{peso(sales)}</strong></article>
        <article><span>Drinks</span><strong>{peso(drinkSales)}</strong></article>
        <article><span>Food</span><strong>{peso(foodSales)}</strong></article>
        <article><span>Orders</span><strong>{matched.length}</strong></article>
      </div>
      {bars.length > 0 && (
        <section className="card">
          <h2>{period === 'year' ? year : month}</h2>
          <div className="bars scroll">
            {bars.map((bar) => (
              <div key={bar.label}>
                <div className="bar" style={{ height: `${Math.max(8, (bar.sum / max) * 120)}px` }} />
                <small>{bar.label}</small>
              </div>
            ))}
          </div>
        </section>
      )}
      <OrderTable orders={matched.sort((a, b) => b.createdAt - a.createdAt)} />
    </>
  )
}

function OrderTable({ orders }) {
  const list = [...orders].sort((a, b) => b.createdAt - a.createdAt)
  return (
    <div className="tablewrap card">
      <table>
        <thead>
          <tr><th>Order</th><th>Branch</th><th>Customer</th><th>Area</th><th>Payment</th><th>Status</th><th>Total</th></tr>
        </thead>
        <tbody>
          {list.map((order) => (
            <tr key={order.id}>
              <td><Link to={`/orders/${order.id}`}>{order.id}</Link><small>{ago(order.createdAt)}</small></td>
              <td>{order.branchName || 'Malinao'}</td>
              <td>{order.customerName}<small>{order.phone}</small></td>
              <td>{order.barangayName}</td>
              <td>{paymentLabel(order)}</td>
              <td>{order.status}</td>
              <td>{peso(order.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const EMPTY_ITEM = {
  name: '',
  description: '',
  price: '',
  emoji: '🧋',
  image: '',
  category: 'classic',
  kind: 'drink',
  popular: false,
  available: true,
  spice: false,
  extraRice: false,
}

const EMOJIS = ['🧋', '🥤', '☕', '🍋', '🍪', '🍔', '🍕', '🍜', '🍗', '🥩', '🍳', '🍟', '🥗', '🧀', '🎉']

function MenuEditor({ menu }) {
  const { saveMenuItem, deleteMenuItem } = useStore()
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('')
  const shown = menu.filter((item) => {
    const text = filter.trim().toLowerCase()
    if (!text) return true
    const category = CATEGORIES.find((entry) => entry.id === item.category)?.name || ''
    return item.name.toLowerCase().includes(text)
      || item.description.toLowerCase().includes(text)
      || category.toLowerCase().includes(text)
  })

  function edit(item) {
    setError('')
    setDraft({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      emoji: item.emoji,
      image: item.image || '',
      category: item.category,
      kind: item.kind,
      popular: item.popular,
      available: item.available,
      spice: item.spice,
      extraRice: item.addons?.some((addon) => addon.id === 'rice'),
    })
  }

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await saveMenuItem(draft)
      setDraft(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function toggle(item) {
    setError('')
    try {
      await saveMenuItem({ ...item, available: !item.available })
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove(item) {
    if (!window.confirm(`Remove ${item.name} from the menu?`)) return
    try {
      await deleteMenuItem(item.id)
    } catch (err) {
      setError(err.message)
    }
  }

  async function choosePhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const image = await readMenuPhoto(file)
      setDraft((current) => ({ ...current, image }))
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    if (!draft) return undefined
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [draft])

  return (
    <div className="stack">
      <div className="row">
        <button className="btn primary" type="button" onClick={() => { setError(''); setDraft({ ...EMPTY_ITEM }) }}>Add item</button>
      </div>
      {error && !draft && <p className="alert">{error}</p>}
      <label className="field slim">
        Filter
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Type a category or item name…"
          list="admin-menu-filter"
          autoComplete="off"
        />
        <datalist id="admin-menu-filter">
          {CATEGORIES.map((category) => <option key={category.id} value={category.name} />)}
        </datalist>
      </label>
      {filter.trim() && shown.length === 0 && <p className="muted">No menu items match that filter.</p>}
      <ul className="menulist">
        {shown.map((item) => (
          <li key={item.id}>
            <Thumb item={item} size="sm" />
            <div>
              <strong>{item.name}</strong>
              <small>{CATEGORIES.find((category) => category.id === item.category)?.name} · {peso(item.price)}{item.available ? '' : ' · Sold out'}</small>
            </div>
            <div className="row">
              <button className="btn small ghost" type="button" onClick={() => toggle(item)}>{item.available ? 'Mark sold out' : 'Mark available'}</button>
              <button className="btn small ghost" type="button" onClick={() => edit(item)}>Edit</button>
              <button className="btn small danger" type="button" onClick={() => remove(item)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
      {draft && createPortal(
        <div className="overlay sheet" onClick={() => setDraft(null)}>
          <form className="panel editor" onClick={(event) => event.stopPropagation()} onSubmit={save}>
            <div className="split">
              <h2>{draft.id ? 'Edit item' : 'Add item'}</h2>
              <button className="iconbtn" type="button" onClick={() => setDraft(null)} aria-label="Close">×</button>
            </div>
            <div className="photo-row">
              <Thumb item={draft} size="lg" />
              <div>
                <p className="muted">Photo or emoji. A photo replaces the emoji on the menu.</p>
                <label className="btn ghost small">
                  {draft.image ? 'Change photo' : 'Add photo'}
                  <input className="sr" type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto} />
                </label>
                {draft.image && (
                  <button className="btn small ghost" type="button" onClick={() => setDraft({ ...draft, image: '' })}>Use emoji instead</button>
                )}
              </div>
            </div>
            <p className="field-label">Emoji</p>
            <div className="choices">
              {EMOJIS.map((emoji) => (
                <button key={emoji} type="button" className={draft.emoji === emoji && !draft.image ? 'on' : ''} onClick={() => setDraft({ ...draft, emoji, image: '' })}>
                  {emoji}
                </button>
              ))}
            </div>
            <label className="field">
              Or type an emoji
              <input value={draft.emoji} onChange={(event) => setDraft({ ...draft, emoji: event.target.value })} />
            </label>
            <label className="field">Name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label>
            <label className="field">Price<input type="number" min="1" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} required /></label>
            <label className="field">
              Category
              <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
                {CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            {!draft.id && (
              <label className="field">
                Type
                <select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value })}>
                  <option value="drink">Drink (size, sugar, ice)</option>
                  <option value="food">Food</option>
                  <option value="pizza">Pizza</option>
                  <option value="party">Bilao / paluto</option>
                </select>
              </label>
            )}
            <label className="field">Description<input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
            <label className="check"><input type="checkbox" checked={draft.popular} onChange={(event) => setDraft({ ...draft, popular: event.target.checked })} /> Popular</label>
            <label className="check"><input type="checkbox" checked={draft.available} onChange={(event) => setDraft({ ...draft, available: event.target.checked })} /> Available</label>
            {!draft.id && draft.kind === 'food' && (
              <>
                <label className="check"><input type="checkbox" checked={draft.spice} onChange={(event) => setDraft({ ...draft, spice: event.target.checked })} /> Spice choice</label>
                <label className="check"><input type="checkbox" checked={draft.extraRice} onChange={(event) => setDraft({ ...draft, extraRice: event.target.checked })} /> Extra rice add-on</label>
              </>
            )}
            {error && <p className="alert">{error}</p>}
            <button className="btn primary block" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save item'}</button>
          </form>
        </div>,
        document.body,
      )}
    </div>
  )
}

function Team({ directory, branches, user }) {
  const { saveStaff, deleteStaff, saveBranch, deleteBranch, setCustomerStanding } = useStore()
  const [form, setForm] = useState({ role: 'staff', name: '', email: '', password: '', phone: '', branchId: '' })
  const [branch, setBranch] = useState({ id: '', name: '', address: '' })
  const [pin, setPin] = useState({ lat: SHOP.lat, lng: SHOP.lng })
  const [error, setError] = useState('')
  const [branchError, setBranchError] = useState('')
  const [customerError, setCustomerError] = useState('')
  const admins = directory.filter((person) => person.role === 'admin')
  const staff = directory.filter((person) => person.role === 'staff')
  const customers = directory.filter((person) => person.role === 'customer')
  const activeCustomers = customers.filter((person) => person.standing !== 'archived' && person.standing !== 'blacklisted')
  const archived = customers.filter((person) => person.standing === 'archived')
  const blacklisted = customers.filter((person) => person.standing === 'blacklisted')
  const chosenBranch = form.branchId || branches[0]?.id || ''

  function branchName(id) {
    return branches.find((entry) => entry.id === id)?.name || 'No branch'
  }

  function editBranch(item) {
    setBranchError('')
    setBranch({ id: item.id, name: item.name, address: item.address })
    setPin({ lat: item.lat, lng: item.lng })
  }

  async function savePlace(event) {
    event.preventDefault()
    setBranchError('')
    try {
      await saveBranch({ ...branch, pin })
      setBranch({ id: '', name: '', address: '' })
      setPin({ lat: SHOP.lat, lng: SHOP.lng })
    } catch (err) {
      setBranchError(err.message)
    }
  }

  async function removeBranch(id) {
    setBranchError('')
    try {
      await deleteBranch(id)
      if (branch.id === id) {
        setBranch({ id: '', name: '', address: '' })
        setPin({ lat: SHOP.lat, lng: SHOP.lng })
      }
    } catch (err) {
      setBranchError(err.message)
    }
  }

  async function add(event) {
    event.preventDefault()
    setError('')
    try {
      await saveStaff({ ...form, branchId: chosenBranch })
      setForm({ role: 'staff', name: '', email: '', password: '', phone: '', branchId: chosenBranch })
    } catch (err) {
      setError(err.message)
    }
  }

  async function setStanding(person, standing) {
    setCustomerError('')
    try {
      await setCustomerStanding(person.id, standing)
    } catch (err) {
      setCustomerError(err.message)
    }
  }

  async function removePerson(person) {
    setError('')
    try {
      await deleteStaff(person.id)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="stack">
      <div className="split-grid">
        <form className="card" onSubmit={savePlace}>
          <h2>{branch.id ? 'Edit branch' : 'Add a branch'}</h2>
          <p className="muted">Type the branch address, then tap the map to pin the shop.</p>
          <label className="field">Branch name<input value={branch.name} onChange={(event) => setBranch({ ...branch, name: event.target.value })} required /></label>
          <label className="field">Branch address<input value={branch.address} onChange={(event) => setBranch({ ...branch, address: event.target.value })} placeholder="Street, barangay, town" required /></label>
          <div className="field">
            <span>Branch pin</span>
            <AddressPin
              pin={pin}
              center={SHOP}
              onPick={(lat, lng) => setPin({ lat, lng })}
              label="Map. Tap or drag the pin onto this branch."
            />
            <p className="fine">Drag the pin if this branch is somewhere else.</p>
          </div>
          {branchError && <p className="alert">{branchError}</p>}
          <div className="row">
            <button className="btn primary" type="submit">{branch.id ? 'Save branch' : 'Add branch'}</button>
            {branch.id && (
              <button className="btn ghost" type="button" onClick={() => { setBranch({ id: '', name: '', address: '' }); setPin({ lat: SHOP.lat, lng: SHOP.lng }) }}>Cancel</button>
            )}
          </div>
        </form>
        <section className="card">
          <h2>Branches</h2>
          <ul className="plain">
            {branches.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.address}</small>
                </div>
                <div className="row">
                  <button className="btn small ghost" type="button" onClick={() => editBranch(item)}>Edit</button>
                  <button className="btn small danger" type="button" onClick={() => removeBranch(item.id)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="split-grid">
        <form className="card" onSubmit={add}>
          <h2>Add a login</h2>
          <p className="muted">Add as many admin and staff logins as the branches need.</p>
          <label className="field">
            Role
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="field">Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label className="field">Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label className="field">Password<input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={6} /></label>
          <label className="field">Mobile<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, '').slice(0, 11) })} required /></label>
          <label className="field">
            Branch
            <select value={chosenBranch} onChange={(event) => setForm({ ...form, branchId: event.target.value })}>
              {branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          {error && <p className="alert">{error}</p>}
          <button className="btn primary" type="submit">Create {form.role} login</button>
        </form>
        <div className="stack">
          <People title="Admins" people={admins} branchName={branchName} onRemove={removePerson} user={user} lastAdmin={admins.length <= 1} />
          <People title="Staff" people={staff} branchName={branchName} onRemove={removePerson} user={user} empty="No staff accounts yet." />
          {customerError && <p className="alert">{customerError}</p>}
          <CustomerList
            title="Customers"
            people={activeCustomers}
            empty="No customer accounts yet."
            actions={[
              ['archived', 'Archive', 'ghost'],
              ['blacklisted', 'Blacklist', 'danger'],
            ]}
            onStanding={setStanding}
          />
          <CustomerList
            title="Archived"
            people={archived}
            empty="No archived customers."
            note="Archived customers can sign in, but they cannot place an order."
            actions={[['active', 'Restore', 'ghost']]}
            onStanding={setStanding}
          />
          <CustomerList
            title="Blacklist"
            people={blacklisted}
            empty="No blacklisted customers."
            note="Blacklisted customers can sign in, but they cannot place an order."
            actions={[['active', 'Restore', 'ghost']]}
            onStanding={setStanding}
          />
        </div>
      </div>
    </div>
  )
}

function CustomerList({ title, people, empty, note, actions, onStanding }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {note && <p className="muted">{note}</p>}
      <ul className="plain">
        {people.map((person) => (
          <li key={person.id}>
            <div>
              <strong>{person.name}</strong>
              <small>{person.email} · {person.phone ? phoneText(person.phone) : 'No mobile yet'}</small>
            </div>
            <div className="row">
              {actions.map(([standing, label, tone]) => (
                <button key={standing} className={`btn small ${tone}`} type="button" onClick={() => onStanding(person, standing)}>{label}</button>
              ))}
            </div>
          </li>
        ))}
        {people.length === 0 && <li className="muted">{empty}</li>}
      </ul>
    </section>
  )
}

function People({ title, people, branchName, onRemove, user, lastAdmin = false, empty = 'None yet.' }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <ul className="plain">
        {people.map((person) => {
          const locked = person.id === user?.id || (lastAdmin && person.role === 'admin')
          return (
            <li key={person.id}>
              <div>
                <strong>{person.name}</strong>
                <small>{person.email} · {phoneText(person.phone)} · {branchName(person.branchId)}</small>
              </div>
              {!locked && <button className="btn small danger" type="button" onClick={() => onRemove(person)}>Remove</button>}
            </li>
          )
        })}
        {people.length === 0 && <li className="muted">{empty}</li>}
      </ul>
    </section>
  )
}

function SettingsForm({ settings }) {
  const { saveSettings, resetDemo } = useStore()
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [armed, setArmed] = useState(false)
  const [area, setArea] = useState({ name: '', fee: 40, eta: '30–45 min' })

  useEffect(() => {
    if (settings && !form) {
      setForm(structuredClone({
        ...settings,
        openTime: settings.openTime || '08:00',
        closeTime: settings.closeTime || '21:00',
      }))
    }
  }, [settings, form])

  if (!form) return null

  function updateZone(id, patch) {
    setForm({
      ...form,
      zones: form.zones.map((zone) => (zone.id === id ? { ...zone, ...patch } : zone)),
    })
  }

  function addArea() {
    const name = area.name.trim()
    if (name.length < 2) {
      setError('Enter a barangay or town name.')
      return
    }
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (form.zones.some((zone) => zone.id === id || zone.name.toLowerCase() === name.toLowerCase())) {
      setError('That area is already on the list.')
      return
    }
    setError('')
    setForm({
      ...form,
      zones: [...form.zones, { id, name, fee: Number(area.fee) || 0, eta: area.eta || '30–45 min' }],
    })
    setArea({ name: '', fee: 40, eta: '30–45 min' })
  }

  function removeArea(id) {
    if (form.zones.length === 1) {
      setError('Keep at least one delivery area.')
      return
    }
    setForm({ ...form, zones: form.zones.filter((zone) => zone.id !== id) })
  }

  async function save(event) {
    event.preventDefault()
    setError('')
    setSaved(false)
    try {
      await saveSettings(form)
      setSaved(true)
      setForm(null)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form className="card stack" onSubmit={save}>
      <label className="check">
        <input type="checkbox" checked={form.acceptingOrders} onChange={(event) => setForm({ ...form, acceptingOrders: event.target.checked })} />
        Accept delivery orders
      </label>
      <div className="formgrid">
        <label className="field">Opens<input type="time" value={form.openTime} onChange={(event) => setForm({ ...form, openTime: event.target.value })} required /></label>
        <label className="field">Closes<input type="time" value={form.closeTime} onChange={(event) => setForm({ ...form, closeTime: event.target.value })} required /></label>
      </div>
      <p className="muted">Posted hours: {hoursText(form)}</p>
      <label className="check">
        <input type="checkbox" checked={form.openOverride} onChange={(event) => setForm({ ...form, openOverride: event.target.checked })} />
        Keep ordering open outside these hours
      </label>
      <label className="field">
        Announcement
        <input value={form.announcement} maxLength={180} onChange={(event) => setForm({ ...form, announcement: event.target.value })} />
      </label>
      <div className="formgrid">
        <label className="field">Shop mobile<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
        <label className="field">Minimum order<input type="number" value={form.minOrder} onChange={(event) => setForm({ ...form, minOrder: Number(event.target.value) })} /></label>
        <label className="field">Free delivery from<input type="number" value={form.freeDeliveryOver} onChange={(event) => setForm({ ...form, freeDeliveryOver: Number(event.target.value) })} /></label>
        <label className="field">Promo code<input value={form.promo.code} onChange={(event) => setForm({ ...form, promo: { ...form.promo, code: event.target.value.toUpperCase() } })} /></label>
        <label className="field">Promo amount<input type="number" value={form.promo.amount} onChange={(event) => setForm({ ...form, promo: { ...form.promo, amount: Number(event.target.value) } })} /></label>
        <label className="field">Promo minimum<input type="number" value={form.promo.min} onChange={(event) => setForm({ ...form, promo: { ...form.promo, min: Number(event.target.value) } })} /></label>
      </div>
      <section>
        <h2>Delivery areas</h2>
        <p className="muted">Add or remove a barangay or town, then save.</p>
        <ul className="plain zones">
          {form.zones.map((zone) => (
            <li key={zone.id}>
              <label className="field">Name<input value={zone.name} onChange={(event) => updateZone(zone.id, { name: event.target.value })} /></label>
              <label className="field">Fee<input type="number" min="0" value={zone.fee} onChange={(event) => updateZone(zone.id, { fee: Number(event.target.value) })} /></label>
              <label className="field">Time<input value={zone.eta} onChange={(event) => updateZone(zone.id, { eta: event.target.value })} /></label>
              <button className="btn small danger" type="button" onClick={() => removeArea(zone.id)}>Remove</button>
            </li>
          ))}
        </ul>
        <div className="formgrid">
          <label className="field">New barangay or town<input value={area.name} onChange={(event) => setArea({ ...area, name: event.target.value })} placeholder="Tangalan" /></label>
          <label className="field">Fee<input type="number" min="0" value={area.fee} onChange={(event) => setArea({ ...area, fee: Number(event.target.value) })} /></label>
          <label className="field">Time<input value={area.eta} onChange={(event) => setArea({ ...area, eta: event.target.value })} /></label>
        </div>
        <button className="btn ghost" type="button" onClick={addArea}>Add area</button>
      </section>
      {error && <p className="alert">{error}</p>}
      {saved && <p className="hint">Shop settings saved.</p>}
      <div className="row">
        <button className="btn primary" type="submit">Save settings</button>
        <button
          className="btn danger"
          type="button"
          onClick={() => {
            if (!armed) {
              setArmed(true)
              return
            }
            resetDemo()
          }}
        >
          {armed ? 'Confirm reset demo data' : 'Reset demo data'}
        </button>
      </div>
    </form>
  )
}
