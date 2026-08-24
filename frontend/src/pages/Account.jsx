import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createColumnHelper } from '@tanstack/react-table'
import { FiEye, FiKey } from 'react-icons/fi'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { Badge, Spinner } from '../components/common'
import { changePassword } from '../features/authSlice'
import { fetchMyOrders, fetchOrderDetail } from '../features/ordersSlice'
import { pushToast } from '../features/uiSlice'
import { fmtDate, fmtMoney } from '../utils/format'

const columnHelper = createColumnHelper()

export default function Account() {
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const { myOrders, myOrdersTotal, myOrdersStatus, detail, detailStatus } = useSelector((s) => s.orders)
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwError, setPwError] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    dispatch(fetchMyOrders())
  }, [dispatch])

  const openDetail = async (orderId) => {
    await dispatch(fetchOrderDetail(orderId))
    setDetailOpen(true)
  }

  const submitPassword = async (e) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirm) {
      setPwError('New passwords do not match.')
      return
    }
    setPwError(null)
    try {
      await dispatch(
        changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password })
      ).unwrap()
      setPwForm({ current_password: '', new_password: '', confirm: '' })
      dispatch(pushToast({ type: 'success', message: 'Password updated.' }))
    } catch (msg) {
      setPwError(msg)
    }
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('order_id', {
        header: 'Order',
        cell: (info) => <span className="font-semibold text-indigo-600">#{info.getValue()}</span>,
      }),
      columnHelper.accessor('order_date', {
        header: 'Date',
        cell: (info) => fmtDate(info.getValue()),
      }),
      columnHelper.accessor('item_count', {
        header: 'Lines',
        cell: (info) => <Badge tone="indigo">{info.getValue()}</Badge>,
      }),
      columnHelper.accessor('subtotal', {
        header: 'Subtotal',
        cell: (info) => <span className="font-semibold">{fmtMoney(info.getValue())}</span>,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <button onClick={() => openDetail(info.row.original.order_id)} className="btn-secondary !px-3 !py-1.5 text-xs">
            <FiEye size={14} /> Details
          </button>
        ),
      }),
    ],
    []
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My account</h1>
        <p className="text-sm text-slate-500">Manage your profile and review past orders.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-6">
          <div className="card space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white">
                {(user?.username || '?').slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-800">{user?.full_name || user?.username}</p>
                <Badge tone={user?.role === 'admin' ? 'amber' : 'green'}>{user?.role}</Badge>
              </div>
            </div>
            <dl className="space-y-1.5 border-t border-slate-100 pt-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Username</dt>
                <dd className="font-medium">{user?.username}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Customer ID</dt>
                <dd className="font-mono font-medium text-indigo-600">{user?.customer_id}</dd>
              </div>
            </dl>
          </div>

          <form onSubmit={submitPassword} className="card space-y-4">
            <h2 className="flex items-center gap-2 font-semibold text-slate-800">
              <FiKey size={16} /> Change password
            </h2>
            {pwError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{pwError}</div>
            )}
            <input
              type="password"
              value={pwForm.current_password}
              onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
              placeholder="Current password"
              className="input"
              required
            />
            <input
              type="password"
              value={pwForm.new_password}
              onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
              placeholder="New password (min. 6 chars)"
              className="input"
              minLength={6}
              required
            />
            <input
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              placeholder="Confirm new password"
              className="input"
              required
            />
            <button type="submit" className="btn-primary w-full">
              Update password
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Order history</h2>
              <p className="text-sm text-slate-500">{myOrdersTotal} orders placed with your account</p>
            </div>
          </div>
          {myOrdersStatus === 'loading' ? (
            <Spinner label="Loading orders…" />
          ) : (
            <DataTable columns={columns} data={myOrders} initialSorting={[{ id: 'order_id', desc: true }]} />
          )}
        </div>
      </div>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={detail ? `Order #${detail.order_id}` : ''} wide>
        {detailStatus === 'loading' || !detail ? (
          <Spinner />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
              <span>Date: <b className="text-slate-700">{fmtDate(detail.order_date)}</b></span>
              <span>Ship to: <b className="text-slate-700">{detail.ship_country || '—'}</b></span>
              <span>Freight: <b className="text-slate-700">{fmtMoney(detail.freight)}</b></span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="py-2">Product</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Unit</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((line) => (
                  <tr key={line.product_id} className="border-b border-slate-50">
                    <td className="py-2 pr-2">{line.product_name}</td>
                    <td className="py-2 text-right">{line.quantity}</td>
                    <td className="py-2 text-right">{fmtMoney(line.unit_price)}</td>
                    <td className="py-2 text-right font-medium">{fmtMoney(line.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between text-base font-bold text-slate-800">
              <span>Order total</span>
              <span className="text-indigo-600">{fmtMoney(detail.total)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
