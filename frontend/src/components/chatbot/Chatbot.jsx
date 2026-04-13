import { useState, useRef, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  toggleChat, closeChat, createSession, fetchSessions,
  fetchMessages, setActiveSession, deleteSession,
  addUserMessage, commitStreamedMessage,
  setStreaming, updateSessionTitle, resetStreaming,
} from '../../store/slices/chatSlice'
import { Spinner } from '../ui/UI'
import styles from './Chatbot.module.css'
import {
  MessageCircle, X, Plus, Trash2, Send, Bot, Sparkles,
  History, ArrowLeft, Copy, Check, RotateCcw, Clock,
} from 'lucide-react'

const SUGGESTIONS = [
  { icon: '📄', text: 'Analyze my resume for ATS' },
  { icon: '🎯', text: 'Recommend jobs for my profile' },
  { icon: '💬', text: 'Start a mock interview' },
  { icon: '💰', text: 'Salary insights for my role' },
  { icon: '📧', text: 'Write me a cover letter' },
  { icon: '🧠', text: 'What skills am I missing?' },
]

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch (_) {}
  }
  return (
    <button className={styles.copyBtn} onClick={handle} title={copied ? 'Copied!' : 'Copy'}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

// ── THE KEY FIX: Streaming bubble uses local interval, never touches Redux ────
// Network arrives fast in chunks → buffered locally
// setInterval drips characters at ~20ms → smooth word-by-word feel
// Only when done==true AND display caught up → commitStreamedMessage (Redux once)
function StreamingBubble({ fullText, isDone, onCommit }) {
  const [displayed, setDisplayed] = useState('')
  const bufRef   = useRef('')
  const doneRef  = useRef(false)
  const timerRef = useRef(null)

  // Sync latest full text into buffer
  useEffect(() => {
    bufRef.current = fullText
  }, [fullText])

  useEffect(() => {
    doneRef.current = isDone
  }, [isDone])

  // Drip characters at controlled speed
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setDisplayed(prev => {
        const buf = bufRef.current
        if (prev.length < buf.length) {
          // Drip: 3 chars per tick at 18ms ≈ 166 chars/sec — Claude-like
          return buf.slice(0, prev.length + 3)
        }
        // Fully caught up
        if (doneRef.current) {
          clearInterval(timerRef.current)
          // Micro-delay so last chars render before commit
          setTimeout(() => onCommit(bufRef.current), 80)
        }
        return prev
      })
    }, 18)

    return () => clearInterval(timerRef.current)
  }, [onCommit])

  return (
    <div className={styles.streamingMarkdown}>
      <ReactMarkdown>{displayed || '\u00A0'}</ReactMarkdown>
      <span className={styles.cursor} />
    </div>
  )
}

