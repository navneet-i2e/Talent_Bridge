// jobsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { jobsAPI } from '../../lib/api'

export const fetchJobs = createAsyncThunk('jobs/fetchJobs', async (params) => {
  const res = await jobsAPI.list(params)
  return res.data
})

export const fetchJob = createAsyncThunk('jobs/fetchJob', async (id) => {
  const res = await jobsAPI.get(id)
  return res.data
})

export const fetchSavedJobs = createAsyncThunk('jobs/fetchSaved', async () => {
  const res = await jobsAPI.saved()
  return res.data
})

const jobsSlice = createSlice({
  name: 'jobs',
  initialState: {
    list: [],
    total: 0,
    page: 1,
    totalPages: 1,
    current: null,
    savedIds: [],
    filters: {},
    loading: false,
    error: null,
  },
  reducers: {
    setFilters(state, action) { state.filters = action.payload },
    markSaved(state, action) {
      if (!state.savedIds.includes(action.payload))
        state.savedIds.push(action.payload)
    },
    markUnsaved(state, action) {
      state.savedIds = state.savedIds.filter(id => id !== action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (s) => { s.loading = true })
      .addCase(fetchJobs.fulfilled, (s, a) => {
        s.loading = false
        s.list = a.payload.jobs
        s.total = a.payload.total
        s.page = a.payload.page
        s.totalPages = a.payload.total_pages
      })
      .addCase(fetchJobs.rejected, (s) => { s.loading = false })
      .addCase(fetchJob.fulfilled, (s, a) => { s.current = a.payload })
      .addCase(fetchSavedJobs.fulfilled, (s, a) => {
        s.savedIds = a.payload.map(j => j.id)
      })
  },
})

export const { setFilters, markSaved, markUnsaved } = jobsSlice.actions
export default jobsSlice.reducer