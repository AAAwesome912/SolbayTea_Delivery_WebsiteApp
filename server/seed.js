import {
  SHOP,
  defaultBranches,
  defaultSettings,
  describeSelection,
  quote,
  unitPrice,
  validateSelection,
} from '../shared/shop.js'
import { menuSeed } from './menu.js'

function line(menu, itemId, raw) {
  const item = menu.find((entry) => entry.id === itemId)
  const selection = validateSelection(item, raw)
  return {
    itemId: item.id,
    name: item.name,
    emoji: item.emoji,
    qty: selection.qty,
    unitPrice: unitPrice(item, selection),
    optionsLabel: describeSelection(item, selection),
    selection,
  }
}

function buildOrder({ id, menu, settings, customer, zoneId, payment, status, createdAt, items, timeline, notes }) {
  const zone = settings.zones.find((entry) => entry.id === zoneId)
  const priced = items.map((item) => line(menu, item.itemId, item))
  const totals = quote({ lines: priced, zone, settings, promoCode: '' })
  return {
    id,
    customerId: customer.id,
    customerName: customer.name,
    phone: customer.phone,
    barangayId: zone.id,
    barangayName: zone.name,
    address: customer.address,
    landmark: customer.landmark || '',
    dropLat: customer.pinLat,
    dropLng: customer.pinLng,
    branchId: 'malinao',
    branchName: SHOP.branch,
    branchAddress: SHOP.address,
    branchLat: SHOP.lat,
    branchLng: SHOP.lng,
    notes: notes || '',
    utensils: true,
    payment,
    paymentStatus: payment === 'gcash' ? 'pending' : status === 'delivered' ? 'paid' : 'unpaid',
    items: priced,
    subtotal: totals.subtotal,
    deliveryFee: totals.deliveryFee,
    discount: totals.discount,
    total: totals.total,
    promoCode: '',
    status,
    cancelReason: '',
    eta: zone.eta,
    timeline,
    createdAt,
    updatedAt: timeline[timeline.length - 1].at,
  }
}

export function createDb() {
  const now = Date.now()
  const menu = menuSeed()
  const settings = defaultSettings()
  const users = [
    {
      id: 'u-admin',
      name: 'Aldin Yasol',
      email: 'admin@solbaytea.ph',
      password: 'admin123',
      role: 'admin',
      phone: '09099869876',
      address: '',
      landmark: '',
      barangayId: 'poblacion',
      pinLat: null,
      pinLng: null,
      branchId: 'malinao',
    },
    {
      id: 'u-staff',
      name: 'Solbay Staff',
      email: 'staff@solbaytea.ph',
      password: 'staff123',
      role: 'staff',
      phone: '09180001111',
      address: '',
      landmark: '',
      barangayId: 'poblacion',
      pinLat: null,
      pinLng: null,
      branchId: 'malinao',
    },
    {
      id: 'u-maria',
      name: 'Maria Santos',
      email: 'maria@email.com',
      password: 'customer123',
      role: 'customer',
      phone: '09171234567',
      address: '12 Rizal Street',
      landmark: 'Near the plaza',
      barangayId: 'poblacion',
      pinLat: 11.6454,
      pinLng: 122.3086,
    },
    {
      id: 'u-juan',
      name: 'Juan Dela Cruz',
      email: 'juan@email.com',
      password: 'customer123',
      role: 'customer',
      phone: '09181234567',
      address: 'Sitio road, beside the chapel',
      landmark: 'Blue gate',
      barangayId: 'bulabud',
      pinLat: 11.6374,
      pinLng: 122.2991,
    },
  ]
  const maria = users[2]
  const juan = users[3]
  const active = buildOrder({
    id: 'SB-1001',
    menu,
    settings,
    customer: maria,
    zoneId: 'poblacion',
    payment: 'gcash',
    status: 'preparing',
    createdAt: now - 12 * 60 * 1000,
    notes: 'Please separate the sauce.',
    items: [
      { itemId: 'mt-salted-caramel', qty: 1, sizeId: 'l', addonIds: ['pearl'], sugar: 50, ice: 'Less ice' },
      { itemId: 'sg-pork', qty: 1 },
    ],
    timeline: [
      { status: 'placed', at: now - 12 * 60 * 1000, by: maria.name },
      { status: 'accepted', at: now - 10 * 60 * 1000, by: 'Solbay Staff' },
      { status: 'preparing', at: now - 8 * 60 * 1000, by: 'Solbay Staff' },
    ],
  })
  const incoming = buildOrder({
    id: 'SB-1002',
    menu,
    settings,
    customer: juan,
    zoneId: 'bulabud',
    payment: 'cod',
    status: 'placed',
    createdAt: now - 3 * 60 * 1000,
    items: [
      { itemId: 'sb-lomi', qty: 2 },
      { itemId: 'mt-wintermelon', qty: 1, sizeId: 'm', sugar: 50, ice: 'Normal' },
    ],
    timeline: [{ status: 'placed', at: now - 3 * 60 * 1000, by: juan.name }],
  })
  active.paymentStatus = 'confirmed'
  const past = buildOrder({
    id: 'SB-1000',
    menu,
    settings,
    customer: maria,
    zoneId: 'poblacion',
    payment: 'cod',
    status: 'delivered',
    createdAt: now - 26 * 60 * 60 * 1000,
    items: [
      { itemId: 'pm-okinawa', qty: 2, sizeId: 'm', sugar: 25, ice: 'Normal' },
      { itemId: 'pc-fries', qty: 1 },
    ],
    timeline: [
      { status: 'placed', at: now - 26 * 60 * 60 * 1000, by: maria.name },
      { status: 'accepted', at: now - 26 * 60 * 60 * 1000 + 2 * 60 * 1000, by: 'Solbay Staff' },
      { status: 'preparing', at: now - 26 * 60 * 60 * 1000 + 4 * 60 * 1000, by: 'Solbay Staff' },
      { status: 'ready', at: now - 26 * 60 * 60 * 1000 + 16 * 60 * 1000, by: 'Solbay Staff' },
      { status: 'delivering', at: now - 26 * 60 * 60 * 1000 + 18 * 60 * 1000, by: 'Solbay Staff' },
      { status: 'delivered', at: now - 26 * 60 * 60 * 1000 + 40 * 60 * 1000, by: 'Solbay Staff' },
    ],
  })

  return {
    revision: 1,
    seq: 1003,
    users,
    branches: defaultBranches(),
    menu,
    orders: [incoming, active, past],
    sessions: [],
    challenges: [],
    settings,
  }
}
