import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '../../stores/uiStore';

export function Toast() {
  const { toastMessage, toastType, clearToast } = useUiStore();

  const bg = {
    success: 'var(--color-success)',
    error: 'var(--color-error)',
    info: 'var(--color-primary)',
  }[toastType];

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          onClick={clearToast}
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '10px 20px',
            borderRadius: 8,
            background: bg,
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            maxWidth: '80vw',
          }}
        >
          {toastMessage}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
