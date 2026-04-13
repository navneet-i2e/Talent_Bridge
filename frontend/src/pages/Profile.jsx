import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { profileAPI, adminAPI } from '../lib/api'
import { setSeekerProfile, setEmployerProfile } from '../store/slices/profileSlice'
import { Button, Input, Textarea, Select, Badge, Spinner } from '../components/ui/UI'
import toast from 'react-hot-toast'
import styles from './Profile.module.css'
import { User, Building2, Upload, X, Plus, CheckCircle, ChevronRight } from 'lucide-react'

const EXP_LEVELS = ['entry','mid','senior','lead','executive']

/* ── Profile Setup (Onboarding) ──────────────────────────────────────────────── */
export function ProfileSetupPage() {
  const { user } = useSelector(s => s.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  return (
    <div className={styles.setupPage}>
      <motion.div
        className={styles.setupCard}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className={styles.setupHeader}>
          <div className={styles.setupIcon}>
            {user?.role === 'employer' ? <Building2 size={28} /> : <User size={28} />}
          </div>
          <h1>Complete Your Profile</h1>
          <p>Help us personalize your experience and get your AI assistant up to speed.</p>
        </div>

        {user?.role === 'employer'
          ? <EmployerProfileForm onSuccess={() => navigate('/employer/dashboard')} dispatch={dispatch} />
          : <SeekerProfileForm onSuccess={() => navigate('/dashboard')} dispatch={dispatch} />
        }
      </motion.div>
    </div>
  )
}

/* ── Seeker Profile Form ──────────────────────────────────────────────────────── */
function SeekerProfileForm({ onSuccess, dispatch, editMode = false, existing = null }) {
  const [skills, setSkills] = useState([])
  const [allSkills, setAllSkills] = useState([])
  const [skillQuery, setSkillQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [resumeFile, setResumeFile] = useState(null)
  const [form, setForm] = useState({
    full_name: existing?.full_name || '',
    phone: existing?.phone || '',
    location: existing?.location || '',
    bio: existing?.bio || '',
    headline: existing?.headline || '',
    experience_years: existing?.experience_years || 0,
    experience_level: existing?.experience_level || 'entry',
    linkedin_url: existing?.linkedin_url || '',
    github_url: existing?.github_url || '',
    portfolio_url: existing?.portfolio_url || '',
    expected_salary: existing?.expected_salary || '',
    is_open_to_work: existing?.is_open_to_work ?? true,
  })

  useEffect(() => {
    adminAPI.skills().then(r => setAllSkills(r.data)).catch(() => {})
    if (existing?.skills) setSkills(existing.skills)
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filteredSkills = allSkills.filter(s =>
    s.name.toLowerCase().includes(skillQuery.toLowerCase()) &&
    !skills.find(sk => sk.id === s.id)
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        experience_years: parseFloat(form.experience_years) || 0,
        expected_salary: parseInt(form.expected_salary) || undefined,
        skill_ids: skills.map(s => s.id),
      }

      let profile
      if (editMode) {
        const res = await profileAPI.updateSeeker(payload)
        profile = res.data
      } else {
        const res = await profileAPI.createSeeker(payload)
        profile = res.data
      }

      if (resumeFile) {
        const res = await profileAPI.uploadResume(resumeFile)
        profile = res.data
      }

      dispatch(setSeekerProfile(profile))
      toast.success(editMode ? 'Profile updated!' : 'Profile created!')
      onSuccess?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGrid2}>
        <Input label="Full Name *" value={form.full_name} onChange={e => set('full_name', e.target.value)} required placeholder="Navneet Sharma" />
        <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 9876543210" />
      </div>

      <Input label="Headline" value={form.headline} onChange={e => set('headline', e.target.value)} placeholder="e.g. Senior Angular Developer at i2e Consulting" />

      <div className={styles.formGrid2}>
        <Input label="Location" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Mumbai, India" />
        <Input label="Years of Experience" type="number" min="0" max="50" step="0.5" value={form.experience_years} onChange={e => set('experience_years', e.target.value)} />
      </div>

      <Select label="Experience Level" value={form.experience_level} onChange={e => set('experience_level', e.target.value)}>
        {EXP_LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
      </Select>

      <Textarea label="Bio" value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Tell recruiters about yourself, your goals, and what you're looking for…" />

      {/* Skills */}
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Skills</label>
        <div className={styles.skillTags}>
          {skills.map(s => (
            <span key={s.id} className={styles.skillTag}>
              {s.name}
              <button type="button" onClick={() => setSkills(prev => prev.filter(sk => sk.id !== s.id))}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
        <div className={styles.skillSearch}>
          <input
            className={styles.skillInput}
            placeholder="Search and add skills…"
            value={skillQuery}
            onChange={e => setSkillQuery(e.target.value)}
          />
          {skillQuery && filteredSkills.length > 0 && (
            <div className={styles.skillDropdown}>
              {filteredSkills.slice(0, 8).map(s => (
                <button
                  key={s.id} type="button"
                  className={styles.skillOption}
                  onClick={() => { setSkills(prev => [...prev, s]); setSkillQuery('') }}
                >
                  <Plus size={12} /> {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Links */}
      <div className={styles.formGrid2}>
        <Input label="LinkedIn" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." />
        <Input label="GitHub" value={form.github_url} onChange={e => set('github_url', e.target.value)} placeholder="https://github.com/..." />
      </div>

      <div className={styles.formGrid2}>
        <Input label="Portfolio" value={form.portfolio_url} onChange={e => set('portfolio_url', e.target.value)} placeholder="https://yoursite.com" />
        <Input label="Expected Salary (USD/yr)" type="number" value={form.expected_salary} onChange={e => set('expected_salary', e.target.value)} placeholder="80000" />
      </div>

      {/* Resume upload */}
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Resume / CV</label>
        <label className={styles.uploadArea}>
          <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => setResumeFile(e.target.files[0])} />
          <Upload size={20} />
          <span>{resumeFile ? resumeFile.name : existing?.resume_url ? 'Replace resume (PDF/Word)' : 'Upload resume (PDF/Word)'}</span>
        </label>
        {existing?.resume_url && !resumeFile && (
          <p className={styles.existingFile}>✓ Resume uploaded</p>
        )}
      </div>

      {/* Open to work */}
      <label className={styles.checkRow}>
        <input type="checkbox" checked={form.is_open_to_work} onChange={e => set('is_open_to_work', e.target.checked)} />
        <span>I'm actively open to work</span>
      </label>

      <Button type="submit" size="lg" loading={loading} style={{ width: '100%' }}>
        {editMode ? 'Save Changes' : 'Create Profile & Continue'}
        {!loading && <ChevronRight size={18} />}
      </Button>
    </form>
  )
}

/* ── Employer Profile Form ────────────────────────────────────────────────────── */
function EmployerProfileForm({ onSuccess, dispatch, editMode = false, existing = null }) {
  const [loading, setLoading] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [form, setForm] = useState({
    company_name: existing?.company_name || '',
    company_website: existing?.company_website || '',
    industry: existing?.industry || '',
    company_size: existing?.company_size || '',
    founded_year: existing?.founded_year || '',
    description: existing?.description || '',
    headquarters: existing?.headquarters || '',
    contact_email: existing?.contact_email || '',
    contact_phone: existing?.contact_phone || '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form, founded_year: parseInt(form.founded_year) || undefined }
      let profile
      if (editMode) {
        const res = await profileAPI.updateEmployer(payload)
        profile = res.data
      } else {
        const res = await profileAPI.createEmployer(payload)
        profile = res.data
      }
      if (logoFile) {
        const res = await profileAPI.uploadLogo(logoFile)
        profile = res.data
      }
      dispatch(setEmployerProfile(profile))
      toast.success(editMode ? 'Company profile updated!' : 'Company profile created!')
      onSuccess?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGrid2}>
        <Input label="Company Name *" value={form.company_name} onChange={e => set('company_name', e.target.value)} required />
        <Input label="Industry" value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="Software, Finance…" />
      </div>
      <div className={styles.formGrid2}>
        <Input label="Website" value={form.company_website} onChange={e => set('company_website', e.target.value)} placeholder="https://company.com" />
        <Input label="Headquarters" value={form.headquarters} onChange={e => set('headquarters', e.target.value)} placeholder="San Francisco, CA" />
      </div>
      <div className={styles.formGrid2}>
        <Select label="Company Size" value={form.company_size} onChange={e => set('company_size', e.target.value)}>
          <option value="">Select size</option>
          {['1-10','11-50','51-200','201-500','501-1000','1000+'].map(s => <option key={s}>{s}</option>)}
        </Select>
        <Input label="Founded Year" type="number" value={form.founded_year} onChange={e => set('founded_year', e.target.value)} placeholder="2010" />
      </div>
      <Textarea label="Company Description" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Tell job seekers about your company, culture, and mission…" />
      <div className={styles.formGrid2}>
        <Input label="Contact Email" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
        <Input label="Contact Phone" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Company Logo</label>
        <label className={styles.uploadArea}>
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setLogoFile(e.target.files[0])} />
          <Upload size={20} />
          <span>{logoFile ? logoFile.name : existing?.logo_url ? 'Replace logo' : 'Upload logo (PNG/JPG)'}</span>
        </label>
      </div>
      <Button type="submit" size="lg" loading={loading} style={{ width: '100%' }}>
        {editMode ? 'Save Changes' : 'Create Company Profile'}
        {!loading && <ChevronRight size={18} />}
      </Button>
    </form>
  )
}

/* ── Edit Profile Page ────────────────────────────────────────────────────────── */
export function EditProfilePage() {
  const { user } = useSelector(s => s.auth)
  const { seeker, employer } = useSelector(s => s.profile)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (user?.role === 'seeker') {
          const res = await profileAPI.getSeekerMe()
          dispatch(setSeekerProfile(res.data))
        } else if (user?.role === 'employer') {
          const res = await profileAPI.getEmployerMe()
          dispatch(setEmployerProfile(res.data))
        }
      } catch (_) {}
      setProfileLoaded(true)
    }
    fetchProfile()
  }, [])

  if (!profileLoaded) return <div className={styles.loadingCenter}><Spinner size="lg" /></div>

  return (
    <div className={styles.editPage}>
      <div className={styles.editHeader}>
        <h1>{user?.role === 'employer' ? 'Company Profile' : 'My Profile'}</h1>
        <p>Keep your profile up to date for the best AI recommendations</p>
      </div>
      <div className={styles.editCard}>
        {user?.role === 'employer'
          ? <EmployerProfileForm editMode existing={employer} dispatch={dispatch} onSuccess={() => toast.success('Saved!')} />
          : <SeekerProfileForm editMode existing={seeker} dispatch={dispatch} onSuccess={() => toast.success('Saved!')} />
        }
      </div>
    </div>
  )
}