import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * A panel that glides open and closed, its height following its content, instead of
 * appearing and vanishing at once. What is already open when the page loads does not animate.
 */
export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 38, opacity: { duration: 0.2 } }}
          style={{ overflow: 'hidden' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
