import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchJobs, markSaved, markUnsaved } from '../../store/slices/jobsSlice'
import { jobsAPI } from '../../lib/api'
import { Badge, Spinner, Button, EmptyState, SkeletonJobCard } from '../../components/ui/UI'
import toast from 'react-hot-toast'
import styles from './Jobs.module.css'
import { Search, MapPin, Clock, DollarSign, Bookmark, BookmarkCheck, Building2, Filter, X, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'

const JOB_TYPES  = ['','full_time','part_time','contract','internship','remote','hybrid']
const EXP_LEVELS = ['','entry','mid','senior','lead','executive']

export default function JobsPage() {
  const dispatch = useDispatch()
  const { list, total, page, totalPages, loading, savedIds } = useSelector(s => s.jobs)
  const { user } = useSelector(s => s.auth)

  const [search, setSearch]   = useState('')
  const [location, setLocation] = useState('')
  const [jobType, setJobType]   = useState('')
  const [expLevel, setExpLevel] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [savingId, setSavingId] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const searchTimer = useRef(null)

  const buildParams = (p = 1) => ({
    search: search || undefined, location: location || undefined,
    job_type: jobType || undefined, experience_level: expLevel || undefined,
    page: p, page_size: 12,
  })

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      dispatch(fetchJobs(buildParams(1)))
      setCurrentPage(1)
    }, 350)
    return () => clearTimeout(searchTimer.current)
  }, [search, location, jobType, expLevel])

  const handlePageChange = (p) => {
    setCurrentPage(p)
    dispatch(fetchJobs(buildParams(p)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = async (e, jobId) => {
    e.preventDefault()
    if (!user || user.role !== 'seeker') return
    setSavingId(jobId)
    try {
      if (savedIds.includes(jobId)) {
        await jobsAPI.unsave(jobId)
        dispatch(markUnsaved(jobId))
        toast.success('Removed')
      } else {
        await jobsAPI.save(jobId)
        dispatch(markSaved(jobId))
        toast.success('Saved!')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error')
    } finally {
      setSavingId(null)
    }
  }

  const hasFilters = search || location || jobType || expLevel
  const clearAll = () => { setSearch(''); setLocation(''); setJobType(''); setExpLevel('') }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Browse Jobs</h1>
          <p>{loading ? '…' : total.toLocaleString()} opportunities</p>
        </div>
      </div>

      {/* Search bar */}
      <div className={styles.searchBar}>
        <div className={styles.searchField}>
          <Search size={18} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Job title, skills, keywords…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className={styles.clearBtn} onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <button
          className={`${styles.filterToggle} ${showFilters ? styles.filterToggleActive : ''}`}
          onClick={() => setShowFilters(s => !s)}
        >
          <SlidersHorizontal size={16} />
          <span>Filters</span>
          {hasFilters && <span className={styles.filterBadge} />}
        </button>
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className={styles.filtersPanel}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className={styles.filtersInner}>
              <div className={styles.filterField}>
                <MapPin size={15} />
                <input className={styles.filterInput} placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
              </div>
              <select className={styles.filterSelect} value={jobType} onChange={e => setJobType(e.target.value)}>
                <option value="">All Job Types</option>
                {JOB_TYPES.slice(1).map(t => <option key={t} value={t}>{t.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
              </select>
              <select className={styles.filterSelect} value={expLevel} onChange={e => setExpLevel(e.target.value)}>
                <option value="">All Experience</option>
                {EXP_LEVELS.slice(1).map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase()+l.slice(1)}</option>)}
              </select>
              {hasFilters && <button className={styles.clearAllBtn} onClick={clearAll}>Clear all</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filter chips */}
      {hasFilters && (
        <div className={styles.activeFilters}>
          {search   && <span className={styles.chip}>"{search}" <button onClick={() => setSearch('')}><X size={10} /></button></span>}
          {location && <span className={styles.chip}>{location} <button onClick={() => setLocation('')}><X size={10} /></button></span>}
          {jobType  && <span className={styles.chip}>{jobType.replace('_',' ')} <button onClick={() => setJobType('')}><X size={10} /></button></span>}
          {expLevel && <span className={styles.chip}>{expLevel} <button onClick={() => setExpLevel('')}><X size={10} /></button></span>}
        </div>
      )}

      {/* Results */}
      {loading
        ? <div className={styles.grid}>{Array(12).fill(0).map((_, i) => <SkeletonJobCard key={i} />)}</div>
        : list.length === 0
          ? <EmptyState icon={<Search size={40} />} title="No jobs found" description="Try different search terms or clear filters" action={hasFilters && <Button size="sm" variant="secondary" onClick={clearAll}>Clear filters</Button>} />
          : (
            <>
              <div className={styles.grid}>
                <AnimatePresence mode="popLayout">
                  {list.map((job, i) => (
                    <motion.div key={job.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.03 }}>
                      <Link to={`/jobs/${job.id}`} className={styles.jobCard}>
                        <div className={styles.cardTop}>
                          <div className={styles.companyLogo}>{job.employer?.company_name?.[0] || 'C'}</div>
                          {user?.role === 'seeker' && (
                            <button
                              className={`${styles.saveBtn} ${savedIds.includes(job.id) ? styles.saveBtnActive : ''}`}
                              onClick={e => handleSave(e, job.id)}
                              disabled={savingId === job.id}
                              aria-label="Save job"
                            >
                              {savedIds.includes(job.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                            </button>
                          )}
                        </div>
                        <div className={styles.jobTitle}>{job.title}</div>
                        <div className={styles.jobCompany}><Building2 size={12} />{job.employer?.company_name}</div>
                        <div className={styles.jobMeta}>
                          <span><MapPin size={11} />{job.location || 'Remote'}</span>
                          <span><Clock size={11} />{job.job_type?.replace('_',' ')}</span>
                          {job.salary_min && <span><DollarSign size={11} />${(job.salary_min/1000).toFixed(0)}K–${(job.salary_max/1000).toFixed(0)}K</span>}
                        </div>
                        <div className={styles.skillTags}>
                          {job.required_skills?.slice(0, 3).map(s => <Badge key={s.id} variant="default">{s.name}</Badge>)}
                        </div>
                        <div className={styles.cardFooter}>
                          <Badge variant={job.experience_level === 'entry' ? 'success' : job.experience_level === 'senior' ? 'warning' : 'primary'}>{job.experience_level}</Badge>
                          <span className={styles.postedDate}>{new Date(job.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button className={styles.pageBtn} onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                    <ChevronLeft size={16} /> <span className={styles.pageBtnLabel}>Prev</span>
                  </button>
                  <div className={styles.pageNumbers}>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let p = i + 1
                      if (totalPages > 5 && currentPage > 3) p = currentPage - 2 + i
                      if (p > totalPages) return null
                      return (
                        <button key={p} className={`${styles.pageNum} ${p === currentPage ? styles.pageNumActive : ''}`} onClick={() => handlePageChange(p)}>{p}</button>
                      )
                    })}
                  </div>
                  <button className={styles.pageBtn} onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                    <span className={styles.pageBtnLabel}>Next</span> <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )
      }
    </div>
  )
}