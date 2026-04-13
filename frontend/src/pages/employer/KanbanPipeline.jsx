// frontend/src/pages/employer/KanbanPipeline.jsx  (NEW FILE)
// Route: /employer/pipeline/:jobId

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { applicationsAPI, jobsAPI } from '../../lib/api'
import styles from './KanbanPipline.module.css'
import { ArrowLeft, User, FileText, Clock, ChevronRight } from 'lucide-react'

const COLUMNS = [
  { id: 'applied',    label: 'Applied',    color: '#64748b' },
  { id: 'screening',  label: 'Screening',  color: '#185FA5' },
  { id: 'interview',  label: 'Interview',  color: '#0F6E56' },
  { id: 'offered',    label: 'Offered 🎉', color: '#854F0B' },
  { id: 'rejected',   label: 'Rejected',   color: '#A32D2D' },
]

export default function KanbanPipeline() {
  const { jobId } = useParams()
  const navigate  = useNavigate()
  const [applications, setApplications] = useState([])
  const [job, setJob]                   = useState(null)
  const [loading, setLoading]           = useState(true)
  const [dragging, setDragging]         = useState(null)   // application id being dragged
  const [dragOver, setDragOver]         = useState(null)   // column id being dragged over

  useEffect(() => {
    Promise.all([
      applicationsAPI.forJob(jobId),
      jobsAPI.get(jobId),
    ]).then(([appsRes, jobRes]) => {
      setApplications(appsRes.data)
      setJob(jobRes.data)
    }).finally(() => setLoading(false))
  }, [jobId])

  const handleDragStart = (appId) => setDragging(appId)
  const handleDragEnd   = () => { setDragging(null); setDragOver(null) }

  const handleDrop = async (colId) => {
    if (!dragging) return
    const app = applications.find(a => a.id === dragging)
    if (!app || app.status === colId) return

    // Optimistic update
    setApplications(prev =>
      prev.map(a => a.id === dragging ? { ...a, status: colId } : a)
    )
    setDragging(null)
    setDragOver(null)

    try {
      await applicationsAPI.updateStatus(dragging, { status: colId })
    } catch {
      // Rollback on failure
      setApplications(prev =>
        prev.map(a => a.id === dragging ? { ...a, status: app.status } : a)
      )
    }
  }

  const getColumnApps = (colId) => applications.filter(a => a.status === colId)

  const timeAgo = (iso) => {
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days}d ago`
  }

  if (loading) return <div className={styles.loading}>Loading pipeline...</div>

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => navigate('/employer/jobs')}>
          <ArrowLeft size={16} /> Back to Jobs
        </button>
        <div>
          <h1 className={styles.pageTitle}>{job?.title}</h1>
          <p className={styles.pageSub}>{applications.length} total applicants · Drag cards to update status</p>
        </div>
      </div>

      {/* Kanban board */}
      <div className={styles.board}>
        {COLUMNS.map(col => {
          const colApps = getColumnApps(col.id)
          const isOver  = dragOver === col.id
          return (
            <div
              key={col.id}
              className={`${styles.column} ${isOver ? styles.columnOver : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(col.id) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(col.id)}
            >
              {/* Column header */}
              <div className={styles.colHeader}>
                <span className={styles.colDot} style={{ background: col.color }} />
                <span className={styles.colLabel}>{col.label}</span>
                <span className={styles.colCount}>{colApps.length}</span>
              </div>

              {/* Cards */}
              <div className={styles.cards}>
                <AnimatePresence>
                  {colApps.map(app => (
                    <motion.div
                      key={app.id}
                      className={`${styles.card} ${dragging === app.id ? styles.cardDragging : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(app.id)}
                      onDragEnd={handleDragEnd}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(5,13,26,0.1)' }}
                    >
                      <div className={styles.cardTop}>
                        <div className={styles.cardAvatar}>
                          <User size={14} />
                        </div>
                        <div className={styles.cardInfo}>
                          <p className={styles.cardName}>
                            {app.seeker?.full_name || `Applicant #${app.id}`}
                          </p>
                          <p className={styles.cardSub}>
                            {app.seeker?.headline || app.seeker?.email || '—'}
                          </p>
                        </div>
                      </div>

                      <div className={styles.cardMeta}>
                        <span className={styles.cardTime}>
                          <Clock size={10} /> {timeAgo(app.created_at)}
                        </span>
                        {app.resume_url && (
                          <a
                            href={app.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.resumeLink}
                            onClick={e => e.stopPropagation()}
                          >
                            <FileText size={10} /> Resume
                          </a>
                        )}
                      </div>

                      {app.cover_letter && (
                        <p className={styles.cardCover}>
                          {app.cover_letter.slice(0, 80)}…
                        </p>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {colApps.length === 0 && (
                  <div className={styles.emptyCol}>
                    Drop here
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}