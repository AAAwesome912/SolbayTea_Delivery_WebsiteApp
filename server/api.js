import fs from 'fs'
import path from 'path'
import { createHash, randomBytes, randomInt } from 'crypto'
import { fileURLToPath } from 'url'
import {
  CATEGORIES,
  NEXT_STATUS,
  SHOP,
  ZONES,
  defaultBranches,
  defaultSettings,
  describeSelection,
  minutesFromClock,
  orderingOpen,
  orderBlock,
  quote,
  readPin,
  unitPrice,
  validateSelection,
} from '../shared/shop.js'
import { createDb } from './seed.js'
import { menuSeed } from './menu.js'

const dbPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'db.json')

function load() {
  if (!fs.existsSync(dbPath)) {
    const fresh = createDb()
    fs.writeFileSync(dbPath, JSON.stringify(fresh, null, 2))
    return fresh
  }
  try {
    const data = hydrate(JSON.parse(fs.readFileSync(dbPath, 'utf8')))
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
    return data
  } catch {
    const fresh = createDb()
    fs.writeFileSync(dbPath, JSON.stringify(fresh, null, 2))
    return fresh
  }
}

function hydrate(data) {
  const defaults = defaultSettings()
  data.settings = {
    ...defaults,
    ...(data.settings || {}),
    promo: { ...defaults.promo, ...(data.settings?.promo || {}) },
  }
  data.settings.zones = (data.settings.zones?.length ? data.settings.zones : defaults.zones).map((zone) => {
    const known = ZONES.find((entry) => entry.id === zone.id) || defaults.zones.find((entry) => entry.id === zone.id)
    return {
      eta: '30–45 min',
      ...known,
      ...zone,
      lat: zone.lat ?? known?.lat ?? SHOP.lat,
      lng: zone.lng ?? known?.lng ?? SHOP.lng,
    }
  })
  for (const user of data.users || []) {
    user.pinLat = Number.isFinite(Number(user.pinLat)) ? Number(user.pinLat) : null
    user.pinLng = Number.isFinite(Number(user.pinLng)) ? Number(user.pinLng) : null
    if (user.role === 'customer' && !['active', 'archived', 'blacklisted'].includes(user.standing)) user.standing = 'active'
  }
  data.branches = (Array.isArray(data.branches) && data.branches.length ? data.branches : defaultBranches()).map((branch) => ({
    id: String(branch.id || 'malinao'),
    name: String(branch.name || SHOP.branch),
    address: String(branch.address || SHOP.address),
    lat: Number(branch.lat) || SHOP.lat,
    lng: Number(branch.lng) || SHOP.lng,
  }))
  for (const user of data.users || []) {
    if ((user.role === 'admin' || user.role === 'staff') && !data.branches.some((branch) => branch.id === user.branchId)) {
      user.branchId = data.branches[0].id
    }
  }
  data.challenges = (Array.isArray(data.challenges) ? data.challenges : []).filter((entry) => entry.expiresAt > Date.now())
  for (const order of data.orders || []) {
    order.dropLat = Number.isFinite(Number(order.dropLat)) ? Number(order.dropLat) : null
    order.dropLng = Number.isFinite(Number(order.dropLng)) ? Number(order.dropLng) : null
    if (!data.branches.some((branch) => branch.id === order.branchId)) {
      const branch = data.branches[0]
      order.branchId = branch.id
      order.branchName = branch.name
      order.branchAddress = branch.address
      order.branchLat = branch.lat
      order.branchLng = branch.lng
    }
  }
  if (data.menuVersion !== 4) {
    data.menu = menuSeed()
    data.menuVersion = 4
  }
  return data
}

const db = load()
let queue = Promise.resolve()

function enqueue(work) {
  const run = queue.then(work, work)
  queue = run.then(
    () => {},
    () => {},
  )
  return run
}

function save() {
  db.revision += 1
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2))
}

