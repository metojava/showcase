import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api } from '../api/client'

const savedToken = localStorage.getItem('nw_token')
const savedUser = (() => {
  try {
    return JSON.parse(localStorage.getItem('nw_user'))
  } catch {
    return null
  }
})()

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      return await api.post('/auth/login', { username, password })
    } catch (e) {
      return rejectWithValue(e.message)
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async (payload, { rejectWithValue }) => {
    try {
      return await api.post('/auth/register', payload)
    } catch (e) {
      return rejectWithValue(e.message)
    }
  }
)

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ current_password, new_password }, { rejectWithValue }) => {
    try {
      return await api.put('/auth/password', { current_password, new_password })
    } catch (e) {
      return rejectWithValue(e.message)
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: savedToken || null,
    user: savedUser || null,
    status: 'idle',
    error: null,
  },
  reducers: {
    logout(state) {
      state.token = null
      state.user = null
      state.error = null
      localStorage.removeItem('nw_token')
      localStorage.removeItem('nw_user')
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (s) => {
        s.status = 'loading'
        s.error = null
      })
      .addCase(loginUser.fulfilled, (s, a) => {
        s.status = 'succeeded'
        s.token = a.payload.access_token
        s.user = a.payload.user
        localStorage.setItem('nw_token', a.payload.access_token)
        localStorage.setItem('nw_user', JSON.stringify(a.payload.user))
      })
      .addCase(loginUser.rejected, (s, a) => {
        s.status = 'failed'
        s.error = a.payload
      })
      .addCase(registerUser.pending, (s) => {
        s.status = 'loading'
        s.error = null
      })
      .addCase(registerUser.fulfilled, (s, a) => {
        s.status = 'succeeded'
        s.token = a.payload.access_token
        s.user = a.payload.user
        localStorage.setItem('nw_token', a.payload.access_token)
        localStorage.setItem('nw_user', JSON.stringify(a.payload.user))
      })
      .addCase(registerUser.rejected, (s, a) => {
        s.status = 'failed'
        s.error = a.payload
      })
      .addCase(changePassword.pending, (s) => {
        s.status = 'loading'
      })
      .addCase(changePassword.fulfilled, (s) => {
        s.status = 'idle'
      })
      .addCase(changePassword.rejected, (s, a) => {
        s.status = 'failed'
        s.error = a.payload
      })
  },
})

export const { logout } = authSlice.actions
export default authSlice.reducer
