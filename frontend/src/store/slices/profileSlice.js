// profileSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { profileAPI } from '../../lib/api'

export const fetchSeekerProfile = createAsyncThunk('profile/fetchSeeker', async () => {
  const res = await profileAPI.getSeekerMe()
  return res.data
})

export const fetchEmployerProfile = createAsyncThunk('profile/fetchEmployer', async () => {
  const res = await profileAPI.getEmployerMe()
  return res.data
})

const profileSlice = createSlice({
  name: 'profile',
  initialState: {
    seeker: null,
    employer: null,
    loading: false,
  },
  reducers: {
    setSeekerProfile(state, action) { state.seeker = action.payload },
    setEmployerProfile(state, action) { state.employer = action.payload },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSeekerProfile.fulfilled, (s, a) => { s.seeker = a.payload })
      .addCase(fetchEmployerProfile.fulfilled, (s, a) => { s.employer = a.payload })
  },
})

export const { setSeekerProfile, setEmployerProfile } = profileSlice.actions
export default profileSlice.reducer