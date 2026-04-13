import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { chatAPI } from '../../lib/api'

export const fetchSessions = createAsyncThunk('chat/fetchSessions', async () => {
  const res = await chatAPI.listSessions()
  return res.data
})

export const createSession = createAsyncThunk('chat/createSession', async (data) => {
  const res = await chatAPI.createSession(data || { title: 'New Conversation' })
  return res.data
})

export const fetchMessages = createAsyncThunk('chat/fetchMessages', async (sessionId) => {
  const res = await chatAPI.getMessages(sessionId)
  return { sessionId, messages: res.data }
})

export const deleteSession = createAsyncThunk('chat/deleteSession', async (id) => {
  await chatAPI.deleteSession(id)
  return id
})

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    isOpen: false,
    sessions: [],
    activeSessionId: null,
    messages: {},        // { [sessionId]: Message[] }
    streamingText: '',   // live token accumulation
    isStreaming: false,
    loading: false,
    error: null,
  },
  reducers: {
    toggleChat(state) { state.isOpen = !state.isOpen },
    openChat(state)  { state.isOpen = true },
    closeChat(state) { state.isOpen = false },
    setActiveSession(state, action) {
      state.activeSessionId = action.payload
      state.streamingText = ''
    },
    appendToken(state, action) {
      state.streamingText += action.payload
    },
    commitStreamedMessage(state) {
      const sid = state.activeSessionId
      if (!sid) return
      // Commit even if streamingText is empty (e.g. done arrived before tokens)
      if (state.streamingText) {
        if (!state.messages[sid]) state.messages[sid] = []
        state.messages[sid].push({
          id: Date.now(),
          role: 'assistant',
          content: state.streamingText,
          created_at: new Date().toISOString(),
        })
      }
      state.streamingText = ''
      state.isStreaming = false
    },
    addUserMessage(state, action) {
      const sid = state.activeSessionId
      if (!sid) return
      if (!state.messages[sid]) state.messages[sid] = []
      state.messages[sid].push({
        id: Date.now(),
        role: 'user',
        content: action.payload,
        created_at: new Date().toISOString(),
      })
    },
    setStreaming(state, action) { state.isStreaming = action.payload },
    updateSessionTitle(state, action) {
      const { id, title } = action.payload
      const s = state.sessions.find(s => s.id === id)
      if (s) s.title = title
    },
    // Reset streaming state on error
    resetStreaming(state) {
      state.isStreaming = false
      state.streamingText = ''
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSessions.fulfilled, (s, a) => { s.sessions = a.payload })
      .addCase(createSession.fulfilled, (s, a) => {
        s.sessions.unshift(a.payload)
        s.activeSessionId = a.payload.id
        s.messages[a.payload.id] = []
      })
      .addCase(fetchMessages.fulfilled, (s, a) => {
        s.messages[a.payload.sessionId] = a.payload.messages
      })
      .addCase(deleteSession.fulfilled, (s, a) => {
        s.sessions = s.sessions.filter(sess => sess.id !== a.payload)
        if (s.activeSessionId === a.payload) {
          s.activeSessionId = s.sessions[0]?.id || null
        }
        delete s.messages[a.payload]
      })
  },
})

export const {
  toggleChat, openChat, closeChat, setActiveSession,
  appendToken, commitStreamedMessage, addUserMessage,
  setStreaming, updateSessionTitle, resetStreaming,
} = chatSlice.actions

export default chatSlice.reducer
