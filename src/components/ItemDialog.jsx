import { useEffect, useState } from 'react'
import { ICE_LEVELS, SPICE_LEVELS, SUGAR_LEVELS, describeSelection, unitPrice } from '../../shared/shop.js'
import { Thumb } from './Thumb.jsx'
import { peso } from '../format.js'
import { useStore } from '../store.jsx'

export function ItemDialog({ item, onClose }) {
  const { addToCart } = useStore()
  const [sizeId, setSizeId] = useState(item.sizes?.[0]?.id || null)
  const [sugar, setSugar] = useState(50)
  const [ice, setIce] = useState('Normal')
  const [spice, setSpice] = useState('Not spicy')
  const [addonIds, setAddonIds] = useState([])
  const [note, setNote] = useState('')
  const [qty, setQty] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const selection = {
    sizeId,
    sugar: item.sugar ? sugar : null,
    ice: item.ice ? ice : null,
    spice: item.spice ? spice : null,
    addonIds,
    note,
    qty: 1,
  }
  const price = unitPrice(item, selection)

  function toggleAddon(id) {
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]))
  }

  function add() {
    try {
      addToCart(item, selection, qty)
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="overlay sheet" onClick={onClose}>
      <div
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panel-head">
          <Thumb item={item} size="lg" />
          <div>
            <h2 id="item-title">{item.name}</h2>
            {item.description && <p>{item.description}</p>}
          </div>
          <button className="iconbtn" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>

        {item.sizes?.length > 0 && (
          <fieldset>
            <legend>Size</legend>
            <div className="choices">
              {item.sizes.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  className={sizeId === size.id ? 'on' : ''}
                  onClick={() => setSizeId(size.id)}
                >
                  {size.label}
                  <small>{size.add ? `+${peso(size.add)}` : peso(item.price)}</small>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {item.sugar && (
          <fieldset>
            <legend>Sugar</legend>
            <div className="choices">
              {SUGAR_LEVELS.map((level) => (
                <button key={level} type="button" className={sugar === level ? 'on' : ''} onClick={() => setSugar(level)}>
                  {level}%
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {item.ice && (
          <fieldset>
            <legend>Ice</legend>
            <div className="choices">
              {ICE_LEVELS.map((level) => (
                <button key={level} type="button" className={ice === level ? 'on' : ''} onClick={() => setIce(level)}>
                  {level}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {item.spice && (
          <fieldset>
            <legend>Spice</legend>
            <div className="choices">
              {SPICE_LEVELS.map((level) => (
                <button key={level} type="button" className={spice === level ? 'on' : ''} onClick={() => setSpice(level)}>
                  {level}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {item.addons?.length > 0 && (
          <fieldset>
            <legend>Add-ons</legend>
            <div className="choices">
              {item.addons.map((addon) => (
                <button
                  key={addon.id}
                  type="button"
                  className={addonIds.includes(addon.id) ? 'on' : ''}
                  onClick={() => toggleAddon(addon.id)}
                >
                  {addon.name}
                  <small>+{peso(addon.price)}</small>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <label className="field">
          Note for the kitchen
          <input value={note} maxLength={140} onChange={(event) => setNote(event.target.value)} placeholder="Less sweet, no onions…" />
        </label>
        {selection.note || describeSelection(item, selection) ? (
          <p className="muted">{describeSelection(item, { ...selection, note })}</p>
        ) : null}
        {error && <p className="alert">{error}</p>}

        <div className="panel-foot">
          <div className="stepper">
            <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))} aria-label="Decrease quantity">−</button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty((n) => Math.min(20, n + 1))} aria-label="Increase quantity">+</button>
          </div>
          <button className="btn primary" type="button" onClick={add}>
            Add {peso(price * qty)}
          </button>
        </div>
      </div>
    </div>
  )
}
