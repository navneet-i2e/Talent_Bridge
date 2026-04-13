import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarCollapsed: false,
    activeModal: null,
    modalData: null,
  },
  reducers: {
    toggleSidebar(state) { state.sidebarCollapsed = !state.sidebarCollapsed },
    openModal(state, action) {
      state.activeModal = action.payload.name
      state.modalData = action.payload.data || null
    },
    closeModal(state) {
      state.activeModal = null
      state.modalData = null
    },
  },
})

export const { toggleSidebar, openModal, closeModal } = uiSlice.actions
export default uiSlice.reducer