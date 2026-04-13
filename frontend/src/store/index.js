import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import jobsReducer from './slices/jobsSlice'
import chatReducer from './slices/chatSlice'
import profileReducer from './slices/profileSlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    jobs: jobsReducer,
    chat: chatReducer,
    profile: profileReducer,
    ui: uiReducer,
  },
})