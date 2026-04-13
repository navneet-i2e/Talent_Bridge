import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { loginUser, registerUser } from '../store/slices/authSlice'
import { Button, Input, Divider } from '../components/ui/UI'
import toast from 'react-hot-toast'
import api from '../lib/api'
import styles from './Auth.module.css'
import { Mail, Lock, UserCheck, Building2, Eye, EyeOff, Sparkles, ArrowLeft, KeyRound, CheckCircle } from 'lucide-react'

// ── Login Page ────────────────────────────────────────────────────────────────
export function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error } = useSelector(s => s.auth)
  const [form, setForm]     = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [view, setView]     = useState('login') // 'login' | 'forgot' | 'reset' | 'done'
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetToken, setResetToken]   = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    const res = await dispatch(loginUser(form))
    if (res.meta.requestStatus === 'fulfilled') {
      toast.success('Welcome back!')
      navigate('/dashboard')
    } else {
      toast.error(res.payload || 'Login failed')
    }
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    if (!forgotEmail) return
    setResetLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', null, { params: { email: forgotEmail } })
      toast.success('Reset instructions sent!')
      // In dev: show token directly so user can test
      if (res.data.reset_token) {
        setResetToken(res.data.reset_token)
        setView('reset')
      } else {
        setView('done')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send reset')
    }
    setResetLoading(false)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setResetLoading(true)
    try {
      await api.post('/auth/reset-password', null, { params: { token: resetToken, new_password: newPassword } })
      toast.success('Password reset! Please log in.')
      setView('login')
      setForm(f => ({ ...f, email: forgotEmail }))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Reset failed — token may have expired')
    }
    setResetLoading(false)
  }

  return (
    <AuthShell title={
      view === 'forgot' ? 'Forgot password' :
      view === 'reset'  ? 'Set new password' :
      view === 'done'   ? 'Check your email' :
      'Welcome back'
    } subtitle={
      view === 'forgot' ? "Enter your email to get a reset link" :
      view === 'reset'  ? "Choose a strong new password" :
      view === 'done'   ? "Reset link sent if account exists" :
      "Sign in to your account"
    }>
      <AnimatePresence mode="wait">

        {/* ── Login form ── */}
        {view === 'login' && (
          <motion.form key="login" onSubmit={handleLogin} className={styles.form}
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
            <Input label="Email" type="email" placeholder="you@company.com"
              icon={<Mail size={16} />} value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            <div className={styles.pwField}>
              <Input label="Password" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                icon={<Lock size={16} />} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPw(s => !s)}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className={styles.forgotRow}>
              <button type="button" className={styles.forgotLink} onClick={() => setView('forgot')}>
                Forgot password?
              </button>
            </div>
            {error && <p className={styles.errorMsg}>{error}</p>}
            <Button type="submit" size="lg" loading={loading} fullWidth>Sign In</Button>
            <Divider />
            <p className={styles.switchLink}>No account? <Link to="/register">Create one free →</Link></p>
          </motion.form>
        )}

        {/* ── Forgot password form ── */}
        {view === 'forgot' && (
          <motion.form key="forgot" onSubmit={handleForgot} className={styles.form}
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <Input label="Email address" type="email" placeholder="you@company.com"
              icon={<Mail size={16} />} value={forgotEmail}
              onChange={e => setForgotEmail(e.target.value)} required />
            <Button type="submit" size="lg" loading={resetLoading} fullWidth>
              Send Reset Link
            </Button>
            <button type="button" className={styles.backLink} onClick={() => setView('login')}>
              <ArrowLeft size={14} /> Back to login
            </button>
          </motion.form>
        )}

        {/* ── Reset password form ── */}
        {view === 'reset' && (
          <motion.form key="reset" onSubmit={handleReset} className={styles.form}
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <div className={styles.devNotice}>
              <KeyRound size={13} />
              <span>Dev mode: token pre-filled. In production this would be emailed.</span>
            </div>
            <Input label="Reset Token" type="text" value={resetToken}
              onChange={e => setResetToken(e.target.value)} required />
            <div className={styles.pwField}>
              <Input label="New Password" type={showPw ? 'text' : 'password'}
                placeholder="Min. 8 characters" icon={<Lock size={16} />}
                value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPw(s => !s)}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <Button type="submit" size="lg" loading={resetLoading} fullWidth>
              Reset Password
            </Button>
            <button type="button" className={styles.backLink} onClick={() => setView('login')}>
              <ArrowLeft size={14} /> Back to login
            </button>
          </motion.form>
        )}

        {/* ── Success screen ── */}
        {view === 'done' && (
          <motion.div key="done" className={styles.successScreen}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <CheckCircle size={40} className={styles.successIcon} />
            <p>If an account with that email exists, a reset link has been sent.</p>
            <Button size="md" onClick={() => setView('login')} fullWidth>Back to Login</Button>
          </motion.div>
        )}

      </AnimatePresence>
    </AuthShell>
  )
}

