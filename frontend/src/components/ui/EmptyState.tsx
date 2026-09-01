import React from 'react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { Button } from './Button';

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}> = ({
  icon = <Inbox size={36} className="text-slate-500" />,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`p-8 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 flex flex-col items-center justify-center text-center my-4 ${className}`}>
      <div className="mb-3">{icon}</div>
      <h4 className="text-base font-bold text-white mb-1">{title}</h4>
      {description && <p className="text-xs text-slate-400 max-w-sm mb-4">{description}</p>}
      {actionLabel && onAction && (
        <Button size="sm" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export const LoadingState: React.FC<{
  message?: string;
  className?: string;
}> = ({ message = 'Loading data...', className = '' }) => {
  return (
    <div className={`p-12 flex flex-col items-center justify-center text-center ${className}`}>
      <Loader2 size={32} className="text-emerald-400 animate-spin mb-3" />
      <span className="text-sm font-medium text-slate-300">{message}</span>
    </div>
  );
};

export const ErrorState: React.FC<{
  message?: string;
  onRetry?: () => void;
  className?: string;
}> = ({ message = 'An error occurred while loading content.', onRetry, className = '' }) => {
  return (
    <div className={`p-8 rounded-xl border border-rose-500/20 bg-rose-500/5 flex flex-col items-center justify-center text-center my-4 ${className}`}>
      <AlertCircle size={32} className="text-rose-400 mb-2" />
      <h4 className="text-sm font-bold text-rose-300 mb-1">Unable to Load Data</h4>
      <p className="text-xs text-slate-400 max-w-md mb-4">{message}</p>
      {onRetry && (
        <Button size="sm" variant="danger" onClick={onRetry}>
          Retry Request
        </Button>
      )}
    </div>
  );
};
