import { manilaDateKey } from '../shared/shop.js'

export function itemGroup(item) {
  return item?.kind === 'drink' ? 'drinks' : 'food'
}

export function matchingAmount(order, menu, group) {
  if (order.status === 'cancelled') return 0
  if (group === 'all') return order.total
  return order.items.reduce((sum, line) => {
    const item = menu.find((entry) => entry.id === line.itemId)
    if (itemGroup(item) !== group) return sum
    return sum + line.unitPrice * line.qty
  }, 0)
}

export function orderHasGroup(order, menu, group) {
  if (group === 'all') return true
  return order.items.some((line) => itemGroup(menu.find((entry) => entry.id === line.itemId)) === group)
}

export function inPeriod(ts, period, value) {
  const key = manilaDateKey(ts)
  if (period === 'day') return key === value
  if (period === 'month') return key.slice(0, 7) === value
  return key.slice(0, 4) === String(value)
}
