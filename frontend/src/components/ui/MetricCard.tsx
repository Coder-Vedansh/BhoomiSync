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
  const variantStyles = {
    default: {
      border: 'border-[#22334d] hover:border-slate-500/50',
      iconBg: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
    },
    emerald: {
      border: 'border-[#22334d] hover:border-emerald-500/50',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    cyan: {
      border: 'border-[#22334d] hover:border-sky-500/50',
      iconBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    },
    amber: {
      border: 'border-[#22334d] hover:border-amber-500/50',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    rose: {
      border: 'border-[#22334d] hover:border-rose-500/50',
      iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    },
    purple: {
      border: 'border-[#22334d] hover:border-purple-500/50',
      iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
  }[variant];

  return (
    <div
      onClick={onClick}
      className={`bg-[#131b2e] border ${variantStyles.border} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">{label}</span>
        <div className="flex items-center gap-2">
          {badge}
          {icon && (
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 ${variantStyles.iconBg}`}
            >
              {icon}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-3xl font-bold font-mono text-white tracking-tight">
          {value}
        </div>
        {subtitle && (
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-[#1e2c42] pt-2.5">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
