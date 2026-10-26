export function Logo() {
  return (
    <span className="brand">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <rect width="40" height="40" rx="12" fill="#5c3317" />
        <path d="M11 16h14.5v8.2a7.2 7.2 0 0 1-14.5 0V16z" fill="#fff7ee" />
        <path d="M25.5 18.2h3.2a2.8 2.8 0 0 1 0 5.6h-3.2" fill="none" stroke="#fff7ee" strokeWidth="1.7" />
        <path d="M15.5 12.2c.8 1.6.8 1.6 0 3.2M19.2 11c.8 1.6.8 1.6 0 3.2" fill="none" stroke="#e39a3c" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span>
        <strong>SolbayTea</strong>
        <small>Malinao</small>
      </span>
    </span>
  )
}
