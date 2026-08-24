import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api } from '../api/client'

export const fetchCategories = createAsyncThunk('categories/fetch', async () =>
  api.get('/categories')
)

const categoriesSlice = createSlice({
  name: 'categories',
  initialState: { items: [], status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchCategories.fulfilled, (s, a) => {
      s.items = a.payload.items
      s.status = 'succeeded'
    })
  },
})

export default categoriesSlice.reducer
