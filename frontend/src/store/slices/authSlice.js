import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authAPI } from '../../lib/api'

const stored = localStorage.getItem('user')

export const loginUser = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try {
    const res = await authAPI.login(data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Login failed')
  }
})

export const registerUser = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try {
    const res = await authAPI.register(data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Registration failed')
  }
})

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const res = await authAPI.me()
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail)
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:    stored ? JSON.parse(stored) : null,
    token:   localStorage.getItem('token') || null,
    loading: false,
    error:   null,
  },
  reducers: {
    logout(state) {
      // Fire-and-forget: invalidate refresh token on server
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        authAPI.logout(refreshToken).catch(() => {})
      }
      state.user  = null
      state.token = null
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    },
    clearError(state) { state.error = null },
    // Called by api.js interceptor when token is silently refreshed
    setToken(state, action) {
      state.token = action.payload
      localStorage.setItem('token', action.payload)
    },
  },
  extraReducers: (builder) => {
    const handleAuth = (state, action) => {
      state.loading = false
      state.token   = action.payload.access_token
      state.user    = {
        id:    action.payload.user_id,
        email: action.payload.email,
        role:  action.payload.role,
      }
      localStorage.setItem('token', action.payload.access_token)
      // ← Store refresh token too
      if (action.payload.refresh_token) {
        localStorage.setItem('refreshToken', action.payload.refresh_token)
      }
      localStorage.setItem('user', JSON.stringify(state.user))
    }

    builder
      .addCase(loginUser.pending,    (s) => { s.loading = true; s.error = null })
      .addCase(loginUser.fulfilled,  handleAuth)
      .addCase(loginUser.rejected,   (s, a) => { s.loading = false; s.error = a.payload })

      .addCase(registerUser.pending,   (s) => { s.loading = true; s.error = null })
      .addCase(registerUser.fulfilled, handleAuth)
      .addCase(registerUser.rejected,  (s, a) => { s.loading = false; s.error = a.payload })

      .addCase(fetchMe.fulfilled, (s, a) => { s.user = { ...s.user, ...a.payload } })
  },
})

export const { logout, clearError, setToken } = authSlice.actions
export default authSlice.reducer