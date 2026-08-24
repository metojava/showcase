import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi'
import { dismissToast } from '../features/uiSlice'

const STYLES = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-indigo-600',
}
const ICONS = { success: FiCheckCircle, error: FiAlertCircle, info: FiInfo }

function Toast({ toast }) {
  const dispatch = useDispatch()
  useEffect(() => {
    const t = setTimeout(() => dispatch(dismissToast(toast.id)), 3500)
    return () => clearTimeout(t)
  }, [toast.id, dispatch])
  const Icon = ICONS[toast.type] || FiInfo
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${STYLES[toast.type] || STYLES.info}`}
    >
      <Icon size={16} />
      {toast.message}
      <button onClick={() => dispatch(dismissToast(toast.id))} className="ml-1 opacity-70 hover:opacity-100">
        <FiX size={14} />
      </button>
    </div>
  )
}

export function Toaster() {
  const toasts = useSelector((s) => s.ui.toasts)
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  )
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function Badge({ tone = 'slate', children }) {
  const tones = {
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
    indigo: 'bg-indigo-100 text-indigo-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function stockTone(stock) {
  if (stock === null || stock === undefined) return 'slate'
  if (stock === 0) return 'red'
  if (stock < 20) return 'amber'
  return 'green'
}
