import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api } from '../api/client'

export const fetchProducts = createAsyncThunk(
  'products/fetch',
  async (params = {}) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined && v !== 'all') qs.set(k, v)
    })
    return api.get(`/products?${qs}`)
  }
)

const productsSlice = createSlice({
  name: 'products',
  initialState: { items: [], total: 0, status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (s) => {
        s.status = 'loading'
      })
      .addCase(fetchProducts.fulfilled, (s, a) => {
        s.status = 'succeeded'
        s.items = a.payload.items
        s.total = a.payload.total
      })
      .addCase(fetchProducts.rejected, (s) => {
        s.status = 'failed'
      })
  },
})

export default productsSlice.reducer
