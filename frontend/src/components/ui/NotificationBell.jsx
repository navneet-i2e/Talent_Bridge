// frontend/src/components/ui/NotificationBell.jsx  (NEW FILE)
// Add <NotificationBell /> to AppLayout topbar

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, Briefcase, UserCheck, Star, X } from 'lucide-react'
import { notificationsAPI } from '../../lib/api'
import styles from './NotificationBell.module.css'

const ICON_MAP = {
  application_received: Briefcase,
  status_changed:       UserCheck,
  new_job_match:        Star,
}

export default function NotificationBell() {
  const [open, setOpen]           = useState(false)
  const [notifications, setNotifs] = useState([])
  const [unread, setUnread]        = useState(0)
  const [loading, setLoading]      = useState(false)
  const panelRef = useRef(null)

  // Poll unread count every 30s
  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchUnread = async () => {
    try {
      const res = await notificationsAPI.unreadCount()
      setUnread(res.data.count)
    } catch (_) {}
  }

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await notificationsAPI.list({ limit: 20 })
      setNotifs(res.data)
    } catch (_) {}
    setLoading(false)
  }

  const handleOpen = () => {
    setOpen(prev => !prev)
    if (!open) fetchNotifications()
  }

  const markRead = async (id) => {
    await notificationsAPI.markRead(id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  const markAll = async () => {
    await notificationsAPI.markAllRead()
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1)  return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24)  return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className={styles.wrap} ref={panelRef}>
      <button className={styles.bell} onClick={handleOpen} aria-label="Notifications">
        <Bell size={18} />
        {unread > 0 && (
          <motion.span
            className={styles.badge}
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.panel}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <div className={styles.header}>
              <span className={styles.headerTitle}>Notifications</span>
              <div className={styles.headerActions}>
                {unread > 0 && (
                  <button className={styles.markAllBtn} onClick={markAll}>
                    <Check size={12} /> Mark all read
                  </button>
                )}
                <button className={styles.closeBtn} onClick={() => setOpen(false)}>
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className={styles.list}>
              {loading ? (
                <div className={styles.empty}>Loading...</div>
              ) : notifications.length === 0 ? (
                <div className={styles.empty}>
                  <Bell size={24} />
                  <p>No notifications yet</p>
                </div>
              ) : notifications.map(n => {
                const Icon = ICON_MAP[n.type] || Bell
                return (
                  <motion.div
                    key={n.id}
                    className={`${styles.item} ${!n.is_read ? styles.itemUnread : ''}`}
                    onClick={() => { markRead(n.id); if (n.link) window.location.href = n.link }}
                    whileHover={{ backgroundColor: 'var(--slate-50)' }}
                  >
                    <div className={`${styles.iconWrap} ${styles[`icon--${n.type}`]}`}>
                      <Icon size={14} />
                    </div>
                    <div className={styles.content}>
                      <p className={styles.title}>{n.title}</p>
                      <p className={styles.message}>{n.message}</p>
                      <p className={styles.time}>{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span className={styles.dot} />}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}