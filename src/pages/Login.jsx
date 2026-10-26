import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store.jsx'

const DEMOS = [
  { role: 'Customer', email: 'maria@email.com', password: 'customer123', text: 'Browse, order, and track a delivery.' },
  { role: 'Staff', email: 'staff@solbaytea.ph', password: 'staff123', text: 'Accept tickets, cook, and dispatch the rider.' },
  { role: 'Admin', email: 'admin@solbaytea.ph', password: 'admin123', text: 'Menu, team, fees, hours, and sales.' },
]

const AGREEMENT = 'I agree that Solbay Tea may use my name, mobile number, email, delivery address, and orders to prepare and deliver food, contact me about an order, and keep the shop’s records.'

export function Login() {
  const { login, register, requestCode } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('signin')
  const [step, setStep] = useState('form')
  const [channel, setChannel] = useState('phone')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [challengeId, setChallengeId] = useState('')
  const [previewCode, setPreviewCode] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function go(user) {
    const from = location.state?.from
    if (user.role === 'admin') navigate('/admin', { replace: true })
    else if (user.role === 'staff') navigate('/staff', { replace: true })
    else navigate(from || '/', { replace: true })
  }

  function showSignIn() {
    setMode('signin')
    setStep('form')
    setError('')
  }

  async function submit(event, override) {
    event?.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (override) {
        const user = await login(override.email, override.password)
        go(user)
        return
      }
      if (mode === 'register' && step === 'form') {
        const sent = await requestCode({ name, email, password, phone, channel, consent })
        setChallengeId(sent.challengeId)
        setPreviewCode(sent.previewCode)
        setSentTo(sent.sentTo)
        setCode('')
        setStep('code')
        setBusy(false)
        return
      }
      if (mode === 'register') {
        const user = await register({ challengeId, code })
        go(user)
        return
      }
      const user = await login(email, password)
      go(user)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const verifying = mode === 'register' && step === 'code'

  return (
    <div className="auth">
      <div>
        <h1>Three desks, one shop</h1>
        <p className="muted">Customers order like a delivery app. Staff run the kitchen. Admin runs the menu, team, and fees. These demo accounts share the same orders on this computer.</p>
        <div className="rolecards">
          {DEMOS.map((demo) => (
            <button key={demo.role} type="button" disabled={busy} onClick={(event) => submit(event, demo)}>
              <strong>{demo.role}</strong>
              <span>{demo.text}</span>
              <small>{demo.email}</small>
            </button>
          ))}
        </div>
      </div>
      <form className="card" onSubmit={(event) => submit(event)}>
        <div className="seg">
          <button type="button" className={mode === 'signin' ? 'on' : ''} onClick={showSignIn}>Sign in</button>
          <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setStep('form'); setError('') }}>Create account</button>
        </div>
        {mode === 'register' && !verifying && (
          <label className="field">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
        )}
        {!verifying && (
          <label className="field">
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
        )}
        {!verifying && (
          <label className="field">
            Password
            <span className="secret">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
              <button
                className="eye"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <Eye off={showPassword} />
              </button>
            </span>
          </label>
        )}
        {mode === 'register' && !verifying && (
          <>
            <div className="seg">
              <button type="button" className={channel === 'phone' ? 'on' : ''} onClick={() => setChannel('phone')}>Text my mobile</button>
              <button type="button" className={channel === 'email' ? 'on' : ''} onClick={() => setChannel('email')}>Email me a code</button>
            </div>
            <label className="field">
              Mobile
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="09XXXXXXXXX"
                inputMode="numeric"
                required={channel === 'phone'}
              />
            </label>
            <label className="check agree">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required />
              <span>{AGREEMENT}</span>
            </label>
            <p className="fine">This shop computer cannot send texts or email yet, so the 6-digit code appears on the next step. You still have to type it.</p>
          </>
        )}
        {verifying && (
          <>
            <p className="muted">
              {channel === 'phone' ? `Text code for ${sentTo}.` : `Email code for ${sentTo}.`} Type the 6 digits below. It expires in 10 minutes.
            </p>
            <p className="otp" aria-label="Verification code">{previewCode}</p>
            <label className="field">
              Code
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                required
                minLength={6}
              />
            </label>
            <button className="btn ghost" type="button" onClick={() => { setStep('form'); setError('') }}>Change details</button>
          </>
        )}
        {error && <p className="alert">{error}</p>}
        <button className="btn primary block" type="submit" disabled={busy || (mode === 'register' && !verifying && !consent)}>
          {busy ? 'Please wait…' : verifying ? 'Create customer account' : mode === 'register' ? 'Send code' : 'Sign in'}
        </button>
        <p className="fine">New accounts are customers. Staff accounts are added from the admin desk. Passwords stay on this shop server for the demo.</p>
      </form>
    </div>
  )
}

function Eye({ off }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      {off && <path d="M5 19L19 5" stroke="currentColor" strokeWidth="1.7" />}
    </svg>
  )
}
