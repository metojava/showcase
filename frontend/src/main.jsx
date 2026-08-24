import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store } from './app/store'
import App from './App'
import { setUnauthorizedHandler } from './api/client'
import { logout } from './features/authSlice'
import { pushToast } from './features/uiSlice'
import './index.css'

setUnauthorizedHandler(() => {
  store.dispatch(logout())
  store.dispatch(pushToast({ type: 'error', message: 'Session expired — please log in again.' }))
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)
