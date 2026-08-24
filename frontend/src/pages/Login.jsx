import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { FiLock, FiUser } from 'react-icons/fi'
import { loginUser } from '../features/authSlice'
import { pushToast } from '../features/uiSlice'

export default function Login() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const status = useSelector((s) => s.auth.status)
  const error = useSelector((s) => s.auth.error)
  const [form, setForm] = useState({ username: '', password: '' })

  const submit = async (e) => {
    e.preventDefault()
    try {
      await dispatch(loginUser(form)).unwrap()
      dispatch(pushToast({ type: 'success', message: 'Logged in. Welcome back!' }))
      navigate(location.state?.from || '/', { replace: true })
    } catch {
      /* error shown inline */
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="card">
        <h1 className="text-xl font-bold text-slate-800">Welcome back</h1>
        <p className="mb-6 text-sm text-slate-500">Log in to place orders and manage your account.</p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Username</label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                autoFocus
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="e.g. johnd"
                className="input !pl-9"
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input !pl-9"
                required
              />
            </div>
          </div>
          <button type="submit" disabled={status === 'loading'} className="btn-primary w-full !py-3">
            {status === 'loading' ? 'Signing in…' : 'Log in'}
          </button>
        </form>

        <div className="mt-5 rounded-xl bg-indigo-50 px-4 py-3 text-xs text-indigo-700">
          Demo accounts — customer: <b>johnd / newpass1</b> · admin: <b>admin / admin123</b>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          New here?{' '}
          <Link to="/register" className="font-semibold text-indigo-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
