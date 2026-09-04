import React from 'react';
import {
  AnimatedGrid,
  ContourBackground,
  RadarSweep,
  TelemetryPulse,
  CoordinatePattern,
  SignalWave,
  TopographicPattern,
} from '../visual';

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  subtitle?: React.ReactNode;
  variant?: 'default' | 'emerald' | 'cyan' | 'amber' | 'rose' | 'purple';
  pattern?: 'grid' | 'contour' | 'radar' | 'pulse' | 'coordinates' | 'signal' | 'topographic';
  patternOpacity?: number;
  showReticles?: boolean;
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
  pattern,
  patternOpacity = 0.06,
  showReticles = true,
  className = '',
  onClick,
}) => {
  const variantStyles = {
    default: {
      border: 'border-[var(--border-subtle)] hover:border-slate-500/50',
      iconBg: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
      accentGlow: 'hover:shadow-[0_0_15px_rgba(100,116,139,0.12)]',
    },
    emerald: {
      border: 'border-[var(--border-subtle)] hover:border-emerald-500/50',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      accentGlow: 'hover:shadow-[0_0_15px_rgba(16,185,129,0.12)]',
    },
    cyan: {
      border: 'border-[var(--border-subtle)] hover:border-sky-500/50',
      iconBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      accentGlow: 'hover:shadow-[0_0_15px_rgba(6,182,212,0.12)]',
    },
    amber: {
      border: 'border-[var(--border-subtle)] hover:border-amber-500/50',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      accentGlow: 'hover:shadow-[0_0_15px_rgba(245,158,11,0.12)]',
    },
    rose: {
      border: 'border-[var(--border-subtle)] hover:border-rose-500/50',
      iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      accentGlow: 'hover:shadow-[0_0_15px_rgba(244,63,94,0.12)]',
    },
    purple: {
      border: 'border-[var(--border-subtle)] hover:border-purple-500/50',
      iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      accentGlow: 'hover:shadow-[0_0_15px_rgba(139,92,246,0.12)]',
    },
  }[variant];

  const renderPattern = () => {
    switch (pattern) {
      case 'grid':
        return <AnimatedGrid opacity={patternOpacity} />;
      case 'contour':
        return <ContourBackground opacity={patternOpacity} />;
      case 'radar':
        return <RadarSweep opacity={patternOpacity} />;
      case 'pulse':
        return <TelemetryPulse opacity={patternOpacity} />;
      case 'coordinates':
        return <CoordinatePattern opacity={patternOpacity} />;
      case 'signal':
        return <SignalWave opacity={patternOpacity} />;
      case 'topographic':
        return <TopographicPattern opacity={patternOpacity} />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`metric-card relative overflow-hidden bg-[var(--surface-elevated)] border ${variantStyles.border} rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-level-1)] transition-all duration-200 group flex flex-col justify-between ${variantStyles.accentGlow} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Visual Pattern */}
      {renderPattern()}

      {/* Optical Corner Reticles */}
      {showReticles && (
        <>
          <div className="corner-reticle reticle-tl" />
          <div className="corner-reticle reticle-tr" />
          <div className="corner-reticle reticle-bl" />
          <div className="corner-reticle reticle-br" />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <div className="flex items-center gap-2">
          {badge}
          {icon && (
            <div
              className={`w-8 h-8 rounded-[var(--radius-md)] border flex items-center justify-center transition-transform group-hover:scale-105 ${variantStyles.iconBg}`}
            >
              {icon}
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 mt-3">
        <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
          {value}
        </div>
        {subtitle && (
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-[var(--border)] pt-2.5">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
