export function peso(n) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(Math.round(Number(n) || 0))
}

export function ago(ts) {
  const seconds = Math.max(0, Date.now() - ts) / 1000
  if (seconds < 45) return 'Just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export function clock(ts) {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ts))
}

export function paymentLabel(order) {
  if (order.payment === 'gcash') {
    if (order.paymentStatus === 'pending') return 'GCash · waiting for confirmation'
    if (order.paymentStatus === 'confirmed') return 'GCash · confirmed'
    return 'GCash · paid'
  }
  return order.paymentStatus === 'paid' ? 'Cash · paid' : 'Cash on delivery'
}
