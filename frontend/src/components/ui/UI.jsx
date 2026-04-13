import { motion } from 'framer-motion'
import styles from './UI.module.css'

export function Button({ children, variant = 'primary', size = 'md', loading = false, disabled, className = '', fullWidth = false, ...props }) {
  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.015 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
      className={`${styles.btn} ${styles[`btn--${variant}`]} ${styles[`btn--${size}`]} ${fullWidth ? styles.btnFull : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" color="currentColor" />}
      {children}
    </motion.button>
  )
}

export function Input({ label, error, hint, icon, className = '', ...props }) {
  return (
    <div className={`${styles.field} ${className}`}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.inputWrap}>
        {icon && <span className={styles.inputIcon}>{icon}</span>}
        <input
          className={`${styles.input} ${icon ? styles.inputWithIcon : ''} ${error ? styles.inputError : ''}`}
          {...props}
        />
      </div>
      {error && <span className={styles.fieldError}>{error}</span>}
      {hint && !error && <span className={styles.fieldHint}>{hint}</span>}
    </div>
  )
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className={`${styles.field} ${className}`}>
      {label && <label className={styles.label}>{label}</label>}
      <textarea className={`${styles.input} ${styles.textarea} ${error ? styles.inputError : ''}`} {...props} />
      {error && <span className={styles.fieldError}>{error}</span>}
    </div>
  )
}

export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className={`${styles.field} ${className}`}>
      {label && <label className={styles.label}>{label}</label>}
      <select className={`${styles.input} ${styles.select} ${error ? styles.inputError : ''}`} {...props}>
        {children}
      </select>
      {error && <span className={styles.fieldError}>{error}</span>}
    </div>
  )
}

export function Card({ children, className = '', hover = false, onClick, ...props }) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, boxShadow: 'var(--shadow-md)' } : undefined}
      transition={{ duration: 0.18 }}
      className={`${styles.card} ${hover ? styles.cardHover : ''} ${onClick ? styles.cardClickable : ''} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function Badge({ children, variant = 'default', className = '' }) {
  return <span className={`${styles.badge} ${styles[`badge--${variant}`]} ${className}`}>{children}</span>
}

export function Spinner({ size = 'md', color, className = '' }) {
  return (
    <span
      className={`${styles.spinner} ${styles[`spinner--${size}`]} ${className}`}
      style={color ? { borderTopColor: color, borderRightColor: color } : undefined}
    />
  )
}

export function Avatar({ src, name, size = 'md', className = '' }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'
  return (
    <div className={`${styles.avatar} ${styles[`avatar--${size}`]} ${className}`}>
      {src ? <img src={src} alt={name} /> : <span>{initials}</span>}
    </div>
  )
}

export function Divider({ label, className = '' }) {
  return (
    <div className={`${styles.divider} ${className}`}>
      {label && <span>{label}</span>}
    </div>
  )
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={styles.emptyState}>
      {icon && <div className={styles.emptyIcon}>{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </motion.div>
  )
}

/* Skeleton cards */
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className={styles.skeletonCard}>
      <div className={`${styles.skeletonLine} skeleton`} style={{ width: '40%', height: 14, marginBottom: 12 }} />
      <div className={`${styles.skeletonLine} skeleton`} style={{ width: '70%', height: 20, marginBottom: 8 }} />
      {Array.from({ length: lines - 2 }).map((_, i) => (
        <div key={i} className={`${styles.skeletonLine} skeleton`} style={{ width: `${60 + Math.random() * 30}%`, height: 12, marginBottom: 6 }} />
      ))}
    </div>
  )
}

export function SkeletonJobCard() {
  return (
    <div className={styles.skeletonCard}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 6, borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 12, width: '40%', borderRadius: 6 }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: 12, width: '80%', marginBottom: 6, borderRadius: 6 }} />
      <div className="skeleton" style={{ height: 12, width: '50%', borderRadius: 6 }} />
    </div>
  )
}

export function Modal({ isOpen, onClose, title, subtitle, children, footer, maxWidth = 540 }) {
  if (!isOpen) return null
  return (
    <motion.div
      className={styles.modalOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modalBox}
        style={{ maxWidth }}
        initial={{ scale: 0.93, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.93, y: 24, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        onClick={e => e.stopPropagation()}
      >
        {(title || subtitle) && (
          <div className={styles.modalHeader}>
            <div>
              {title && <h2 className={styles.modalTitle}>{title}</h2>}
              {subtitle && <p className={styles.modalSubtitle}>{subtitle}</p>}
            </div>
            <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
          </div>
        )}
        <div className={styles.modalBody}>{children}</div>
        {footer && <div className={styles.modalFooter}>{footer}</div>}
      </motion.div>
    </motion.div>
  )
}

export function ProgressBar({ value, max = 100, color, label }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={styles.progressWrap}>
      {label && <span className={styles.progressLabel}>{label}</span>}
      <div className={styles.progressTrack}>
        <motion.div
          className={styles.progressFill}
          style={{ background: color || 'var(--navy-600)' }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className={styles.progressValue}>{pct.toFixed(0)}%</span>
    </div>
  )
}