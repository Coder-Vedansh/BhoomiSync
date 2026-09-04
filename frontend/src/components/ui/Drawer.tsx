import React, { useEffect } from 'react';
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

  if (!isOpen) return null;

  const widthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[width];

  return (
    <div
      className={`fixed inset-0 z-50 flex ${
        position === 'left' ? 'justify-start' : 'justify-end'
      } bg-black/60 backdrop-blur-xs animate-fade-in`}
    >
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Panel */}
      <div
        className={`relative z-10 w-full ${widthClass} h-full bg-slate-900 ${
          position === 'left' ? 'border-r' : 'border-l'
        } border-slate-800 shadow-2xl flex flex-col justify-between animate-slide-in overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Drawer (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-200 text-xs">
          {children}
        </div>

        {/* Drawer Footer Actions */}
        {footer && (
          <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
