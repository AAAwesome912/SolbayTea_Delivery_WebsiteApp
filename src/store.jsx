import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { describeSelection, selectionKey, unitPrice, validateSelection } from '../shared/shop.js'
import { api } from './api.js'

const StoreContext = createContext(null)
const CART_KEY = 'solbay-cart'
const ZONE_KEY = 'solbay-zone'
const BRANCH_KEY = 'solbay-branch'

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function StoreProvider({ children }) {
  const [menu, setMenu] = useState([])
  const [settings, setSettings] = useState(null)
  const [orders, setOrders] = useState([])
  const [directory, setDirectory] = useState([])
  const [branches, setBranches] = useState([])
  const [user, setUser] = useState(null)
  const [cart, setCart] = useState(readCart)
  const [zoneId, setZoneIdState] = useState(() => localStorage.getItem(ZONE_KEY) || 'poblacion')
  const [branchId, setBranchIdState] = useState(() => localStorage.getItem(BRANCH_KEY) || 'malinao')
  const [booting, setBooting] = useState(true)
  const [offline, setOffline] = useState(false)
  const [bootError, setBootError] = useState('')
  const revision = useRef(0)

  function apply(data, force = false) {
    if (!data) return
    if (!force && typeof data.revision === 'number' && data.revision <= revision.current) return
    if (typeof data.revision === 'number') revision.current = data.revision
    if (data.menu) setMenu((prev) => (same(prev, data.menu) ? prev : data.menu))
    if (data.settings) setSettings((prev) => (same(prev, data.settings) ? prev : data.settings))
    if (data.orders) setOrders((prev) => (same(prev, data.orders) ? prev : data.orders))
    if ('user' in data) setUser((prev) => (same(prev, data.user || null) ? prev : data.user || null))
    if (Array.isArray(data.directory)) {
      setDirectory((prev) => (same(prev, data.directory) ? prev : data.directory))
    }
    if (Array.isArray(data.branches)) {
      setBranches((prev) => (same(prev, data.branches) ? prev : data.branches))
    }
  }

  async function reload(force = false) {
    const data = await api('/bootstrap')
    apply(data, force)
    return data
  }

  useEffect(() => {
    let stop = false
    reload(true)
      .then(() => {
        if (!stop) setOffline(false)
      })
      .catch(async (error) => {
        if (stop) return
        if (error.status === 401) {
          localStorage.removeItem('solbay-token')
          revision.current = 0
          try {
            await reload(true)
            setOffline(false)
            return
          } catch (next) {
            setBootError(next.message)
            setOffline(true)
            return
          }
        }
        setBootError(error.message)
        setOffline(true)
      })
      .finally(() => {
        if (!stop) setBooting(false)
      })
    const timer = setInterval(() => {
      if (!document.hidden) {
        reload().catch((error) => {
          if (error.status === 401) {
            localStorage.removeItem('solbay-token')
            revision.current = 0
            reload(true).catch(() => {})
          }
        })
      }
    }, 4000)
    return () => {
      stop = true
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    if (!menu.length) return
    setCart((prev) => {
      const next = prev.flatMap((line) => {
        const item = menu.find((entry) => entry.id === line.itemId)
        if (!item?.available) return []
        try {
          const selection = validateSelection(item, { ...line.selection, qty: 1 })
          return [{
            ...line,
            name: item.name,
            emoji: item.emoji,
            unitPrice: unitPrice(item, selection),
            optionsLabel: describeSelection(item, selection),
            selection,
          }]
        } catch {
          return []
        }
      })
      return same(prev, next) ? prev : next
    })
  }, [menu])

  function setZoneId(id) {
    setZoneIdState(id)
    localStorage.setItem(ZONE_KEY, id)
  }

  function setBranchId(id) {
    setBranchIdState(id)
    localStorage.setItem(BRANCH_KEY, id)
  }

  useEffect(() => {
    if (!branches.length) return
    if (!branches.some((entry) => entry.id === branchId)) setBranchId(branches[0].id)
  }, [branches, branchId])

  async function login(email, password) {
    const data = await api('/login', { method: 'POST', body: { email, password } })
    localStorage.setItem('solbay-token', data.token)
    apply(data, true)
    return data.user
  }

  async function requestCode(input) {
    return api('/register/code', { method: 'POST', body: input })
  }

  async function register(input) {
    const data = await api('/register', { method: 'POST', body: input })
    localStorage.setItem('solbay-token', data.token)
    apply(data, true)
    return data.user
  }

  async function logout() {
    try {
      await api('/logout', { method: 'POST', body: {} })
    } catch {
      /* clear the local session either way */
    }
    localStorage.removeItem('solbay-token')
    revision.current = 0
    setUser(null)
    setOrders([])
    setDirectory([])
    await reload(true)
  }

  function addToCart(item, raw, qty = 1) {
    const selection = validateSelection(item, { ...raw, qty: 1 })
    const key = selectionKey(item.id, selection)
    setCart((prev) => {
      const found = prev.find((line) => line.key === key)
      if (found) {
        return prev.map((line) => (
          line.key === key ? { ...line, qty: Math.min(20, line.qty + qty) } : line
        ))
      }
      return [...prev, {
        key,
        itemId: item.id,
        name: item.name,
        emoji: item.emoji,
        qty,
        unitPrice: unitPrice(item, selection),
        optionsLabel: describeSelection(item, selection),
        selection,
      }]
    })
  }

  function setQty(key, qty) {
    setCart((prev) => prev.flatMap((line) => {
      if (line.key !== key) return [line]
      if (qty < 1) return []
      return [{ ...line, qty: Math.min(20, qty) }]
    }))
  }

  function clearCart() {
    setCart([])
  }

  async function placeOrder(input) {
    const data = await api('/orders', { method: 'POST', body: input })
    apply(data, true)
    setCart([])
    return data.order
  }

  async function saveAddress(input) {
    const data = await api('/account', { method: 'PATCH', body: input })
    apply(data, true)
  }

  async function updateOrder(id, patch) {
    const data = await api(`/orders/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch })
    apply(data, true)
    return data.order
  }

  async function saveMenuItem(item) {
    const data = item.id
      ? await api(`/menu/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: item })
      : await api('/menu', { method: 'POST', body: item })
    apply(data, true)
  }

  async function setAvailability(id, available) {
    const data = await api(`/menu/${encodeURIComponent(id)}`, { method: 'PATCH', body: { available } })
    apply(data, true)
  }

  async function deleteMenuItem(id) {
    const data = await api(`/menu/${encodeURIComponent(id)}`, { method: 'DELETE' })
    apply(data, true)
  }

  async function saveStaff(input) {
    const data = await api('/team', { method: 'POST', body: input })
    apply(data, true)
  }

  async function deleteStaff(id) {
    const data = await api(`/team/${encodeURIComponent(id)}`, { method: 'DELETE' })
    apply(data, true)
  }

  async function saveBranch(input) {
    const data = input.id
      ? await api(`/branches/${encodeURIComponent(input.id)}`, { method: 'PATCH', body: input })
      : await api('/branches', { method: 'POST', body: input })
    apply(data, true)
  }

  async function deleteBranch(id) {
    const data = await api(`/branches/${encodeURIComponent(id)}`, { method: 'DELETE' })
    apply(data, true)
  }

  async function setCustomerStanding(id, standing) {
    const data = await api(`/customers/${encodeURIComponent(id)}`, { method: 'PATCH', body: { standing } })
    apply(data, true)
  }

  async function saveSettings(input) {
    const data = await api('/settings', { method: 'PATCH', body: input })
    apply(data, true)
  }

  async function resetDemo() {
    await api('/reset', { method: 'POST', body: {} })
    localStorage.removeItem('solbay-token')
    revision.current = 0
    setUser(null)
    await reload(true)
  }

  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0)
  const value = useMemo(() => ({
    menu,
    settings,
    orders,
    directory,
    branches,
    user,
    cart,
    cartCount,
    zoneId,
    branchId,
    booting,
    offline,
    bootError,
    setZoneId,
    setBranchId,
    login,
    requestCode,
    register,
    logout,
    addToCart,
    setQty,
    clearCart,
    placeOrder,
    updateOrder,
    saveAddress,
    saveMenuItem,
    setAvailability,
    deleteMenuItem,
    saveStaff,
    deleteStaff,
    saveBranch,
    deleteBranch,
    setCustomerStanding,
    saveSettings,
    resetDemo,
    reload,
  }), [menu, settings, orders, directory, branches, user, cart, cartCount, zoneId, branchId, booting, offline, bootError])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore must be used inside StoreProvider')
  return value
}
