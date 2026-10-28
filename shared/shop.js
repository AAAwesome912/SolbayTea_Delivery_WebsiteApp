export const SHOP = {
  name: 'SolbayTea',
  branch: 'Malinao',
  tagline: 'Best Milktea. Best Moments.',
  slogan: 'Sa Solbay, siguradong solb na solb — mura na, masarap pa.',
  about:
    'SolbayTea is a cup of tea to be filled to the brim and enjoyed with friends, families, and loved ones.',
  address: 'Roxas Avenue, Poblacion, Malinao, Aklan 5606',
  landline: '272-43-56',
  hoursLabel: '8:00 AM – 9:00 PM',
  lat: 11.64498,
  lng: 122.30767,
  owner: 'Aldin B. Yasol',
  facebook: 'https://www.facebook.com/profile.php?id=100064116731058',
  facebookPost: 'https://www.facebook.com/share/p/1Dk33994tX/',
  maps: 'https://www.google.com/maps/search/?api=1&query=SolbayTea+Roxas+Avenue+Poblacion+Malinao+Aklan',
  rating: 4.5,
  cuisines: ['Milk tea', 'Filipino Food', 'Cafe', 'Pizza'],
}

export const CATEGORIES = [
  { id: 'classic', name: 'Classic Milktea' },
  { id: 'premium', name: 'Premium Milktea' },
  { id: 'oreo', name: 'Oreo Series' },
  { id: 'fruit', name: 'Fruit Tea' },
  { id: 'frappe', name: 'Frappes' },
  { id: 'coffee', name: 'Iced Coffee' },
  { id: 'hot', name: 'Hot Drinks' },
  { id: 'soda', name: 'Soda Drinks' },
  { id: 'cold', name: 'Cold Beverages' },
  { id: 'alcohol', name: 'Beers & Hard Drinks' },
  { id: 'tower', name: 'Tower Mixed Drinks' },
  { id: 'burger', name: 'Burgers' },
  { id: 'sandwich', name: 'Sandwiches' },
  { id: 'chicken', name: 'Chicken' },
  { id: 'pizza', name: 'Solbay Pizza' },
  { id: 'pasta', name: 'Solbay Pasta' },
  { id: 'pancit', name: 'Solbay Pancit' },
  { id: 'rice', name: 'Rice Meals' },
  { id: 'combo', name: 'Combo Meals' },
  { id: 'set99', name: '99 Set Meals' },
  { id: 'student', name: 'Student Meals' },
  { id: 'single', name: 'Single Order' },
  { id: 'sizzling', name: 'Sizzling Plate' },
  { id: 'sisig', name: 'Sisig' },
  { id: 'pica', name: 'Pica-pica' },
  { id: 'sabaw', name: 'Solbay Sabaw' },
  { id: 'salad', name: 'Salad & Dessert' },
  { id: 'party', name: 'Bilao & Paluto' },
]

export const DRINK_ADDONS = [
  { id: 'pearl', name: 'Tapioca pearl', price: 15 },
  { id: 'creamcheese', name: 'Cream cheese', price: 15 },
  { id: 'cheesecake', name: 'Cheese cake', price: 15 },
  { id: 'oreo', name: 'Oreo', price: 15 },
  { id: 'nata', name: 'Nata', price: 15 },
  { id: 'yakult', name: 'Yakult', price: 20 },
]

export const CLASSIC_SIZES = [
  { id: 'm', label: 'Medium', add: 0 },
  { id: 'l', label: 'Large', add: 20 },
  { id: '1l', label: '1 Liter', add: 50 },
]

export const PREMIUM_SIZES = [
  { id: 'm', label: 'Medium', add: 0 },
  { id: 'l', label: 'Large', add: 20 },
  { id: '1l', label: '1 Liter', add: 45 },
]

export const CUP_LARGE = [
  { id: 'm', label: 'Medium', add: 0 },
  { id: 'l', label: 'Large', add: 20 },
]

export const FRAPPE_SIZES = [
  { id: 'plain', label: 'Plain', add: 0 },
  { id: 'overload', label: 'Overload', add: 10 },
]

export const CUP_SIZES = CUP_LARGE

export const EXTRA_RICE = [{ id: 'rice', name: 'Extra rice', price: 25 }]

export const PIZZA_SIZES = [
  { id: 'solo', label: 'Solo 9"', add: 0 },
  { id: 'family', label: 'Family 12"', add: 150 },
]

export const SUGAR_LEVELS = [0, 25, 50, 75, 100]
export const ICE_LEVELS = ['No ice', 'Less ice', 'Normal', 'Extra ice']
export const SPICE_LEVELS = ['Not spicy', 'Mild', 'Spicy']

export const STATUS_FLOW = ['placed', 'accepted', 'preparing', 'ready', 'delivering', 'delivered']

