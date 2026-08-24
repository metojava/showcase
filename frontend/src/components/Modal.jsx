import { FiAlertTriangle, FiX } from 'react-icons/fi'

export default function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-2xl bg-white p-6 shadow-2xl`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <FiX size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, busy }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-red-100 p-2 text-red-600">
          <FiAlertTriangle size={20} />
        </span>
        <p className="pt-1 text-sm text-slate-600">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary" disabled={busy}>
          Cancel
        </button>
        <button onClick={onConfirm} className="btn-danger" disabled={busy}>
          {busy ? 'Working…' : 'Confirm'}
        </button>
      </div>
    </Modal>
  )
}
