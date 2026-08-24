import { createSlice } from '@reduxjs/toolkit'

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    addItem(state, action) {
      const { product, quantity = 1 } = action.payload
      const existing = state.items.find((i) => i.product_id === product.product_id)
      if (existing) existing.quantity += quantity
      else
        state.items.push({
          product_id: product.product_id,
          product_name: product.product_name,
          unit_price: product.unit_price ?? 0,
          quantity,
        })
    },
    removeItem(state, action) {
      state.items = state.items.filter((i) => i.product_id !== action.payload)
    },
    setQuantity(state, action) {
      const { product_id, quantity } = action.payload
      const item = state.items.find((i) => i.product_id === product_id)
      if (!item) return
      if (quantity <= 0) state.items = state.items.filter((i) => i.product_id !== product_id)
      else item.quantity = quantity
    },
    clearCart(state) {
      state.items = []
    },
  },
})

export const { addItem, removeItem, setQuantity, clearCart } = cartSlice.actions

export const selectCartItems = (s) => s.cart.items
export const selectCartCount = (s) => s.cart.items.reduce((n, i) => n + i.quantity, 0)
export const selectCartTotal = (s) =>
  s.cart.items.reduce((sum, i) => sum + i.quantity * (i.unit_price || 0), 0)

export default cartSlice.reducer
