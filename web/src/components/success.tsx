import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * A moment that went right, like a booking made: a circle draws itself, then a tick,
 * and the card settles in with a spring. Announced as a status, as a notice is.
 */
export function SuccessCard({ children }: { children: ReactNode }) {
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="flex items-start gap-4 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-card ring-1 ring-inset ring-emerald-200"
    >
      <svg viewBox="0 0 52 52" aria-hidden="true" className="h-12 w-12 flex-none text-emerald-800">
        <motion.circle
          cx="26"
          cy="26"
          r="23"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          initial={{ pathLength: 0, opacity: 0.4 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
        <motion.path
          d="M15 27.5l7.5 7.5L37.5 19"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.4, duration: 0.35, ease: 'easeOut' }}
        />
      </svg>
      <p className="min-w-0 pt-1.5 text-[15px] font-medium leading-relaxed text-emerald-900">{children}</p>
    </motion.div>
  );
}