export default function Chatbot() {
  const dispatch = useDispatch()
  const { user } = useSelector(s => s.auth)
  const { isOpen, sessions, activeSessionId, messages, isStreaming } = useSelector(s => s.chat)

  const [input, setInput]       = useState('')
  const [view, setView]         = useState('chat')
  const [lastUserMsg, setLastUserMsg] = useState('')

  // ── Streaming state: 100% local, never in Redux until done ────────────────
  const [liveText, setLiveText]   = useState('')   // full accumulated text from SSE
  const [streamDone, setStreamDone] = useState(false)
  const activeStreamRef = useRef(false)

  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)
  const textareaRef    = useRef(null)
  const token = localStorage.getItem('token')

  const activeMessages = messages[activeSessionId] || []
  const showStreaming  = isStreaming || liveText.length > 0

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages.length, liveText])

  useEffect(() => { if (isOpen && user) dispatch(fetchSessions()) }, [isOpen, user])

  useEffect(() => {
    if (activeSessionId && !messages[activeSessionId]) dispatch(fetchMessages(activeSessionId))
  }, [activeSessionId])

  useEffect(() => {
    if (isOpen && !activeSessionId && sessions.length > 0) dispatch(setActiveSession(sessions[0].id))
  }, [isOpen, sessions])

  useEffect(() => {
    if (isOpen && activeSessionId) setTimeout(() => inputRef.current?.focus(), 300)
  }, [isOpen, activeSessionId])

  const handleNewSession = async () => {
    const res = await dispatch(createSession({ title: 'New Conversation' }))
    if (res.payload) { dispatch(setActiveSession(res.payload.id)); setView('chat') }
  }

  const handleSelectSession = (id) => {
    dispatch(setActiveSession(id))
    if (!messages[id]) dispatch(fetchMessages(id))
    setView('chat')
  }

  const handleDeleteSession = (e, id) => {
    e.stopPropagation()
    dispatch(deleteSession(id))
  }

  // Called by StreamingBubble when display has caught up AND SSE is done
  const handleStreamCommit = useCallback((fullContent) => {
    dispatch(commitStreamedMessage())
    setLiveText('')
    setStreamDone(false)
    activeStreamRef.current = false
  }, [dispatch])

  const sendMessage = useCallback(async (messageText) => {
    const msg = messageText || input.trim()
    if (!msg || activeStreamRef.current) return

    setLastUserMsg(msg)
    let sid = activeSessionId

    if (!sid) {
      const res = await dispatch(createSession({ title: msg.slice(0, 55) }))
      sid = res.payload?.id
      if (!sid) return
    }

    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    dispatch(addUserMessage(msg))
    dispatch(setStreaming(true))
    activeStreamRef.current = true
    setLiveText('')
    setStreamDone(false)

    const currentSession = sessions.find(s => s.id === sid)
    if (currentSession?.title === 'New Conversation') {
      dispatch(updateSessionTitle({ id: sid, title: msg.slice(0, 55) + (msg.length > 55 ? '…' : '') }))
    }

    let accumulated = ''

    try {
      const resp = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: sid, message: msg }),
      })

      const reader  = resp.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n')
        buf = parts.pop()

        for (const line of parts) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.token) {
              accumulated += data.token
              // Just update local state — no Redux, no re-render of message list
              setLiveText(accumulated)
            }
            if (data.done || data.error) {
              // Signal StreamingBubble that network is finished
              setStreamDone(true)
              if (data.error) console.error('[AI]', data.error)
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        dispatch(resetStreaming())
        activeStreamRef.current = false
        setLiveText('')
        setStreamDone(false)
      }
    }
  }, [input, activeSessionId, sessions, token, dispatch])

  const handleRetry = useCallback(() => {
    if (lastUserMsg && !activeStreamRef.current) sendMessage(lastUserMsg)
  }, [lastUserMsg, sendMessage])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleTextareaChange = (e) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 130) + 'px'
  }

  if (!user) return null

  const isMobile = window.matchMedia('(max-width: 768px)').matches
  const showWelcome = !activeSessionId || (activeMessages.length === 0 && !showStreaming)

  const panelVariants = isMobile
    ? { hidden: { y: '100%' }, visible: { y: 0 }, exit: { y: '100%' } }
    : { hidden: { opacity: 0, scale: 0.96, y: 12 }, visible: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.96, y: 12 } }

  return (
    <>
      {/* Floating bubble */}
      <motion.button
        className={`${styles.bubble} ${isOpen ? styles.bubbleOpen : ''}`}
        onClick={() => dispatch(toggleChat())}
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
        aria-label="AI Assistant"
      >
        <AnimatePresence mode="wait">
          {isOpen
            ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X size={22} /></motion.span>
            : <motion.span key="s" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Sparkles size={22} /></motion.span>
          }
        </AnimatePresence>
        {!isOpen && (
          <motion.span className={styles.bubblePulse}
            animate={{ scale: [1,1.6,1], opacity: [0.5,0,0.5] }}
            transition={{ duration: 2.5, repeat: Infinity }} />
        )}
      </motion.button>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && isMobile && (
          <motion.div className={styles.mobileBackdrop}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => dispatch(closeChat())} />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.panel}
            variants={panelVariants}
            initial="hidden" animate="visible" exit="exit"
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className={styles.dragHandle} />

            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                {view === 'history' && (
                  <button className={styles.backBtn} onClick={() => setView('chat')}>
                    <ArrowLeft size={15} />
                  </button>
                )}
                <div className={styles.headerIcon}><Bot size={16} /></div>
                <div>
                  <div className={styles.headerTitle}>
                    {view === 'history' ? 'Conversations' : 'AI Assistant'}
                  </div>
                  <div className={styles.headerSub}>
                    {showStreaming
                      ? <span className={styles.typingDots}><span /><span /><span /></span>
                      : view === 'history' ? `${sessions.length} chats` : 'TalentBridge AI · Llama 3.3'
                    }
                  </div>
                </div>
              </div>
              <div className={styles.headerActions}>
                <button className={styles.iconBtn} onClick={() => setView(v => v === 'history' ? 'chat' : 'history')} title="History">
                  <History size={14} />
                </button>
                <button className={styles.iconBtn} onClick={handleNewSession} title="New chat">
                  <Plus size={14} />
                </button>
                <button className={styles.iconBtn} onClick={() => dispatch(closeChat())} title="Close">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Body */}
            <AnimatePresence mode="wait">
              {view === 'history' ? (
                <motion.div key="history" className={styles.historyView}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.16 }}>
                  {sessions.length === 0
                    ? <div className={styles.emptyHistory}>
                        <MessageCircle size={28} /><p>No conversations yet</p>
                        <button className={styles.newChatBtn} onClick={handleNewSession}>
                          <Plus size={14} /> Start chatting
                        </button>
                      </div>
                    : sessions.map(s => (
                        <motion.div key={s.id}
                          className={`${styles.sessionItem} ${s.id === activeSessionId ? styles.sessionActive : ''}`}
                          onClick={() => handleSelectSession(s.id)}
                          whileHover={{ x: 2 }}>
                          <MessageCircle size={13} className={styles.sessionIcon} />
                          <div className={styles.sessionMeta}>
                            <span className={styles.sessionTitle}>{s.title}</span>
                            <span className={styles.sessionDate}>
                              {new Date(s.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <button className={styles.sessionDelete} onClick={e => handleDeleteSession(e, s.id)}>
                            <Trash2 size={12} />
                          </button>
                        </motion.div>
                      ))
                  }
                </motion.div>
              ) : (
                <motion.div key="chat" className={styles.chatView}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.16 }}>

                  {showWelcome ? (
                    <div className={styles.welcome}>
                      <div className={styles.welcomeGlow} />
                      <div className={styles.welcomeIcon}><Sparkles size={26} /></div>
                      <h3>How can I help you?</h3>
                      <p>Your AI career coach — resumes, interviews, salary, job search & more.</p>
                      <div className={styles.suggestions}>
                        {SUGGESTIONS.map((s, i) => (
                          <motion.button key={s.text} className={styles.suggestion}
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.04 + i * 0.04 }}
                            onClick={() => sendMessage(s.text)} whileTap={{ scale: 0.98 }}>
                            <span className={styles.suggestionIcon}>{s.icon}</span>
                            <span>{s.text}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.messages}>
                      <AnimatePresence initial={false}>
                        {activeMessages.map((msg, i) => {
                          const isUser = msg.role === 'user'
                          const isLastAssistant = i === activeMessages.length - 1 && !isUser
                          return (
                            <motion.div key={msg.id || i}
                              className={`${styles.messageRow} ${isUser ? styles.messageRowUser : styles.messageRowAssistant}`}
                              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.18 }}>
                              {!isUser && <div className={styles.avatar}><Bot size={13} /></div>}
                              <div className={styles.bubbleWrap}>
                                <div className={`${styles.msgBubble} ${isUser ? styles['msgBubble--user'] : styles['msgBubble--assistant']}`}>
                                  {isUser
                                    ? <p className={styles.userText}>{msg.content}</p>
                                    : <div className="prose"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                                  }
                                </div>
                                <div className={`${styles.msgMeta} ${isUser ? styles.msgMetaUser : styles.msgMetaAssistant}`}>
                                  {msg.created_at && (
                                    <span className={styles.timestamp}>
                                      <Clock size={10} /> {formatTime(msg.created_at)}
                                    </span>
                                  )}
                                  {!isUser && (
                                    <div className={styles.msgActions}>
                                      <CopyBtn text={msg.content} />
                                      {isLastAssistant && !showStreaming && (
                                        <button className={styles.retryBtn} onClick={handleRetry}>
                                          <RotateCcw size={12} /><span>Retry</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </AnimatePresence>

                      {/* Live streaming bubble */}
                      {showStreaming && (
                        <motion.div
                          className={`${styles.messageRow} ${styles.messageRowAssistant}`}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                          <div className={styles.avatar}><Bot size={13} /></div>
                          <div className={styles.bubbleWrap}>
                            <div className={`${styles.msgBubble} ${styles['msgBubble--assistant']}`}>
                              {liveText.length === 0
                                ? <span className={styles.typingDots}><span /><span /><span /></span>
                                : <StreamingBubble
                                    fullText={liveText}
                                    isDone={streamDone}
                                    onCommit={handleStreamCommit}
                                  />
                              }
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <div ref={messagesEndRef} style={{ height: 4 }} />
                    </div>
                  )}

                  {/* Input */}
                  <div className={styles.inputArea}>
                    <div className={styles.inputWrap}>
                      <textarea
                        ref={el => { inputRef.current = el; textareaRef.current = el }}
                        className={styles.chatInput}
                        value={input}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything about your career…"
                        rows={1}
                        disabled={showStreaming}
                      />
                      <motion.button
                        className={styles.sendBtn}
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || showStreaming}
                        whileHover={input.trim() && !showStreaming ? { scale: 1.04 } : undefined}
                        whileTap={input.trim() && !showStreaming ? { scale: 0.93 } : undefined}
                      >
                        {showStreaming ? <Spinner size="sm" color="white" /> : <Send size={15} />}
                      </motion.button>
                    </div>
                    <p className={styles.inputHint}>Enter to send · Shift+Enter for new line</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}