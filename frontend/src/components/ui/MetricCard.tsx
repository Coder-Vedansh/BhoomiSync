import React from 'react';

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  subtitle?: React.ReactNode;
  variant?: 'default' | 'emerald' | 'cyan' | 'amber' | 'rose' | 'purple';
  className?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  badge,
  subtitle,
  variant = 'default',
  className = '',
  onClick,
}) => {
  const borderHighlight = {
    default: 'border-slate-800 hover:border-slate-700',
    emerald: 'border-emerald-500/20 hover:border-emerald-500/40',
    cyan: 'border-cyan-500/20 hover:border-cyan-500/40',
    amber: 'border-amber-500/20 hover:border-amber-500/40',
    rose: 'border-rose-500/20 hover:border-rose-500/40',
    purple: 'border-purple-500/20 hover:border-purple-500/40',
  }[variant];

  return (
    <div
      onClick={onClick}
      className={`metric-card ${borderHighlight} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="metric-card-top">
        <span className="metric-card-label">{label}</span>
        <div className="flex items-center gap-2">
          {badge}
          {icon && <div className="metric-card-icon">{icon}</div>}
        </div>
      </div>
      <div className="metric-card-value">{value}</div>
      {subtitle && <div className="metric-card-sub">{subtitle}</div>}
    </div>
  );
};
