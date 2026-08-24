import { configureStore } from '@reduxjs/toolkit'
import auth from '../features/authSlice'
import cart from '../features/cartSlice'
import products from '../features/productsSlice'
import categories from '../features/categoriesSlice'
import orders from '../features/ordersSlice'
import ui from '../features/uiSlice'

const persistedCart = (() => {
  try {
    return JSON.parse(localStorage.getItem('nw_cart')) || []
  } catch {
    return []
  }
})()

export const store = configureStore({
  reducer: { auth, cart, products, categories, orders, ui },
  preloadedState: { cart: { items: persistedCart } },
})

store.subscribe(() => {
  localStorage.setItem('nw_cart', JSON.stringify(store.getState().cart.items))
})
