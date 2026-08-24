import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { FiLock, FiUser } from 'react-icons/fi'
import { registerUser } from '../features/authSlice'
import { pushToast } from '../features/uiSlice'

export default function Register() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const status = useSelector((s) => s.auth.status)
  const error = useSelector((s) => s.auth.error)
  const [form, setForm] = useState({ username: '', full_name: '', password: '', confirm: '' })
  const [localError, setLocalError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setLocalError('Passwords do not match.')
      return
    }
    setLocalError(null)
    try {
      await dispatch(
        registerUser({ username: form.username, password: form.password, full_name: form.full_name })
      ).unwrap()
      dispatch(pushToast({ type: 'success', message: 'Welcome to Northwind Traders!' }))
      navigate('/', { replace: true })
    } catch {
      /* error shown inline */
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="card">
        <h1 className="text-xl font-bold text-slate-800">Create your account</h1>
        <p className="mb-6 text-sm text-slate-500">Free registration — only needed to place orders.</p>

        {(localError || error) && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {localError || error}
          </div>
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
                placeholder="letters & digits, 3–30 chars"
                className="input !pl-9"
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Full name (optional)</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="John Doe"
              className="input"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="min. 6 characters"
                className="input !pl-9"
                required
                minLength={6}
              />
            </div>
          </div>
          <div>
            <label className="label">Confirm password</label>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="input"
              required
            />
          </div>
          <button type="submit" disabled={status === 'loading'} className="btn-primary w-full !py-3">
            {status === 'loading' ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
