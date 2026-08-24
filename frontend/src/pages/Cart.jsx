import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { FiArrowRight, FiMinus, FiPlus, FiShoppingCart, FiTrash2 } from 'react-icons/fi'
import { removeItem, selectCartItems, selectCartTotal, setQuantity } from '../features/cartSlice'
import { fmtMoney } from '../utils/format'

export default function Cart() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const items = useSelector(selectCartItems)
  const total = useSelector(selectCartTotal)
  const token = useSelector((s) => s.auth.token)

  if (items.length === 0) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-400">
          <FiShoppingCart size={28} />
        </span>
        <h2 className="text-xl font-bold text-slate-800">Your cart is empty</h2>
        <p className="mt-1 text-sm text-slate-500">Browse the catalog and add some goodies.</p>
        <Link to="/products" className="btn-primary mt-6">
          Start shopping <FiArrowRight />
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-800">Shopping cart</h1>
        {items.map((item) => (
          <div key={item.product_id} className="card flex items-center gap-4 !p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 font-semibold text-indigo-500">
              {item.product_id}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-800">{item.product_name}</p>
              <p className="text-sm text-slate-500">{fmtMoney(item.unit_price)} each</p>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1">
              <button
                onClick={() =>
                  dispatch(setQuantity({ product_id: item.product_id, quantity: item.quantity - 1 }))
                }
                className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <FiMinus size={14} />
              </button>
              <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
              <button
                onClick={() =>
                  dispatch(setQuantity({ product_id: item.product_id, quantity: item.quantity + 1 }))
                }
                className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <FiPlus size={14} />
              </button>
            </div>
            <p className="w-20 text-right font-semibold text-slate-800">
              {fmtMoney(item.unit_price * item.quantity)}
            </p>
            <button
              onClick={() => dispatch(removeItem(item.product_id))}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Remove"
            >
              <FiTrash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <aside className="card h-fit space-y-4">
        <h2 className="font-bold text-slate-800">Order summary</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Items</dt>
            <dd>{items.reduce((n, i) => n + i.quantity, 0)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold text-slate-800">
            <dt>Total</dt>
            <dd className="text-indigo-600">{fmtMoney(total)}</dd>
          </div>
        </dl>
        <button onClick={() => navigate(token ? '/checkout' : '/login', { state: { from: '/checkout' } })} className="btn-primary w-full">
          Proceed to checkout <FiArrowRight />
        </button>
        {!token && (
          <p className="text-center text-xs text-slate-400">
            You&apos;ll need to register or log in before placing the order.
          </p>
        )}
      </aside>
    </div>
  )
}
