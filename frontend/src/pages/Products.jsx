import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createColumnHelper } from '@tanstack/react-table'
import { FiChevronLeft, FiChevronRight, FiPlus, FiSearch } from 'react-icons/fi'
import DataTable from '../components/DataTable'
import { Badge, Spinner, stockTone } from '../components/common'
import { fetchCategories } from '../features/categoriesSlice'
import { fetchProducts } from '../features/productsSlice'
import { addItem } from '../features/cartSlice'
import { pushToast } from '../features/uiSlice'
import { fmtMoney } from '../utils/format'

const columnHelper = createColumnHelper()

export default function Products() {
  const dispatch = useDispatch()
  const { items, total, status } = useSelector((s) => s.products)
  const categories = useSelector((s) => s.categories.items)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [availability, setAvailability] = useState('all')
  const [sort, setSort] = useState('name')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (categories.length === 0) dispatch(fetchCategories())
  }, [dispatch])

  const params = useMemo(
    () => ({
      q: search || undefined,
      category_id: category !== 'all' ? category : undefined,
      discontinued: availability === 'discontinued' ? true : availability === 'available' ? false : undefined,
      sort,
      limit,
      offset: page * limit,
    }),
    [search, category, availability, sort, limit, page]
  )

  useEffect(() => {
    const t = setTimeout(() => dispatch(fetchProducts(params)), search ? 350 : 0)
    return () => clearTimeout(t)
  }, [dispatch, params])

  useEffect(() => setPage(0), [search, category, availability, sort, limit])

  const addToCart = (product) => {
    dispatch(addItem({ product }))
    dispatch(pushToast({ type: 'success', message: `${product.product_name} added to cart` }))
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('product_id', {
        header: '#',
        cell: (info) => <span className="text-slate-400">{info.getValue()}</span>,
      }),
      columnHelper.accessor('product_name', {
        header: 'Product',
        cell: (info) => <span className="font-medium text-slate-800">{info.getValue()}</span>,
      }),
      columnHelper.accessor((row) => row.category_id, {
        id: 'category',
        header: 'Category',
        cell: (info) => {
          const cat = categories.find((c) => c.category_id === info.row.original.category_id)
          return <Badge tone="indigo">{cat ? cat.category_name : '—'}</Badge>
        },
      }),
      columnHelper.accessor('unit_price', {
        header: 'Price',
        cell: (info) => <span className="font-semibold text-indigo-600">{fmtMoney(info.getValue())}</span>,
      }),
      columnHelper.accessor('units_in_stock', {
        header: 'Stock',
        cell: (info) => <Badge tone={stockTone(info.getValue())}>{info.getValue() ?? '—'} in stock</Badge>,
      }),
      columnHelper.accessor('discontinued', {
        header: 'Status',
        cell: (info) =>
          info.getValue() ? <Badge tone="red">Discontinued</Badge> : <Badge tone="green">Available</Badge>,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <button
            onClick={() => addToCart(info.row.original)}
            className="btn-primary !px-3 !py-1.5 text-xs"
            disabled={info.row.original.discontinued}
            title={info.row.original.discontinued ? 'No longer sold' : 'Add to cart'}
          >
            <FiPlus size={14} /> Add
          </button>
        ),
      }),
    ],
    [categories]
  )

  const pageCount = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Product catalog</h1>
        <p className="text-sm text-slate-500">{total} products · browse freely, no account needed</p>
      </div>

      <div className="card flex flex-wrap items-center gap-3 !p-4">
        <div className="relative min-w-56 flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="input !pl-9"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input w-auto">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>
              {c.category_name}
            </option>
          ))}
        </select>
        <select value={availability} onChange={(e) => setAvailability(e.target.value)} className="input w-auto">
          <option value="all">Any status</option>
          <option value="available">Available</option>
          <option value="discontinued">Discontinued</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input w-auto">
          <option value="name">Name A–Z</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="stock">Best stocked</option>
        </select>
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="input w-auto">
          {[5, 10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
      </div>

      {status === 'loading' && items.length === 0 ? (
        <Spinner label="Loading catalog…" />
      ) : (
        <>
          <DataTable columns={columns} data={items} />
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              Showing {total === 0 ? 0 : page * limit + 1}–{Math.min(total, (page + 1) * limit)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-secondary !p-2.5"
              >
                <FiChevronLeft />
              </button>
              <span className="min-w-16 text-center font-medium">
                Page {page + 1} / {Math.max(1, pageCount)}
              </span>
              <button
                onClick={() => setPage((p) => (p + 1 < pageCount ? p + 1 : p))}
                disabled={page + 1 >= pageCount}
                className="btn-secondary !p-2.5"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


