import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { jobsAPI, adminAPI } from '../../lib/api'
import { Button, Input, Textarea, Select, Badge, Spinner, EmptyState } from '../../components/ui/UI'
import toast from 'react-hot-toast'
import styles from './ManageJobs.module.css'
import { Plus, Pencil, Trash2, Eye, Users, X, Briefcase, GitBranch } from 'lucide-react'

const JOB_TYPES = ['full_time','part_time','contract','internship','remote','hybrid']
const EXP_LEVELS = ['entry','mid','senior','lead','executive']

/* ── Post / Edit Job Form ────────────────────────────────────────────────────── */
export function PostJobPage({ editJob = null }) {
  const navigate = useNavigate()
  const [skills, setSkills] = useState(editJob?.required_skills || [])
  const [allSkills, setAllSkills] = useState([])
  const [skillQuery, setSkillQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    title: editJob?.title || '',
    description: editJob?.description || '',
    responsibilities: editJob?.responsibilities || '',
    qualifications: editJob?.qualifications || '',
    location: editJob?.location || '',
    is_remote: editJob?.is_remote || false,
    job_type: editJob?.job_type || 'full_time',
    experience_level: editJob?.experience_level || 'mid',
    salary_min: editJob?.salary_min || '',
    salary_max: editJob?.salary_max || '',
    salary_currency: editJob?.salary_currency || 'USD',
  })

  useEffect(() => {
    adminAPI.skills().then(r => setAllSkills(r.data)).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filtered = allSkills.filter(s =>
    s.name.toLowerCase().includes(skillQuery.toLowerCase()) &&
    !skills.find(sk => sk.id === s.id)
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        salary_min: parseInt(form.salary_min) || undefined,
        salary_max: parseInt(form.salary_max) || undefined,
        skill_ids: skills.map(s => s.id),
      }

      if (editJob) {
        await jobsAPI.update(editJob.id, payload)
        toast.success('Job updated!')
      } else {
        await jobsAPI.create(payload)
        toast.success('Job posted successfully!')
      }

      navigate('/jobs/manage')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.formPage}>
      <div className={styles.formHeader}>
        <h1>{editJob ? 'Edit Job' : 'Post a New Job'}</h1>
        <p>{editJob ? 'Update job details and requirements' : 'Attract the best candidates with a detailed listing'}</p>
      </div>

      <motion.div className={styles.formCard} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input label="Job Title *" value={form.title} onChange={e => set('title', e.target.value)} required />

          <div className={styles.formGrid2}>
            <Select value={form.job_type} onChange={e => set('job_type', e.target.value)}>
              {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Select value={form.experience_level} onChange={e => set('experience_level', e.target.value)}>
              {EXP_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </Select>
          </div>

          <Input label="Location" value={form.location} onChange={e => set('location', e.target.value)} />

          <Textarea label="Job Description" value={form.description} onChange={e => set('description', e.target.value)} />

          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={() => navigate('/jobs/manage')}>Cancel</Button>
            <Button type="submit" loading={loading}>
              {editJob ? 'Update Job' : 'Post Job'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

/* ── Manage Jobs list ─────────────────────────────────────────────────────────── */
export function ManageJobsPage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    jobsAPI.myJobs().then(r => setJobs(r.data)).finally(() => setLoading(false))
  }, [])

  const handleDelete = async (jobId) => {
    if (!confirm('Delete this job? All applications will be removed.')) return
    setDeletingId(jobId)

    try {
      await jobsAPI.delete(jobId)
      setJobs(p => p.filter(j => j.id !== jobId))
      toast.success('Job deleted')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleStatus = async (job) => {
    const newStatus = job.status === 'active' ? 'closed' : 'active'

    try {
      await jobsAPI.update(job.id, { status: newStatus })
      setJobs(p => p.map(j => j.id === job.id ? { ...j, status: newStatus } : j))
      toast.success(`Job ${newStatus === 'active' ? 'reopened' : 'closed'}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <div className={styles.listPage}>
      <div className={styles.listHeader}>
        <div>
          <h1>Manage Jobs</h1>
          <p>{jobs.length} total listings</p>
        </div>

        <Button onClick={() => navigate('/jobs/post')}>
          <Plus size={16} /> Post New Job
        </Button>
      </div>

      {loading ? (
        <div className={styles.loadingCenter}><Spinner size="lg" /></div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={40} />}
          title="No jobs posted yet"
          action={<Button onClick={() => navigate('/jobs/post')}>
            <Plus size={15} /> Post Your First Job
          </Button>}
        />
      ) : (
        <div className={styles.jobList}>
          {jobs.map((job, i) => (
            <motion.div
              key={job.id}
              className={styles.jobCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className={styles.jobCardLeft}>
                <div className={styles.jobTitle}>{job.title}</div>

                <div className={styles.jobMeta}>
                  <span>{job.location || 'Remote'}</span>
                  <span>·</span>
                  <span>{job.job_type}</span>
                  <span>·</span>
                  <span>{job.experience_level}</span>
                </div>

                <div className={styles.jobStats}>
                  <span><Eye size={13} /> {job.views_count} views</span>
                  <span><Users size={13} /> {job.applications_count || 0} Applications</span>
                </div>
              </div>

              <div className={styles.jobCardRight}>
                <Badge variant={job.status === 'active' ? 'success' : 'danger'}>
                  {job.status}
                </Badge>

                <div className={styles.jobActions}>
                  <button onClick={() => navigate(`/jobs/edit/${job.id}`)}>
                    <Pencil size={15} />
                  </button>

                  <Link to={`/applicants?job=${job.id}`}>
                    <Users size={15} />
                  </Link>

                  {/* ✅ PIPELINE BUTTON */}
                  <Link to={`/employer/pipeline/${job.id}`}>
                    <GitBranch size={15} />
                  </Link>

                  <Link to={`/jobs/${job.id}`}>
                    <Eye size={15} />
                  </Link>

                  <button onClick={() => handleDelete(job.id)}>
                    {deletingId === job.id ? '…' : <Trash2 size={15} />}
                  </button>
                </div>

                {/* ✅ Primary CTA */}
                <Button
                  size="sm"
                  onClick={() => navigate(`/employer/pipeline/${job.id}`)}
                >
                  View Pipeline
                </Button>

                <button onClick={() => handleToggleStatus(job)}>
                  {job.status === 'active' ? 'Close Job' : 'Reopen'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}