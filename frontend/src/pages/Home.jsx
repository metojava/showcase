import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiShield, FiShoppingCart, FiTruck, FiZap } from 'react-icons/fi'
import * as FiIcons from 'react-icons/fi'
import { fetchCategories } from '../features/categoriesSlice'
import { fetchProducts } from '../features/productsSlice'
import { addItem } from '../features/cartSlice'
import { pushToast } from '../features/uiSlice'
import { fmtMoney, iconForCategory } from '../utils/format'

const PERKS = [
  { icon: FiTruck, title: 'Worldwide shipping', text: 'We deliver across 20+ countries' },
  { icon: FiShield, title: 'Secure checkout', text: 'JWT-protected order placement' },
  { icon: FiZap, title: 'Live stock data', text: 'Powered by the Northwind database' },
]

export default function Home() {
  const dispatch = useDispatch()
  const categories = useSelector((s) => s.categories.items)
  const products = useSelector((s) => s.products.items)
  const status = useSelector((s) => s.products.status)

  useEffect(() => {
    dispatch(fetchCategories())
    dispatch(fetchProducts({ limit: 8, sort: 'stock' }))
  }, [dispatch])

  const addToCart = (product) => {
    dispatch(addItem({ product }))
    dispatch(pushToast({ type: 'success', message: `${product.product_name} added to cart` }))
  }

  return (
    <div className="space-y-14">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 px-8 py-16 text-center text-white shadow-xl shadow-indigo-200">
        <h1 className="mx-auto max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
          Gourmet goods from around the world
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-indigo-100">
          Browse the legendary Northwind catalog — beverages, condiments, confections and more.
          Add to cart freely; check out with a free account.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
          >
            Shop now <FiArrowRight />
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Create account
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {PERKS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card flex items-start gap-3">
            <span className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600">
              <Icon size={20} />
            </span>
            <div>
              <p className="font-semibold text-slate-800">{title}</p>
              <p className="text-sm text-slate-500">{text}</p>
            </div>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Shop by category</h2>
            <p className="text-sm text-slate-500">Eight aisles of classic Northwind goodness</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {categories.map((cat) => {
            const Icon = FiIcons[iconForCategory(cat.category_name)] || FiIcons.FiBox
            return (
              <Link
                key={cat.category_id}
                to={`/products?category=${cat.category_id}`}
                className="group card transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
              >
                <span className="mb-3 inline-flex rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-3 text-white shadow-md shadow-indigo-100">
                  <Icon size={22} />
                </span>
                <p className="font-semibold text-slate-800 group-hover:text-indigo-600">{cat.category_name}</p>
                <p className="text-xs text-slate-400">{cat.product_count} products</p>
              </Link>
            )
          })}
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Well-stocked picks</h2>
            <p className="text-sm text-slate-500">In-demand items ready to ship</p>
          </div>
          <Link to="/products" className="btn-secondary !py-2">
            View all <FiArrowRight size={14} />
          </Link>
        </div>
        {status === 'loading' && products.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="mb-4 h-24 rounded-xl bg-slate-100" />
                <div className="mb-2 h-4 w-3/4 rounded bg-slate-100" />
                <div className="h-4 w-1/3 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <div key={p.product_id} className="card group flex flex-col transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-xl text-indigo-500">
                  <FiShoppingCart />
                </span>
                <p className="line-clamp-2 min-h-10 flex-1 font-medium text-slate-800">{p.product_name}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-indigo-600">{fmtMoney(p.unit_price)}</span>
                  <button
                    onClick={() => addToCart(p)}
                    className="rounded-xl bg-slate-800 p-2 text-white opacity-0 transition group-hover:opacity-100 hover:bg-indigo-600 max-sm:opacity-100"
                    title="Add to cart"
                  >
                    <FiShoppingCart size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