// ── Register Page ─────────────────────────────────────────────────────────────
export function RegisterPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading } = useSelector(s => s.auth)
  const [form, setForm]     = useState({ email: '', password: '', role: 'seeker' })
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await dispatch(registerUser(form))
    if (res.meta.requestStatus === 'fulfilled') {
      toast.success('Account created!')
      navigate('/profile/setup')
    } else {
      toast.error(res.payload || 'Registration failed')
    }
  }

  return (
    <AuthShell title="Join TalentBridge" subtitle="AI-powered career platform">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.roleRow}>
          {[
            { value: 'seeker',   icon: UserCheck,  label: 'Job Seeker',  desc: 'Find your dream job' },
            { value: 'employer', icon: Building2,  label: 'Employer',    desc: 'Hire top talent' },
          ].map(({ value, icon: Icon, label, desc }) => (
            <motion.button key={value} type="button" whileTap={{ scale: 0.97 }}
              className={`${styles.roleCard} ${form.role === value ? styles.roleCardActive : ''}`}
              onClick={() => setForm(f => ({ ...f, role: value }))}>
              <Icon size={20} />
              <strong>{label}</strong>
              <span>{desc}</span>
            </motion.button>
          ))}
        </div>
        <Input label="Email" type="email" placeholder="you@company.com"
          icon={<Mail size={16} />} value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
        <div className={styles.pwField}>
          <Input label="Password" type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters"
            icon={<Lock size={16} />} hint="At least 8 characters"
            value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          <button type="button" className={styles.eyeBtn} onClick={() => setShowPw(s => !s)}>
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <Button type="submit" size="lg" loading={loading} fullWidth>Create Account</Button>
        <p className={styles.switchLink}>Have an account? <Link to="/login">Sign in →</Link></p>
      </form>
    </AuthShell>
  )
}

// ── Shared shell ──────────────────────────────────────────────────────────────
function AuthShell({ title, subtitle, children }) {
  return (
    <div className={styles.page}>
      <div className={styles.leftPanel}>
        <motion.div className={styles.card}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16,1,0.3,1] }}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>TB</div>
            <span>TalentBridge</span>
          </div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
          {children}
        </motion.div>
      </div>
      <div className={styles.rightPanel}>
        <div className={styles.rightContent}>
          <motion.div className={styles.aiPill}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Sparkles size={14} /> AI-powered · Real results
          </motion.div>
          <motion.blockquote className={styles.quote}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <p>"TalentBridge's AI got me 3 interviews in one week. The resume feedback was transformative."</p>
            <footer>— Priya S., Software Engineer at Google</footer>
          </motion.blockquote>
          <motion.div className={styles.statsRow}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            {[['50K+','Active Jobs'],['12K+','Companies'],['200K+','Hired']].map(([n,l]) => (
              <div key={l} className={styles.stat}><strong>{n}</strong><span>{l}</span></div>
            ))}
          </motion.div>
          <div className={styles.bgOrbs}>
            <div className={styles.orb1} />
            <div className={styles.orb2} />
          </div>
        </div>
      </div>
    </div>
  )
}