function fail(status, message) {
  const error = new Error(message)
  error.status = status
  throw error
}

function send(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        const error = new Error('Invalid JSON.')
        error.status = 400
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function publicUser(user) {
  if (!user) return null
  const { password, ...rest } = user
  return rest
}

function visibleOrders(user) {
  if (!user) return []
  if (user.role === 'customer') return db.orders.filter((order) => order.customerId === user.id)
  if (user.role === 'staff') return db.orders.filter((order) => order.branchId === user.branchId)
  return db.orders
}

function payload(user) {
  return {
    revision: db.revision,
    user: publicUser(user),
    menu: db.menu,
    settings: db.settings,
    orders: visibleOrders(user),
    directory: user?.role === 'admin' ? db.users.map(publicUser) : [],
    branches: db.branches,
  }
}

function userFromReq(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return null
  const session = db.sessions.find((entry) => entry.token === token)
  if (!session) return null
  return db.users.find((user) => user.id === session.userId) || null
}

function requireUser(req) {
  const header = req.headers.authorization || ''
  if (!header) fail(401, 'Please sign in.')
  const user = userFromReq(req)
  if (!user) fail(401, 'Please sign in again.')
  return user
}

function requireRole(req, roles) {
  const user = requireUser(req)
  if (!roles.includes(user.role)) fail(403, 'You do not have access to that.')
  return user
}

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function signupPhone(value, required) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) {
    if (required) fail(400, 'Enter an 11-digit mobile number starting with 09.')
    return ''
  }
  return requirePhone(digits)
}

function maskPhone(phone) {
  return `${phone.slice(0, 4)}***${phone.slice(-2)}`
}

function maskEmail(email) {
  const [name, host] = email.split('@')
  return `${name.slice(0, 1)}***@${host}`
}

function codeHash(code) {
  return createHash('sha256').update(String(code)).digest('hex')
}

function requirePhone(value) {
  const phone = String(value || '').replace(/\D/g, '')
  if (!/^09\d{9}$/.test(phone)) fail(400, 'Enter an 11-digit mobile number starting with 09.')
  return phone
}

function issueSession(user) {
  const token = randomBytes(24).toString('hex')
  db.sessions.push({ token, userId: user.id })
  return token
}

