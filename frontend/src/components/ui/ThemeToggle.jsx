// frontend/src/components/ui/ThemeToggle.jsx  (NEW FILE)
// Usage: import ThemeToggle from '../ui/ThemeToggle'
// Add <ThemeToggle /> in AppLayout topbar next to avatar

import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import styles from './ThemeToggle.module.css'

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <motion.button
      className={styles.toggle}
      onClick={toggleTheme}
      whileTap={{ scale: 0.9 }}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      <motion.div
        className={styles.track}
        animate={{ background: isDark ? '#163058' : '#e2e8f0' }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className={styles.thumb}
          animate={{ x: isDark ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          {isDark
            ? <Moon size={10} color="#e0cc96" />
            : <Sun  size={10} color="#c9a84c" />
          }
        </motion.div>
      </motion.div>
    </motion.button>
  )
}