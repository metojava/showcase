import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { FiChevronDown, FiLogOut, FiShoppingBag, FiShoppingCart, FiUser } from 'react-icons/fi'
import { logout } from '../features/authSlice'
import { selectCartCount } from '../features/cartSlice'

export default function Navbar() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const count = useSelector(selectCartCount)
  const user = useSelector((s) => s.auth.user)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handleLogout = () => {
    setMenuOpen(false)
    dispatch(logout())
    navigate('/')
  }

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'
    }`

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200">
            <FiShoppingBag size={18} />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-800">
            Northwind<span className="text-indigo-600">Traders</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink to="/" end className={linkClass}>
            Home
          </NavLink>
          <NavLink to="/products" className={linkClass}>
            Products
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/cart"
            className="relative rounded-xl p-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-indigo-600"
            title="Cart"
          >
            <FiShoppingCart size={20} />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 py-1.5 pl-2 pr-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-600"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <FiUser size={15} />
                </span>
                <span className="max-w-24 truncate">{user.username}</span>
                <FiChevronDown size={14} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                  <div className="border-b border-slate-100 px-4 py-2.5">
                    <p className="truncate text-sm font-semibold text-slate-800">{user.full_name || user.username}</p>
                    <p className="text-xs uppercase tracking-wide text-indigo-500">{user.role}</p>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/account') }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <FiUser size={15} /> My account
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <FiLogOut size={15} /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-secondary">
                Log in
              </Link>
              <Link to="/register" className="btn-primary hidden sm:inline-flex">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
