import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api } from '../api/client'

export const placeOrder = createAsyncThunk(
  'orders/place',
  async ({ ship_country, items }, { rejectWithValue }) => {
    try {
      return await api.post('/orders', { ship_country, items })
    } catch (e) {
      return rejectWithValue(e.message)
    }
  }
)

export const fetchMyOrders = createAsyncThunk(
  'orders/myOrders',
  async ({ limit = 20, offset = 0 } = {}) => api.get(`/auth/me/orders?limit=${limit}&offset=${offset}`)
)

export const fetchOrderDetail = createAsyncThunk('orders/detail', async (orderId) =>
  api.get(`/orders/${orderId}`)
)

const ordersSlice = createSlice({
  name: 'orders',
  initialState: {
    lastPlacement: null,
    placeStatus: 'idle',
    placeError: null,
    myOrders: [],
    myOrdersTotal: 0,
    myOrdersStatus: 'idle',
    detail: null,
    detailStatus: 'idle',
  },
  reducers: {
    resetPlacement(state) {
      state.lastPlacement = null
      state.placeStatus = 'idle'
      state.placeError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(placeOrder.pending, (s) => {
        s.placeStatus = 'loading'
        s.placeError = null
      })
      .addCase(placeOrder.fulfilled, (s, a) => {
        s.placeStatus = 'succeeded'
        s.lastPlacement = a.payload
      })
      .addCase(placeOrder.rejected, (s, a) => {
        s.placeStatus = 'failed'
        s.placeError = a.payload
      })
      .addCase(fetchMyOrders.pending, (s) => {
        s.myOrdersStatus = 'loading'
      })
      .addCase(fetchMyOrders.fulfilled, (s, a) => {
        s.myOrdersStatus = 'succeeded'
        s.myOrders = a.payload.items
        s.myOrdersTotal = a.payload.total
      })
      .addCase(fetchOrderDetail.pending, (s) => {
        s.detailStatus = 'loading'
        s.detail = null
      })
      .addCase(fetchOrderDetail.fulfilled, (s, a) => {
        s.detailStatus = 'succeeded'
        s.detail = a.payload
      })
  },
})

export const { resetPlacement } = ordersSlice.actions
export default ordersSlice.reducer