export const STATUS_LABEL = {
  placed: 'Order placed',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready for rider',
  delivering: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const CUSTOMER_STATUS = {
  placed: 'Waiting for the shop to accept',
  accepted: 'The shop accepted your order',
  preparing: 'The kitchen is preparing your order',
  ready: 'Packed and waiting for the rider',
  delivering: 'Your rider is on the way',
  delivered: 'Delivered. Enjoy your meal.',
  cancelled: 'This order was cancelled',
}

export const NEXT_STATUS = {
  placed: 'accepted',
  accepted: 'preparing',
  preparing: 'ready',
  ready: 'delivering',
  delivering: 'delivered',
}

export const NEXT_LABEL = {
  placed: 'Accept order',
  accepted: 'Start preparing',
  preparing: 'Mark ready',
  ready: 'Out for delivery',
  delivering: 'Mark delivered',
}

function zone(id, name, fee, eta, lat, lng) {
  return { id, name, fee, eta, lat, lng }
}

export const ZONES = [
  zone('poblacion', 'Poblacion', 30, '25–35 min', 11.645, 122.3078),
  zone('biga-a', 'Biga-a', 40, '30–40 min', 11.652, 122.301),
  zone('banaybanay', 'Banaybanay', 40, '30–40 min', 11.6555, 122.312),
  zone('bulabud', 'Bulabud', 40, '30–45 min', 11.638, 122.2985),
  zone('cogon', 'Cogon', 40, '30–40 min', 11.641, 122.318),
  zone('san-roque', 'San Roque', 45, '30–45 min', 11.6488, 122.296),
  zone('lilo-an', 'Lilo-an', 45, '35–45 min', 11.633, 122.322),
  zone('rosario', 'Rosario', 50, '35–50 min', 11.6285, 122.3095),
  zone('kinalangay-viejo', 'Kinalangay Viejo', 50, '35–50 min', 11.66, 122.3),
  zone('kinalangay-nuevo', 'Kinalangay Nuevo', 50, '35–50 min', 11.6625, 122.3088),
  zone('navitas', 'Navitas', 55, '40–55 min', 11.6365, 122.289),
  zone('manhanip', 'Manhanip', 55, '40–55 min', 11.624, 122.294),
  zone('malandayon', 'Malandayon', 55, '40–55 min', 11.67, 122.318),
  zone('san-ramon', 'San Ramon', 55, '40–55 min', 11.6515, 122.326),
  zone('san-dimas', 'San Dimas', 55, '40–55 min', 11.619, 122.315),
  zone('osman', 'Osman', 55, '40–55 min', 11.658, 122.2895),
  zone('cabayugan', 'Cabayugan', 60, '40–55 min', 11.612, 122.301),
  zone('sipac', 'Sipac', 65, '45–60 min', 11.6755, 122.295),
  zone('sugnod', 'Sugnod', 65, '45–60 min', 11.608, 122.3225),
  zone('tambuan', 'Tambuan', 65, '45–60 min', 11.632, 122.332),
  zone('tigpalas', 'Tigpalas', 70, '45–65 min', 11.68, 122.3125),
  zone('dangcalan', 'Dangcalan', 70, '50–65 min', 11.6005, 122.308),
  zone('capataga', 'Capataga', 80, '55–75 min', 11.69, 122.3005),
]

export function defaultSettings() {
  return {
    acceptingOrders: true,
    openOverride: true,
    openTime: '08:00',
    closeTime: '21:00',
    announcement: 'Solbay Batchoy is on the menu. Bilao and paluto are available for sharing.',
    minOrder: 100,
    freeDeliveryOver: 499,
    phone: '09099869876',
    promo: { code: 'SOLB50', amount: 50, min: 300 },
    zones: ZONES.map((z) => ({ ...z })),
  }
}

export function phoneText(digits) {
  const d = String(digits || '').replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`
  return String(digits || '')
}

export function manilaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date)
  const read = (type) => Number(parts.find((part) => part.type === type)?.value)
  const hour = read('hour')
  const minute = read('minute')
  return {
    hour: Number.isFinite(hour) ? hour % 24 : 12,
    minute: Number.isFinite(minute) ? minute : 0,
  }
}

export function manilaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function minutesFromClock(value, fallback) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return fallback
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return fallback
  return hour * 60 + minute
}

export function formatClock(value) {
  const total = minutesFromClock(value, 8 * 60)
  const hour = Math.floor(total / 60)
  const minute = total % 60
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const shown = hour % 12 || 12
  return `${shown}:${String(minute).padStart(2, '0')} ${suffix}`
}

export function hoursText(settings) {
  return `${formatClock(settings?.openTime || '08:00')} – ${formatClock(settings?.closeTime || '21:00')}`
}

export function kmBetween(a, b) {
  const dLat = (a.lat - b.lat) * 110.574
  const dLng = (a.lng - b.lng) * 111.32 * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180)
  return Math.hypot(dLat, dLng)
}

export function defaultBranches() {
  return [{
    id: 'malinao',
    name: SHOP.branch,
    address: SHOP.address,
    lat: SHOP.lat,
    lng: SHOP.lng,
  }]
}

export function readPin(raw, origins = [SHOP], limitKm = 30) {
  const lat = Number(raw?.lat)
  const lng = Number(raw?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const pin = {
    lat: Math.round(lat * 1e5) / 1e5,
    lng: Math.round(lng * 1e5) / 1e5,
  }
  const spots = origins?.length ? origins : [SHOP]
  if (spots.some((spot) => kmBetween(pin, spot) <= limitKm)) return pin
  return {
    error: limitKm > 30
      ? 'Drop the pin on the branch, in Aklan or a nearby province.'
      : 'Drop the pin within 30 km of a SolbayTea branch.',
  }
}

export function withinPostedHours(settings, date = new Date()) {
  const open = minutesFromClock(settings?.openTime, 8 * 60)
  const close = minutesFromClock(settings?.closeTime, 21 * 60)
  const now = manilaParts(date)
  const minute = now.hour * 60 + now.minute
  if (open === close) return true
  if (open < close) return minute >= open && minute < close
  return minute >= open || minute < close
}

export function orderingOpen(settings, date = new Date()) {
  if (!settings?.acceptingOrders) return false
  if (settings.openOverride) return true
  return withinPostedHours(settings, date)
}

export function orderBlock(user) {
  if (user?.standing === 'archived') return 'This account is archived, so it cannot place orders.'
  if (user?.standing === 'blacklisted') return 'This account is blacklisted, so it cannot place orders.'
  return ''
}

export function validateSelection(item, raw) {
  if (!item?.available) {
    throw new Error(`${item?.name || 'An item'} is sold out.`)
  }
  const qty = Number(raw?.qty ?? 1)
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
    throw new Error('Quantity must be from 1 to 20.')
  }
  let sizeId = raw?.sizeId || null
  if (item.sizes?.length) {
    if (!item.sizes.some((s) => s.id === sizeId)) {
      throw new Error(`Choose a size for ${item.name}.`)
    }
  } else {
    sizeId = null
  }
  const addonIds = []
  for (const id of raw?.addonIds || []) {
    if (!item.addons?.some((a) => a.id === id)) {
      throw new Error(`Unknown add-on on ${item.name}.`)
    }
    if (!addonIds.includes(id)) addonIds.push(id)
  }
  let sugar = null
  if (item.sugar) {
    sugar = Number(raw?.sugar ?? 50)
    if (!SUGAR_LEVELS.includes(sugar)) throw new Error('Choose a sugar level.')
  }
  let ice = null
  if (item.ice) {
    ice = raw?.ice || 'Normal'
    if (!ICE_LEVELS.includes(ice)) throw new Error('Choose an ice level.')
  }
  let spice = null
  if (item.spice) {
    spice = raw?.spice || 'Not spicy'
    if (!SPICE_LEVELS.includes(spice)) throw new Error('Choose a spice level.')
  }
  const note = String(raw?.note || '').trim().slice(0, 140)
  return { sizeId, addonIds, sugar, ice, spice, note, qty }
}

export function unitPrice(item, selection) {
  let price = item.price
  if (selection.sizeId) {
    price += item.sizes.find((s) => s.id === selection.sizeId)?.add || 0
  }
  for (const id of selection.addonIds || []) {
    price += item.addons.find((a) => a.id === id)?.price || 0
  }
  return price
}

export function describeSelection(item, selection) {
  const parts = []
  if (selection.sizeId) {
    const size = item.sizes.find((s) => s.id === selection.sizeId)
    if (size) parts.push(size.label)
  }
  if (selection.sugar != null) parts.push(`${selection.sugar}% sugar`)
  if (selection.ice) parts.push(selection.ice)
  if (selection.spice) parts.push(selection.spice)
  for (const id of selection.addonIds || []) {
    const addon = item.addons.find((a) => a.id === id)
    if (addon) parts.push(addon.name)
  }
  if (selection.note) parts.push(selection.note)
  return parts.join(' · ')
}

export function selectionKey(itemId, selection) {
  return JSON.stringify({
    itemId,
    sizeId: selection.sizeId,
    addonIds: [...(selection.addonIds || [])].sort(),
    sugar: selection.sugar,
    ice: selection.ice,
    spice: selection.spice,
    note: selection.note || '',
  })
}

export function quote({ lines, zone, settings, promoCode }) {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0)
  let deliveryFee = zone ? zone.fee : 0
  if (settings?.freeDeliveryOver > 0 && subtotal >= settings.freeDeliveryOver) deliveryFee = 0
  let discount = 0
  let promoError = ''
  const code = String(promoCode || '').trim().toUpperCase()
  if (code) {
    const promo = settings?.promo
    if (!promo || code !== String(promo.code || '').toUpperCase()) {
      promoError = 'That promo code is not valid.'
    } else if (subtotal < promo.min) {
      promoError = `Spend ₱${promo.min} before delivery to use ${promo.code}.`
    } else {
      discount = Math.min(promo.amount, subtotal)
    }
  }
  const total = Math.max(0, subtotal + deliveryFee - discount)
  const minShortfall = Math.max(0, (settings?.minOrder || 0) - subtotal)
  return {
    subtotal,
    deliveryFee,
    discount,
    total,
    promoError,
    minShortfall,
    promoCode: discount ? code : '',
  }
}
