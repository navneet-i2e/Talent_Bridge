// frontend/src/components/jobs/RecommendedJobs.jsx  (NEW FILE)
// Add to SeekerDashboard: <RecommendedJobs />

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import styles from './RecommendedJobs.module.css'
import { Sparkles, MapPin, Briefcase, TrendingUp, ArrowRight } from 'lucide-react'

export default function RecommendedJobs() {
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/recommendations?limit=5')
      .then(r => setJobs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const scoreColor = (s) => {
    if (s >= 80) return styles.scoreHigh
    if (s >= 60) return styles.scoreMid
    if (s >= 40) return styles.scoreLow
    return styles.scoreMin
  }

  if (loading) return (
    <div className={styles.card}>
      <div className={styles.header}><Sparkles size={16} /><span>AI Recommendations</span></div>
      <div className={styles.skeleton} />
    </div>
  )

  if (jobs.length === 0) return (
    <div className={styles.card}>
      <div className={styles.header}><Sparkles size={16} /><span>AI Recommendations</span></div>
      <div className={styles.empty}>
        <p>Add skills to your profile to get personalized job recommendations.</p>
        <Link to="/profile" className={styles.link}>Update Profile →</Link>
      </div>
    </div>
  )

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Sparkles size={15} className={styles.sparkle} />
          <span className={styles.title}>Recommended for You</span>
          <span className={styles.badge}>{jobs.length} matches</span>
        </div>
        <Link to="/jobs" className={styles.viewAll}>View all <ArrowRight size={12} /></Link>
      </div>

      <div className={styles.list}>
        {jobs.map((job, i) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link to={`/jobs/${job.id}`} className={styles.jobRow}>
              <div className={styles.jobInfo}>
                <p className={styles.jobTitle}>{job.title}</p>
                <div className={styles.jobMeta}>
                  <span><Briefcase size={11} /> {job.company_name}</span>
                  {job.location && <span><MapPin size={11} /> {job.location}</span>}
                  {job.is_remote && <span className={styles.remoteBadge}>Remote</span>}
                </div>
                {job.matched_skills.length > 0 && (
                  <div className={styles.skills}>
                    {job.matched_skills.slice(0, 3).map(s => (
                      <span key={s} className={styles.skillTag}>{s}</span>
                    ))}
                    {job.matched_skills.length > 3 && (
                      <span className={styles.skillMore}>+{job.matched_skills.length - 3}</span>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.scoreWrap}>
                <div className={`${styles.score} ${scoreColor(job.match_score)}`}>
                  <TrendingUp size={10} />
                  <span>{job.match_score}%</span>
                </div>
                <span className={styles.scoreLabel}>match</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// Add to SeekerDashboard: <RecommendedJobs />