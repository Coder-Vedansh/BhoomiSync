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

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
  pattern?: 'grid' | 'contour' | 'radar' | 'pulse' | 'coordinates' | 'signal' | 'topographic';
  patternOpacity?: number;
  showReticles?: boolean;
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  actions,
  footer,
  noPadding = false,
  pattern,
  patternOpacity,
  showReticles = false,
  elevated = false,
  className = '',
  ...props
}) => {
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
      className={`card relative overflow-hidden bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-level-1)] transition-all duration-200 ${
        elevated ? 'shadow-[var(--shadow-level-2)] border-[var(--border-highlight)]' : ''
      } ${className}`}
      {...props}
    >
      {/* Background Visual Pattern */}
      {renderPattern()}

      {/* Optical Precision Corner Reticles */}
      {showReticles && (
        <>
          <div className="corner-reticle reticle-tl" />
          <div className="corner-reticle reticle-tr" />
          <div className="corner-reticle reticle-bl" />
          <div className="corner-reticle reticle-br" />
        </>
      )}

      {/* Card Content with Relative Positioning */}
      <div className="relative z-10">
        {(title || actions) && (
          <div className="card-header flex items-center justify-between pb-3 mb-3 border-b border-[var(--border)]">
            <div>
              {title && <h3 className="card-title text-sm font-semibold text-slate-100">{title}</h3>}
              {subtitle && <p className="card-subtitle text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        <div className={noPadding ? '' : 'p-0'}>{children}</div>
        {footer && (
          <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-slate-400">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;