function priceOrder(raw, user) {
  const block = orderBlock(user)
  if (block) fail(400, block)
  if (!orderingOpen(db.settings)) {
    fail(400, 'SolbayTea is not accepting delivery orders right now.')
  }
  const branch = db.branches.find((entry) => entry.id === raw.branchId) || (db.branches.length === 1 ? db.branches[0] : null)
  if (!branch) fail(400, 'Choose which SolbayTea branch will prepare this order.')
  const zone = db.settings.zones.find((entry) => entry.id === raw.barangayId)
  if (!zone) fail(400, 'Choose a delivery barangay in Malinao.')
  const address = String(raw.address || '').trim()
  if (address.length < 8 || address.length > 120) fail(400, 'Enter a street address of at least 8 characters.')
  const landmark = String(raw.landmark || '').trim().slice(0, 80)
  const pin = takePin(raw.pin)
  const notes = String(raw.notes || '').trim().slice(0, 180)
  const phone = requirePhone(raw.phone)
  const payment = raw.payment === 'gcash' ? 'gcash' : raw.payment === 'cod' ? 'cod' : ''
  if (!payment) fail(400, 'Choose Cash on Delivery or GCash.')
  if (!Array.isArray(raw.items) || raw.items.length === 0 || raw.items.length > 30) {
    fail(400, 'Add at least one item to the order.')
  }
  const lines = raw.items.map((input) => {
    const item = db.menu.find((entry) => entry.id === input.itemId)
    if (!item) fail(400, 'An item in the cart is no longer on the menu.')
    const selection = validateSelection(item, input)
    return {
      itemId: item.id,
      name: item.name,
      emoji: item.emoji,
      qty: selection.qty,
      unitPrice: unitPrice(item, selection),
      optionsLabel: describeSelection(item, selection),
      selection,
    }
  })
  const totals = quote({
    lines,
    zone,
    settings: db.settings,
    promoCode: raw.promoCode || '',
  })
  if (totals.promoError && String(raw.promoCode || '').trim()) fail(400, totals.promoError)
  if (totals.minShortfall > 0) {
    fail(400, `Add ₱${totals.minShortfall} more to reach the ₱${db.settings.minOrder} minimum.`)
  }
  const order = {
    id: `SB-${db.seq++}`,
    customerId: user.id,
    customerName: user.name,
    phone,
    barangayId: zone.id,
    barangayName: zone.name,
    address,
    landmark,
    dropLat: pin.lat,
    dropLng: pin.lng,
    branchId: branch.id,
    branchName: branch.name,
    branchAddress: branch.address,
    branchLat: branch.lat,
    branchLng: branch.lng,
    notes,
    utensils: !!raw.utensils,
    payment,
    paymentStatus: payment === 'gcash' ? 'pending' : 'unpaid',
    items: lines,
    subtotal: totals.subtotal,
    deliveryFee: totals.deliveryFee,
    discount: totals.discount,
    total: totals.total,
    promoCode: totals.promoCode,
    status: 'placed',
    cancelReason: '',
    eta: zone.eta,
    timeline: [{ status: 'placed', at: Date.now(), by: user.name }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  user.phone = phone
  user.address = address
  user.landmark = landmark
  user.barangayId = zone.id
  user.pinLat = pin.lat
  user.pinLng = pin.lng
  db.orders.unshift(order)
  return order
}

function updateOrder(user, id, raw) {
  const order = db.orders.find((entry) => entry.id === id)
  if (!order) fail(404, 'Order not found.')
  if (user.role === 'customer' && order.customerId !== user.id) fail(403, 'That order is not yours.')
  if (user.role === 'staff' && order.branchId !== user.branchId) fail(403, 'That order belongs to another branch.')

  let paymentStatus = order.paymentStatus
  if (raw.paymentStatus === 'confirmed') {
    if (user.role === 'customer') fail(403, 'Only the shop can confirm payment.')
    if (order.payment !== 'gcash') fail(400, 'This order is not a GCash payment.')
    if (order.paymentStatus === 'pending') paymentStatus = 'confirmed'
  }

  let status = order.status
  let cancelReason = order.cancelReason
  const timeline = [...order.timeline]
  if (raw.status) {
    const next = raw.status
    if (next === 'cancelled') {
      if (order.status !== 'placed') {
        fail(400, 'This order was already accepted, so it can no longer be cancelled.')
      }
      const reason = String(raw.cancelReason || '').trim().slice(0, 140)
      if (reason.length < 3) fail(400, 'Add a reason for cancelling.')
      status = 'cancelled'
      cancelReason = reason
      timeline.push({ status: 'cancelled', at: Date.now(), by: user.name })
    } else {
      if (user.role === 'customer') fail(403, 'Only staff can move an order forward.')
      if (NEXT_STATUS[order.status] !== next) fail(400, 'That status change is not available.')
      const forward = ['preparing', 'ready', 'delivering', 'delivered']
      if (order.payment === 'gcash' && paymentStatus === 'pending' && forward.includes(next)) {
        fail(400, 'Confirm the GCash payment before the kitchen starts.')
      }
      status = next
      if (next === 'delivered') paymentStatus = 'paid'
      timeline.push({ status: next, at: Date.now(), by: user.name })
    }
  }

  order.paymentStatus = paymentStatus
  order.status = status
  order.cancelReason = cancelReason
  order.timeline = timeline
  if (raw.status || raw.paymentStatus) order.updatedAt = Date.now()
  return order
}

function writeMenu(raw, existing) {
  const name = String(raw.name || '').trim()
  const description = String(raw.description || '').trim()
  const price = Number(raw.price)
  const emoji = String(raw.emoji || '🍽️').trim().slice(0, 8) || '🍽️'
  const category = String(raw.category || '')
  if (name.length < 2 || name.length > 80) fail(400, 'Item name should be 2–80 characters.')
  if (description.length > 180) fail(400, 'Description is too long.')
  if (!Number.isFinite(price) || price < 1 || price > 20000) fail(400, 'Enter a price from ₱1 to ₱20,000.')
  if (!CATEGORIES.some((entry) => entry.id === category)) fail(400, 'Choose a menu category.')
  const image = readImage(raw, existing)
  const base = {
    name,
    description,
    price: Math.round(price),
    emoji,
    image,
    category,
    popular: !!raw.popular,
    available: raw.available !== false,
  }
  if (existing) return { ...existing, ...base }
  const kind = ['drink', 'food', 'pizza', 'party'].includes(raw.kind) ? raw.kind : 'food'
  if (kind === 'drink') {
    return {
      ...base,
      id: `m-${randomBytes(4).toString('hex')}`,
      kind,
      sugar: true,
      ice: true,
      spice: false,
      sizes: [
        { id: 'm', label: 'Medium', add: 0 },
        { id: 'l', label: 'Large', add: 20 },
      ],
      addons: [
        { id: 'pearl', name: 'Tapioca pearl', price: 15 },
        { id: 'creamcheese', name: 'Cream cheese', price: 15 },
        { id: 'cheesecake', name: 'Cheese cake', price: 15 },
        { id: 'oreo', name: 'Oreo', price: 15 },
        { id: 'nata', name: 'Nata', price: 15 },
        { id: 'yakult', name: 'Yakult', price: 20 },
      ],
    }
  }
  if (kind === 'pizza') {
    return {
      ...base,
      id: `m-${randomBytes(4).toString('hex')}`,
      kind,
      sugar: false,
      ice: false,
      spice: false,
      sizes: [
        { id: 'solo', label: 'Solo 9"', add: 0 },
        { id: 'family', label: 'Family 12"', add: 150 },
      ],
      addons: [],
    }
  }
  return {
    ...base,
    id: `m-${randomBytes(4).toString('hex')}`,
    kind,
    sugar: false,
    ice: false,
    spice: !!raw.spice,
    sizes: [],
    addons: raw.extraRice ? [{ id: 'rice', name: 'Extra rice', price: 25 }] : [],
  }
}

function readImage(raw, existing) {
  if (raw.image === undefined) return existing?.image || ''
  if (!raw.image) return ''
  const image = String(raw.image)
  if (/^\/menu\/[a-z0-9._-]+\.(jpe?g|png|webp)$/i.test(image)) return image
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(image)) {
    fail(400, 'Use a JPG, PNG, or WebP photo.')
  }
  if (image.length > 500000) fail(400, 'That photo is too large. Try a smaller one.')
  return image
}

function writeSettings(raw) {
  const minOrder = Number(raw.minOrder)
  const freeDeliveryOver = Number(raw.freeDeliveryOver)
  const amount = Number(raw.promo?.amount)
  const promoMin = Number(raw.promo?.min)
  const code = String(raw.promo?.code || '').trim().toUpperCase()
  if (!Number.isFinite(minOrder) || minOrder < 0 || minOrder > 5000) fail(400, 'Minimum order must be ₱0–₱5,000.')
  if (!Number.isFinite(freeDeliveryOver) || freeDeliveryOver < 0 || freeDeliveryOver > 20000) {
    fail(400, 'Free-delivery amount must be ₱0–₱20,000. Use 0 to turn it off.')
  }
  if (!/^[A-Z0-9]{3,16}$/.test(code)) fail(400, 'Promo code should be 3–16 letters or numbers.')
  if (!Number.isFinite(amount) || amount < 0 || amount > 2000) fail(400, 'Promo amount must be ₱0–₱2,000.')
  if (!Number.isFinite(promoMin) || promoMin < 0 || promoMin > 20000) fail(400, 'Promo minimum is not valid.')
  const phone = requirePhone(raw.phone)
  const openTime = normalizeClock(raw.openTime)
  const closeTime = normalizeClock(raw.closeTime)
  if (!Array.isArray(raw.zones) || raw.zones.length < 1 || raw.zones.length > 40) {
    fail(400, 'Keep between 1 and 40 delivery areas.')
  }
  const zones = raw.zones.map((zone) => {
    const name = String(zone.name || '').trim()
    if (name.length < 2 || name.length > 40) fail(400, 'Each barangay or town needs a name.')
    const fee = Number(zone.fee)
    if (!Number.isFinite(fee) || fee < 0 || fee > 500) fail(400, `Delivery fee for ${name} must be ₱0–₱500.`)
    const id = String(zone.id || slug(name)).replace(/[^a-z0-9-]/g, '').slice(0, 40)
    if (!id) fail(400, 'Each delivery area needs a name.')
    const known = ZONES.find((entry) => entry.id === id)
    const lat = Number(zone.lat)
    const lng = Number(zone.lng)
    return {
      id,
      name,
      fee: Math.round(fee),
      eta: String(zone.eta || '30–45 min').trim().slice(0, 24) || '30–45 min',
      lat: Number.isFinite(lat) ? lat : (known?.lat ?? SHOP.lat),
      lng: Number.isFinite(lng) ? lng : (known?.lng ?? SHOP.lng),
    }
  })
  if (new Set(zones.map((zone) => zone.id)).size !== zones.length) fail(400, 'Two delivery areas have the same name.')
  db.settings = {
    ...db.settings,
    acceptingOrders: !!raw.acceptingOrders,
    openOverride: !!raw.openOverride,
    openTime,
    closeTime,
    announcement: String(raw.announcement || '').trim().slice(0, 180),
    minOrder: Math.round(minOrder),
    freeDeliveryOver: Math.round(freeDeliveryOver),
    phone,
    promo: { code, amount: Math.round(amount), min: Math.round(promoMin) },
    zones,
  }
}

function takePin(raw) {
  const pin = readPin(raw, db.branches)
  if (!pin) fail(400, 'Drop a pin on the delivery address.')
  if (pin.error) fail(400, pin.error)
  return pin
}

function writeBranch(raw, existing) {
  const name = String(raw.name || '').trim()
  const address = String(raw.address || '').trim()
  if (name.length < 2 || name.length > 40) fail(400, 'Enter the branch name.')
  if (address.length < 8 || address.length > 120) fail(400, 'Type the branch address.')
  const pin = readPin(raw.pin, [SHOP], 120)
  if (!pin) fail(400, 'Drop a pin on the branch.')
  if (pin.error) fail(400, pin.error)
  const duplicate = db.branches.some((entry) => entry.id !== existing?.id && entry.name.toLowerCase() === name.toLowerCase())
  if (duplicate) fail(400, 'That branch name is already used.')
  let id = existing?.id
  if (!id) {
    id = slug(name) || 'branch'
    if (db.branches.some((entry) => entry.id === id)) id = `${id}-${randomBytes(2).toString('hex')}`
  }
  return { id, name, address, lat: pin.lat, lng: pin.lng }
}

function normalizeClock(value) {
  const match = String(value || '').match(/^(\d{2}):(\d{2})/)
  if (!match) fail(400, 'Enter opening and closing times.')
  const text = `${match[1]}:${match[2]}`
  if (minutesFromClock(text, -1) < 0) fail(400, 'Enter a valid opening and closing time.')
  return text
}

function slug(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
}

function parseUrl(req) {
  const url = new URL(req.url || '/', 'http://localhost')
  let pathname = url.pathname
  if (pathname.startsWith('/api')) pathname = pathname.slice(4) || '/'
  return pathname
}

async function handle(req, res) {
  const pathname = parseUrl(req)
  const method = req.method || 'GET'

  if (method === 'GET' && pathname === '/bootstrap') {
    const header = req.headers.authorization || ''
    if (header && !userFromReq(req)) fail(401, 'Please sign in again.')
    return send(res, 200, payload(userFromReq(req)))
  }

  if (method === 'POST' && pathname === '/login') {
    const body = await readBody(req)
    const email = cleanEmail(body.email)
    const password = String(body.password || '')
    const user = db.users.find((entry) => entry.email === email && entry.password === password)
    if (!user) fail(400, 'Email or password does not match.')
    const token = issueSession(user)
    save()
    return send(res, 200, { token, ...payload(user) })
  }

  if (method === 'POST' && pathname === '/register/code') {
    const body = await readBody(req)
    if (body.consent !== true) fail(400, 'Agree that SolbayTea may use your details before creating an account.')
    const name = String(body.name || '').trim()
    const email = cleanEmail(body.email)
    const password = String(body.password || '')
    const channel = body.channel === 'phone' ? 'phone' : body.channel === 'email' ? 'email' : ''
    if (!channel) fail(400, 'Choose a text code or an email code.')
    const phone = signupPhone(body.phone, channel === 'phone')
    if (name.length < 2 || name.length > 60) fail(400, 'Enter your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Enter a valid email.')
    if (password.length < 6) fail(400, 'Use at least 6 characters for the password.')
    if (db.users.some((entry) => entry.email === email)) fail(409, 'That email is already registered.')
    const now = Date.now()
    const previous = (db.challenges || []).find((entry) => entry.email === email)
    if (previous && now - previous.sentAt < 30000) fail(400, 'Wait a few seconds before asking for another code.')
    const code = String(randomInt(0, 1000000)).padStart(6, '0')
    const challenge = {
      id: randomBytes(8).toString('hex'),
      name,
      email,
      password,
      phone,
      channel,
      codeHash: codeHash(code),
      attempts: 0,
      sentAt: now,
      expiresAt: now + 10 * 60 * 1000,
      consentAt: now,
    }
    db.challenges = (db.challenges || []).filter((entry) => entry.email !== email && entry.expiresAt > now)
    db.challenges.push(challenge)
    save()
    return send(res, 200, {
      challengeId: challenge.id,
      channel,
      sentTo: channel === 'phone' ? maskPhone(phone) : maskEmail(email),
      previewCode: code,
    })
  }

  if (method === 'POST' && pathname === '/register') {
    const body = await readBody(req)
    const challenge = (db.challenges || []).find((entry) => entry.id === body.challengeId)
    if (!challenge || challenge.expiresAt < Date.now()) fail(400, 'That code expired. Ask for a new one.')
    if (challenge.attempts >= 5) fail(400, 'Too many tries. Ask for a new code.')
    const entered = String(body.code || '').replace(/\D/g, '')
    if (codeHash(entered) !== challenge.codeHash) {
      challenge.attempts += 1
      save()
      fail(400, 'That code does not match.')
    }
    if (db.users.some((entry) => entry.email === challenge.email)) fail(409, 'That email is already registered.')
    const user = {
      id: `u-${randomBytes(4).toString('hex')}`,
      name: challenge.name,
      email: challenge.email,
      password: challenge.password,
      role: 'customer',
      phone: challenge.phone,
      address: '',
      landmark: '',
      barangayId: 'poblacion',
      pinLat: null,
      pinLng: null,
      dataConsentAt: challenge.consentAt,
      verifiedVia: challenge.channel,
      standing: 'active',
    }
    db.users.push(user)
    db.challenges = db.challenges.filter((entry) => entry.id !== challenge.id)
    const token = issueSession(user)
    save()
    return send(res, 201, { token, ...payload(user) })
  }

  if (method === 'POST' && pathname === '/logout') {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    db.sessions = db.sessions.filter((entry) => entry.token !== token)
    save()
    return send(res, 200, payload(null))
  }

  if (method === 'PATCH' && pathname === '/account') {
    const user = requireRole(req, ['customer'])
    const body = await readBody(req)
    const zone = db.settings.zones.find((entry) => entry.id === body.barangayId)
    if (!zone) fail(400, 'Choose a delivery barangay in Malinao.')
    const address = String(body.address || '').trim()
    if (address.length < 8 || address.length > 120) fail(400, 'Enter a street address of at least 8 characters.')
    const landmark = String(body.landmark || '').trim().slice(0, 80)
    const pin = takePin(body.pin)
    user.address = address
    user.landmark = landmark
    user.barangayId = zone.id
    user.pinLat = pin.lat
    user.pinLng = pin.lng
    save()
    return send(res, 200, payload(user))
  }

  if (method === 'POST' && pathname === '/orders') {
    const user = requireRole(req, ['customer'])
    const body = await readBody(req)
    const order = priceOrder(body, user)
    save()
    return send(res, 201, { ...payload(user), order })
  }

  const orderMatch = pathname.match(/^\/orders\/([^/]+)$/)
  if (method === 'PATCH' && orderMatch) {
    const user = requireUser(req)
    const body = await readBody(req)
    const order = updateOrder(user, decodeURIComponent(orderMatch[1]), body)
    save()
    return send(res, 200, { ...payload(user), order })
  }

  if (method === 'POST' && pathname === '/menu') {
    const user = requireRole(req, ['admin'])
    const body = await readBody(req)
    const item = writeMenu(body)
    db.menu.push(item)
    save()
    return send(res, 201, payload(user))
  }

  const menuMatch = pathname.match(/^\/menu\/([^/]+)$/)
  if (menuMatch && method === 'PATCH') {
    const user = requireRole(req, ['admin', 'staff'])
    const body = await readBody(req)
    const index = db.menu.findIndex((entry) => entry.id === decodeURIComponent(menuMatch[1]))
    if (index < 0) fail(404, 'Menu item not found.')
    if (user.role === 'staff') {
      if (typeof body.available !== 'boolean') fail(400, 'Choose available or sold out.')
      db.menu[index] = { ...db.menu[index], available: body.available }
    } else {
      db.menu[index] = writeMenu(body, db.menu[index])
    }
    save()
    return send(res, 200, payload(user))
  }
  if (menuMatch && method === 'DELETE') {
    const user = requireRole(req, ['admin'])
    const id = decodeURIComponent(menuMatch[1])
    if (!db.menu.some((entry) => entry.id === id)) fail(404, 'Menu item not found.')
    db.menu = db.menu.filter((entry) => entry.id !== id)
    save()
    return send(res, 200, payload(user))
  }

  if (method === 'POST' && pathname === '/team') {
    const user = requireRole(req, ['admin'])
    const body = await readBody(req)
    const name = String(body.name || '').trim()
    const email = cleanEmail(body.email)
    const password = String(body.password || '')
    const phone = requirePhone(body.phone)
    const role = body.role === 'admin' ? 'admin' : body.role === 'staff' ? 'staff' : ''
    const branch = db.branches.find((entry) => entry.id === body.branchId)
    if (!role) fail(400, 'Choose Admin or Staff.')
    if (name.length < 2) fail(400, 'Enter the name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Enter a valid email.')
    if (password.length < 6) fail(400, 'Use at least 6 characters for the password.')
    if (!branch) fail(400, 'Choose the branch this person works at.')
    if (db.users.some((entry) => entry.email === email)) fail(409, 'That email is already used.')
    db.users.push({
      id: `u-${randomBytes(4).toString('hex')}`,
      name,
      email,
      password,
      role,
      phone,
      address: '',
      landmark: '',
      barangayId: 'poblacion',
      pinLat: null,
      pinLng: null,
      branchId: branch.id,
    })
    save()
    return send(res, 201, payload(user))
  }

  const teamMatch = pathname.match(/^\/team\/([^/]+)$/)
  if (method === 'DELETE' && teamMatch) {
    const user = requireRole(req, ['admin'])
    const id = decodeURIComponent(teamMatch[1])
    const target = db.users.find((entry) => entry.id === id)
    if (!target || !['admin', 'staff'].includes(target.role)) fail(404, 'Shop login not found.')
    if (target.id === user.id) fail(400, 'You cannot remove your own login.')
    if (target.role === 'admin' && db.users.filter((entry) => entry.role === 'admin').length <= 1) {
      fail(400, 'Keep at least one admin login.')
    }
    db.users = db.users.filter((entry) => entry.id !== id)
    db.sessions = db.sessions.filter((entry) => entry.userId !== id)
    save()
    return send(res, 200, payload(user))
  }

  if (method === 'POST' && pathname === '/branches') {
    const user = requireRole(req, ['admin'])
    const body = await readBody(req)
    db.branches.push(writeBranch(body))
    save()
    return send(res, 201, payload(user))
  }

  const branchMatch = pathname.match(/^\/branches\/([^/]+)$/)
  if (branchMatch && method === 'PATCH') {
    const user = requireRole(req, ['admin'])
    const body = await readBody(req)
    const id = decodeURIComponent(branchMatch[1])
    const index = db.branches.findIndex((entry) => entry.id === id)
    if (index < 0) fail(404, 'Branch not found.')
    db.branches[index] = writeBranch(body, db.branches[index])
    save()
    return send(res, 200, payload(user))
  }
  if (branchMatch && method === 'DELETE') {
    const user = requireRole(req, ['admin'])
    const id = decodeURIComponent(branchMatch[1])
    if (!db.branches.some((entry) => entry.id === id)) fail(404, 'Branch not found.')
    if (db.branches.length <= 1) fail(400, 'Keep at least one branch.')
    if (db.users.some((entry) => entry.branchId === id)) fail(400, 'Remove or move the people at this branch first.')
    db.branches = db.branches.filter((entry) => entry.id !== id)
    save()
    return send(res, 200, payload(user))
  }

  const customerMatch = pathname.match(/^\/customers\/([^/]+)$/)
  if (method === 'PATCH' && customerMatch) {
    const user = requireRole(req, ['admin'])
    const body = await readBody(req)
    const standing = body.standing
    if (!['active', 'archived', 'blacklisted'].includes(standing)) fail(400, 'Choose active, archived, or blacklisted.')
    const target = db.users.find((entry) => entry.id === decodeURIComponent(customerMatch[1]))
    if (!target || target.role !== 'customer') fail(404, 'Customer account not found.')
    target.standing = standing
    save()
    return send(res, 200, payload(user))
  }

  if (method === 'PATCH' && pathname === '/settings') {
    const user = requireRole(req, ['admin'])
    const body = await readBody(req)
    writeSettings(body)
    save()
    return send(res, 200, payload(user))
  }

  if (method === 'POST' && pathname === '/reset') {
    requireRole(req, ['admin'])
    const fresh = createDb()
    for (const key of Object.keys(db)) delete db[key]
    Object.assign(db, fresh)
    db.revision = Date.now()
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2))
    return send(res, 200, payload(null))
  }

  return send(res, 404, { error: 'Not found.' })
}

export function apiMiddleware(req, res, next) {
  return enqueue(() => handle(req, res)).catch((error) => {
    const status = error.status || 500
    if (!error.status) console.error(error)
    if (!res.headersSent) send(res, status, { error: status === 500 ? 'Server error.' : error.message })
    else next?.()
  })
}
