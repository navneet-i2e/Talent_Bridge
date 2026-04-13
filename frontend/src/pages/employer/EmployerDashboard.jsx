import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { jobsAPI, applicationsAPI } from '../../lib/api'
import { Card, Badge, Button, Spinner, EmptyState } from '../../components/ui/UI'
import { openChat, createSession, setActiveSession } from '../../store/slices/chatSlice'
import styles from './EmployerDashboard.module.css'
import toast from 'react-hot-toast'
import {
  Briefcase, Users, Eye, TrendingUp, Plus,
  ArrowRight, Sparkles, Clock, CheckCircle, AlertCircle
} from 'lucide-react'

export default function EmployerDashboard() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)
  const { employer } = useSelector(s => s.profile)

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [recentApps, setRecentApps] = useState([])

  useEffect(() => {
    jobsAPI.myJobs()
      .then(r => {
        setJobs(r.data)
        // Load applications for first 3 jobs
        const activeJobs = r.data.filter(j => j.status === 'active').slice(0, 3)
        Promise.all(activeJobs.map(j => applicationsAPI.forJob(j.id).then(r2 => r2.data)))
          .then(results => setRecentApps(results.flat().slice(0, 8)))
          .catch(() => {})
      })
      .finally(() => setLoading(false))
  }, [])

  const handleAI = async (prompt) => {
    const res = await dispatch(createSession({ title: prompt.slice(0, 60) }))
    if (res.payload) {
      dispatch(setActiveSession(res.payload.id))
      dispatch(openChat())
    }
  }

  const activeJobs = jobs.filter(j => j.status === 'active')
  const totalViews = jobs.reduce((acc, j) => acc + (j.views_count || 0), 0)

  return (
    <div className={styles.page}>
      {/* Hero */}
      <motion.div
        className={styles.hero}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1>Welcome back, {employer?.company_name || user?.email?.split('@')[0]} 👋</h1>
          <p>Manage your jobs, review applicants, and use AI to find the best talent.</p>
        </div>
        <Button onClick={() => navigate('/jobs/post')}>
          <Plus size={16} /> Post a Job
        </Button>
      </motion.div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {[
          { icon: Briefcase,   label: 'Active Jobs',       value: activeJobs.length,        color: '#3b82f6' },
          { icon: Users,       label: 'Total Applicants',  value: recentApps.length,         color: '#8b5cf6' },
          { icon: Eye,         label: 'Total Views',       value: totalViews,                color: '#f59e0b' },
          { icon: TrendingUp,  label: 'Total Jobs Posted', value: jobs.length,               color: '#10b981' },
        ].map(({ icon: Icon, label, value, color }, i) => (
          <motion.div
            key={label}
            className={styles.statCard}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <div className={styles.statIcon} style={{ background: `${color}18`, color }}>
              <Icon size={20} />
            </div>
            <div>
              <div className={styles.statVal}>{value}</div>
              <div className={styles.statLbl}>{label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className={styles.twoCol}>
        {/* Active jobs */}
        <div>
          <div className={styles.sectionHead}>
            <h2>Active Jobs</h2>
            <Link to="/jobs/manage" className={styles.viewAll}>Manage all <ArrowRight size={14} /></Link>
          </div>
          {loading
            ? <Spinner />
            : activeJobs.length === 0
              ? <EmptyState
                  icon={<Briefcase size={36} />}
                  title="No active jobs"
                  description="Post your first job to start receiving applications"
                  action={<Button size="sm" onClick={() => navigate('/jobs/post')}><Plus size={14} /> Post Job</Button>}
                />
              : activeJobs.slice(0, 5).map((job, i) => (
                <motion.div
                  key={job.id}
                  className={styles.jobRow}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className={styles.jobRowInfo}>
                    <div className={styles.jobRowTitle}>{job.title}</div>
                    <div className={styles.jobRowMeta}>
                      <span><Eye size={12} /> {job.views_count} views</span>
                      <span>· {job.location || 'Remote'}</span>
                      <span>· {job.job_type?.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className={styles.jobRowActions}>
                    <Badge variant="success">Active</Badge>
                    <Link to={`/applicants?job=${job.id}`} className={styles.viewApplicants}>
                      View applicants <ArrowRight size={13} />
                    </Link>
                  </div>
                </motion.div>
              ))
          }
        </div>

        {/* AI Tools for employers */}
        <div>
          <div className={styles.sectionHead}><h2>AI Recruiting Tools</h2></div>
          <div className={styles.aiActions}>
            {[
              { icon: '📝', label: 'Write Job Description', prompt: 'Help me write a compelling job description for a Software Engineer position' },
              { icon: '💰', label: 'Salary Benchmarks', prompt: 'What are current market salary ranges for senior developers in India?' },
              { icon: '❓', label: 'Interview Questions', prompt: 'Generate a strong set of interview questions for a Frontend Developer role' },
              { icon: '📧', label: 'Outreach Templates', prompt: 'Write email templates for reaching out to passive candidates on LinkedIn' },
              { icon: '🏢', label: 'Employer Branding', prompt: 'Give me tips to improve our company\'s employer brand to attract top talent' },
              { icon: '📊', label: 'Hiring Strategy', prompt: 'Help me build a hiring strategy to scale our engineering team from 5 to 20 people' },
            ].map(({ icon, label, prompt }, i) => (
              <motion.button
                key={label}
                className={styles.aiAction}
                onClick={() => handleAI(prompt)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>{icon}</span>
                <span>{label}</span>
                <ArrowRight size={13} className={styles.aiArrow} />
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent applicants */}
      {recentApps.length > 0 && (
        <div>
          <div className={styles.sectionHead}>
            <h2>Recent Applicants</h2>
            <Link to="/applicants" className={styles.viewAll}>View all <ArrowRight size={14} /></Link>
          </div>
          <div className={styles.appTable}>
            {recentApps.map((app, i) => (
              <motion.div
                key={app.id}
                className={styles.appRow}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className={styles.applicantAvatar}>
                  {app.seeker?.full_name?.[0] || '?'}
                </div>
                <div className={styles.applicantInfo}>
                  <div className={styles.applicantName}>{app.seeker?.full_name || 'Applicant'}</div>
                  <div className={styles.applicantJob}>Applied for: {app.job?.title}</div>
                </div>
                <Badge variant={
                  app.status === 'shortlisted' ? 'success' :
                  app.status === 'under_review' ? 'warning' :
                  app.status === 'rejected' ? 'danger' : 'primary'
                }>{app.status.replace('_', ' ')}</Badge>
                <Link to={`/applicants?app=${app.id}`} className={styles.reviewLink}>
                  Review <ArrowRight size={13} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}