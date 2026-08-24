import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { FiCheckCircle } from 'react-icons/fi'
import { clearCart, selectCartItems, selectCartTotal } from '../features/cartSlice'
import { placeOrder, resetPlacement } from '../features/ordersSlice'
import { pushToast } from '../features/uiSlice'
import { fmtMoney } from '../utils/format'

export default function Checkout() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const items = useSelector(selectCartItems)
  const total = useSelector(selectCartTotal)
  const user = useSelector((s) => s.auth.user)
  const { placeStatus, placeError, lastPlacement } = useSelector((s) => s.orders)

  const [country, setCountry] = useState(user?.customer_id ? '' : '')

  if (items.length === 0 && placeStatus !== 'succeeded') {
    return (
      <div className="card mx-auto max-w-md text-center">
        <p className="font-semibold text-slate-700">Your cart is empty.</p>
        <Link to="/products" className="btn-primary mt-4">
          Back to catalog
        </Link>
      </div>
    )
  }

  if (placeStatus === 'succeeded' && lastPlacement) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <FiCheckCircle size={32} />
        </span>
        <h2 className="text-xl font-bold text-slate-800">Order placed!</h2>
        <p className="mt-1 text-sm text-slate-500">
          Order <span className="font-semibold text-indigo-600">#{lastPlacement.order_id}</span> —{' '}
          {fmtMoney(lastPlacement.total)}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              dispatch(resetPlacement())
              navigate('/account')
            }}
            className="btn-secondary"
          >
            View my orders
          </button>
          <button
            onClick={() => {
              dispatch(resetPlacement())
              navigate('/products')
            }}
            className="btn-primary"
          >
            Keep shopping
          </button>
        </div>
      </div>
    )
  }

  const submit = async () => {
    try {
      await dispatch(
        placeOrder({
          ship_country: country || null,
          items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        })
      ).unwrap()
      dispatch(clearCart())
      dispatch(pushToast({ type: 'success', message: 'Your order has been placed.' }))
    } catch {
      /* error rendered inline */
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Checkout</h1>
        <p className="text-sm text-slate-500">
          Ordering as <span className="font-medium text-indigo-600">{user?.username}</span> (customer{' '}
          {user?.customer_id})
        </p>
      </div>

      {placeError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{placeError}</div>
      )}

      <div className="card space-y-3">
        <h2 className="font-semibold text-slate-800">Shipping</h2>
        <div>
          <label className="label">Ship-to country (optional)</label>
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Norway" className="input" />
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-slate-800">{items.length} item(s)</h2>
        {items.map((item) => (
          <div key={item.product_id} className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              {item.quantity} × {item.product_name}
            </span>
            <span className="font-medium">{fmtMoney(item.unit_price * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-slate-100 pt-3 font-bold text-slate-800">
          <span>Total</span>
          <span className="text-indigo-600">{fmtMoney(total)}</span>
        </div>
      </div>

      <button onClick={submit} disabled={placeStatus === 'loading'} className="btn-primary w-full !py-3">
        {placeStatus === 'loading' ? 'Placing order…' : `Place order · ${fmtMoney(total)}`}
      </button>
    </div>
  )
}
