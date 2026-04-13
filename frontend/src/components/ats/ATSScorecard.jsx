// frontend/src/components/ats/ATSScoreCard.jsx  (NEW FILE)
// Usage: Add <ATSScoreCard jobId={job.id} /> to JobDetail page

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Upload } from 'lucide-react'
import api from '../../lib/api'
import styles from './ATSScoreCard.module.css'

export default function ATSScoreCard({ jobId }) {
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [expanded, setExpanded] = useState(false)

  const runScore = async (file = null) => {
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('job_id', jobId)
      if (file) fd.append('file', file)

      const res = await api.post(`/ats/score?job_id=${jobId}`, file ? fd : null, {
        headers: file ? { 'Content-Type': 'multipart/form-data' } : {},
      })
      setResult(res.data)
      setExpanded(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not score resume')
    }
    setLoading(false)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) runScore(file)
  }

  const scoreColor = (s) => {
    if (s >= 80) return '#0F6E56'
    if (s >= 60) return '#185FA5'
    if (s >= 40) return '#854F0B'
    return '#A32D2D'
  }

  const gradeColor = (g) => {
    const map = { 'Excellent': 'green', 'Good': 'blue', 'Average': 'amber', 'Needs Work': 'red' }
    return map[g] || 'blue'
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Zap size={16} className={styles.zapIcon} />
          <span className={styles.title}>ATS Score</span>
          <span className={styles.subtitle}>See how well your resume matches this job</span>
        </div>
        {!result && (
          <div className={styles.actions}>
            <button
              className={styles.btnPrimary}
              onClick={() => runScore()}
              disabled={loading}
            >
              {loading ? 'Analyzing…' : '⚡ Score My Resume'}
            </button>
            <label className={styles.btnSecondary}>
              <Upload size={13} />
              <span>Upload PDF</span>
              <input type="file" accept=".pdf" onChange={handleFileUpload} hidden />
            </label>
          </div>
        )}
      </div>

      {error && (
        <div className={styles.error}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Score ring + grade */}
            <div className={styles.scoreRow}>
              <div className={styles.scoreRing}>
                <svg viewBox="0 0 80 80" className={styles.ring}>
                  <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border-color)" strokeWidth="8" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke={scoreColor(result.score)} strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - result.score / 100)}`}
                    transform="rotate(-90 40 40)"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                </svg>
                <div className={styles.scoreText}>
                  <span className={styles.scoreNum} style={{ color: scoreColor(result.score) }}>
                    {result.score}
                  </span>
                  <span className={styles.scoreMax}>/100</span>
                </div>
              </div>

              <div className={styles.scoreInfo}>
                <span className={`${styles.grade} ${styles[`grade--${gradeColor(result.grade)}`]}`}>
                  {result.grade}
                </span>
                <div className={styles.breakdown}>
                  {Object.entries(result.breakdown).map(([k, v]) => (
                    <div key={k} className={styles.brow}>
                      <span className={styles.browLabel}>{k.replace('_', ' ')}</span>
                      <div className={styles.browBar}>
                        <motion.div
                          className={styles.browFill}
                          initial={{ width: 0 }}
                          animate={{ width: `${(v / 40) * 100}%` }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                          style={{ background: scoreColor(result.score) }}
                        />
                      </div>
                      <span className={styles.browVal}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Toggle details */}
            <button className={styles.toggleBtn} onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? 'Hide details' : 'Show details'}
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={styles.details}
                >
                  {result.feedback.length > 0 && (
                    <div className={styles.section}>
                      <p className={styles.sectionLabel}>What's good</p>
                      {result.feedback.map((f, i) => (
                        <div key={i} className={styles.feedItem}>
                          <CheckCircle size={13} className={styles.iconGreen} />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {result.improvements.length > 0 && (
                    <div className={styles.section}>
                      <p className={styles.sectionLabel}>Improvements</p>
                      {result.improvements.map((imp, i) => (
                        <div key={i} className={styles.feedItem}>
                          <AlertCircle size={13} className={styles.iconAmber} />
                          <span>{imp}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {result.missing_skills.length > 0 && (
                    <div className={styles.section}>
                      <p className={styles.sectionLabel}>Missing skills</p>
                      <div className={styles.skillTags}>
                        {result.missing_skills.map(s => (
                          <span key={s} className={styles.skillMissing}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.matched_skills.length > 0 && (
                    <div className={styles.section}>
                      <p className={styles.sectionLabel}>Matched skills</p>
                      <div className={styles.skillTags}>
                        {result.matched_skills.map(s => (
                          <span key={s} className={styles.skillMatched}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              className={styles.rescore}
              onClick={() => { setResult(null); setExpanded(false) }}
            >
              Re-score
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}