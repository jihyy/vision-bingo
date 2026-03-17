import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info'
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-sm bg-white rounded-none p-6 space-y-6 shadow-2xl border border-neutral-200"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-none ${variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
            </div>
            <p className="text-sm text-neutral-500 leading-relaxed">{message}</p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 bg-neutral-100 text-neutral-600 font-bold hover:bg-neutral-200 transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-3 text-white font-bold transition-colors ${
                  variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-neutral-900 hover:bg-neutral-800'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
