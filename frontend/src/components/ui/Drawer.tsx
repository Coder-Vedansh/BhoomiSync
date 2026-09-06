import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  position?: 'right' | 'left';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'lg',
  position = 'right',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const widthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[width];

  const xOffset = position === 'left' ? -12 : 12;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 bg-[#24201B]/40 backdrop-blur-xs pointer-events-auto"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ opacity: 0, x: xOffset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: xOffset }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed top-0 bottom-0 ${
              position === 'left' ? 'left-0 border-r' : 'right-0 border-l'
            } z-50 w-full ${widthClass} h-full bg-[#FAF9F5] border-[#D8D5CC] shadow-[0_16px_36px_rgba(44,52,43,0.14)] flex flex-col justify-between overflow-hidden pointer-events-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8D5CC] bg-[#ECEAE2]">
              <div>
                <h3 className="text-base font-bold text-[#20251F] tracking-tight">{title}</h3>
                {subtitle && <p className="text-xs text-[#5F665D] mt-0.5">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#5F665D] hover:text-[#20251F] hover:bg-[#EEF2EC] transition-colors cursor-pointer"
                title="Close Drawer (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-[#4F574D] text-xs">
              {children}
            </div>

            {/* Drawer Footer Actions */}
            {footer && (
              <div className="px-6 py-4 bg-[#FAF9F5] border-t border-[#D8D5CC] flex items-center justify-end gap-2.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Drawer;
