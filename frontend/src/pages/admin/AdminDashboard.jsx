import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { adminAPI } from '../../lib/api'
import { Badge, Button, Spinner } from '../../components/ui/UI'
import toast from 'react-hot-toast'
import styles from './AdminDashboard.module.css'
import {
  Users, Briefcase, BarChart3, ShieldCheck,
  Trash2, UserCheck, UserX, Plus, Search,
  LayoutDashboard, Tag, RefreshCw
} from 'lucide-react'

// ── Tab config (matches sidebar nav labels) ───────────────────────────────────
const TABS = [
  { id: 'overview',  label: 'Overview',  icon: LayoutDashboard },
  { id: 'users',     label: 'Users',     icon: Users },
  { id: 'skills',    label: 'Skills',    icon: Tag },
]

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'overview'

  const [stats, setStats]         = useState(null)
  const [users, setUsers]         = useState([])
  const [skills, setSkills]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [newSkill, setNewSkill]   = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [userSearch, setUserSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const setTab = (id) => setSearchParams({ tab: id })

  const loadData = async () => {
    setRefreshing(true)
    try {
      const [s, u, sk] = await Promise.all([
        adminAPI.stats(),
        adminAPI.users({ page_size: 100 }),
        adminAPI.skills(),
      ])
      setStats(s.data)
      setUsers(Array.isArray(u.data) ? u.data : u.data?.items || [])
      setSkills(sk.data)
    } catch (err) {
      toast.error('Failed to load admin data')
    }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { loadData() }, [])

  const handleToggleUser = async (userId, isActive) => {
    setUpdatingId(userId)
    try {
      const res = await adminAPI.updateUser(userId, { is_active: !isActive })
      setUsers(p => p.map(u => u.id === userId ? { ...u, is_active: !isActive } : u))
      toast.success(`User ${!isActive ? 'activated' : 'deactivated'}`)
    } catch (_) { toast.error('Failed to update user') }
    setUpdatingId(null)
  }

  const handleDeleteUser = async (userId, email) => {
    if (!confirm(`Delete user "${email}" permanently? This cannot be undone.`)) return
    try {
      await adminAPI.deleteUser(userId)
      setUsers(p => p.filter(u => u.id !== userId))
      toast.success('User deleted')
    } catch (_) { toast.error('Failed to delete user') }
  }

  const handleAddSkill = async () => {
    const name = newSkill.trim()
    if (!name) return
    try {
      const res = await adminAPI.createSkill(name)
      setSkills(p => [...p, res.data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewSkill('')
      toast.success(`Skill "${res.data.name}" added`)
    } catch (err) { toast.error(err.response?.data?.detail || 'Skill already exists') }
  }

  const handleDeleteSkill = async (id, name) => {
    if (!confirm(`Delete skill "${name}"?`)) return
    try {
      await adminAPI.deleteSkill(id)
      setSkills(p => p.filter(s => s.id !== id))
      toast.success('Skill deleted')
    } catch (_) { toast.error('Failed') }
  }

  const filteredUsers = users.filter(u =>
    !userSearch || u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.includes(userSearch.toLowerCase())
  )

  if (loading) return <div className={styles.loadingCenter}><Spinner size="lg" /></div>

  const STAT_CARDS = [
    { label: 'Total Users',       value: stats?.total_users,        color: '#3b82f6', icon: Users },
    { label: 'Job Seekers',       value: stats?.total_seekers,      color: '#8b5cf6', icon: UserCheck },
    { label: 'Employers',         value: stats?.total_employers,    color: '#f59e0b', icon: Briefcase },
    { label: 'Active Jobs',       value: stats?.active_jobs,        color: '#10b981', icon: Briefcase },
    { label: 'Total Applications',value: stats?.total_applications, color: '#6366f1', icon: BarChart3 },
    { label: 'Jobs This Month',   value: stats?.jobs_this_month,    color: '#ec4899', icon: Plus },
    { label: 'Apps This Month',   value: stats?.applications_this_month ?? 0, color: '#14b8a6', icon: BarChart3 },
    { label: 'Verified Admins',   value: 1,                         color: '#ef4444', icon: ShieldCheck },
  ]

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Admin Panel</h1>
          <p>Platform management and analytics</p>
        </div>
        <button className={styles.refreshBtn} onClick={loadData} disabled={refreshing} title="Refresh data">
          <RefreshCw size={15} className={refreshing ? styles.spinning : ''} />
        </button>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className={styles.statsGrid}>
          {STAT_CARDS.map(({ label, value, color, icon: Icon }, i) => (
            <motion.div
              key={label}
              className={styles.statCard}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className={styles.statIcon} style={{ background: `${color}18`, color }}>
                <Icon size={18} />
              </div>
              <div>
                <div className={styles.statVal}>{value ?? 0}</div>
                <div className={styles.statLbl}>{label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tabs — synced with URL */}
      <div className={styles.tabs}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {tab === 'overview' && stats && (
        <div className={styles.overviewGrid}>
          <div className={styles.overviewCard}>
            <h3>Platform Summary</h3>
            <div className={styles.summaryList}>
              {[
                ['Total registered users', stats.total_users],
                ['Job seeker accounts',    stats.total_seekers],
                ['Employer accounts',      stats.total_employers],
                ['Total job listings',     stats.total_jobs],
                ['Currently active jobs',  stats.active_jobs],
                ['Total applications',     stats.total_applications],
              ].map(([label, val]) => (
                <div key={label}><span>{label}</span><strong>{val}</strong></div>
              ))}
            </div>
          </div>
          <div className={styles.overviewCard}>
            <h3>This Month</h3>
            <div className={styles.summaryList}>
              <div><span>New job postings</span><strong>{stats.jobs_this_month}</strong></div>
              <div><span>New applications</span><strong>{stats.applications_this_month ?? 0}</strong></div>
            </div>
            <div className={styles.adminHint}>
              <p>💡 To create an admin account: register normally → run SQL:</p>
              <code>UPDATE users SET role = 'admin' WHERE email = 'your@email.com';</code>
            </div>
          </div>
        </div>
      )}

      {/* ── Users tab ── */}
      {tab === 'users' && (
        <div className={styles.tableSection}>
          <div className={styles.tableToolbar}>
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Search by email or role..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
            <span className={styles.userCount}>{filteredUsers.length} users</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    <td className={styles.emailCell}>{u.email}</td>
                    <td>
                      <Badge variant={u.role === 'admin' ? 'danger' : u.role === 'employer' ? 'warning' : 'primary'}>
                        {u.role}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={u.is_active ? 'success' : 'default'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className={styles.dateCell}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className={styles.tableActions}>
                        <button
                          className={styles.tableBtn}
                          onClick={() => handleToggleUser(u.id, u.is_active)}
                          disabled={updatingId === u.id}
                          title={u.is_active ? 'Deactivate user' : 'Activate user'}
                        >
                          {updatingId === u.id
                            ? <Spinner size="xs" />
                            : u.is_active ? <UserX size={14} /> : <UserCheck size={14} />
                          }
                        </button>
                        <button
                          className={`${styles.tableBtn} ${styles.deleteBtnTable}`}
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          title="Delete user permanently"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className={styles.emptyTable}>
                {userSearch ? `No users matching "${userSearch}"` : 'No users found'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Skills tab ── */}
      {tab === 'skills' && (
        <div className={styles.skillsPanel}>
          <div className={styles.skillsHeader}>
            <p className={styles.skillsHint}>
              Skills added here are available to all seekers and employers when building profiles and posting jobs.
            </p>
          </div>
          <div className={styles.skillAddRow}>
            <input
              className={styles.skillAddInput}
              placeholder="Add skill (e.g. React, AWS, Python, Figma)…"
              value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
            />
            <Button size="sm" onClick={handleAddSkill}>
              <Plus size={14} /> Add Skill
            </Button>
          </div>
          <div className={styles.skillsCount}>{skills.length} skills in platform</div>
          <div className={styles.skillsGrid}>
            {skills.map(s => (
              <motion.div
                key={s.id}
                className={styles.skillChip}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <span>{s.name}</span>
                <button onClick={() => handleDeleteSkill(s.id, s.name)} title={`Delete "${s.name}"`}>
                  <Trash2 size={11} />
                </button>
              </motion.div>
            ))}
          </div>
          {skills.length === 0 && (
            <div className={styles.emptySkills}>
              No skills yet. Add some above to get started — seekers and employers need skills for matching.
            </div>
          )}
        </div>
      )}
    </div>
  )
}