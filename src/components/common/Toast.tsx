import React, { useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Toast: React.FC = () => {
  const { toast, hideToast } = useStore();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      hideToast();
    }, 3200);
    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.95 }}
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-auto"
        >
          <div
            id="app-toast-alert"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-[#2F5233] text-white border-[#3D6B45]'
                : toast.type === 'error'
                ? 'bg-[#8E2828] text-white border-red-700'
                : 'bg-[#2A2A28] text-white border-neutral-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#D9A441] shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-200 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-amber-300 shrink-0" />}

            <span className="flex-1 leading-snug">{toast.message}</span>

            <button
              id="toast-close-btn"
              onClick={hideToast}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
