// frontend/src/components/ui/Pagination.jsx  (NEW FILE)

import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './Pagination.module.css'

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  // Build page numbers: always show first, last, current ± 1
  const pages = []
  const addPage = (p) => { if (p >= 1 && p <= totalPages && !pages.includes(p)) pages.push(p) }

  addPage(1)
  addPage(page - 1)
  addPage(page)
  addPage(page + 1)
  addPage(totalPages)
  pages.sort((a, b) => a - b)

  // Insert ellipsis markers
  const withGaps = []
  for (let i = 0; i < pages.length; i++) {
    withGaps.push(pages[i])
    if (i < pages.length - 1 && pages[i + 1] - pages[i] > 1) {
      withGaps.push('...')
    }
  }

  return (
    <div className={styles.wrap}>
      <button
        className={styles.btn}
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
      >
        <ChevronLeft size={15} />
      </button>

      {withGaps.map((p, i) =>
        p === '...' ? (
          <span key={`gap-${i}`} className={styles.gap}>…</span>
        ) : (
          <motion.button
            key={p}
            className={`${styles.btn} ${p === page ? styles.btnActive : ''}`}
            onClick={() => onPageChange(p)}
            whileTap={{ scale: 0.92 }}
          >
            {p}
          </motion.button>
        )
      )}

      <button
        className={styles.btn}
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
      >
        <ChevronRight size={15} />
      </button>
    </div>
  )
}