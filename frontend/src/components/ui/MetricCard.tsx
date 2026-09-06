import React from 'react';
import {
  AnimatedGrid,
  ContourBackground,
  RadarSweep,
  TelemetryPulse,
  CoordinatePattern,
  SignalWave,
  TopographicPattern,
  CadastralPattern,
  FlightPathPattern,
  RasterGrid,
} from '../visual';

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  subtitle?: React.ReactNode;
  variant?: 'default' | 'forest' | 'brass' | 'map-blue' | 'terracotta' | 'emerald' | 'cyan' | 'amber' | 'rose' | 'purple';
  pattern?:
    | 'grid'
    | 'contour'
    | 'radar'
    | 'pulse'
    | 'coordinates'
    | 'signal'
    | 'topographic'
    | 'cadastral'
    | 'flight-path'
    | 'raster';
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
  // Map legacy variants to cartographic semantic accents
  const normalizedVariant =
    variant === 'emerald'
      ? 'forest'
      : variant === 'amber'
      ? 'brass'
      : variant === 'cyan' || variant === 'purple'
      ? 'map-blue'
      : variant === 'rose'
      ? 'terracotta'
      : variant;

  const variantStyles = {
    default: {
      border: 'border-[#D8D5CC] hover:border-[#BFCDBF]',
      iconBg: 'bg-[#FAF9F5] text-[#2E513E] border-[#D8D5CC]',
    },
    forest: {
      border: 'border-[#D8D5CC] hover:border-[#BBD4C1]',
      iconBg: 'bg-[#E6EFE8] text-[#2E513E] border-[#BBD4C1]',
    },
    brass: {
      border: 'border-[#D8D5CC] hover:border-[#EBD99A]',
      iconBg: 'bg-[#FBF4DC] text-[#74591D] border-[#EBD99A]',
    },
    'map-blue': {
      border: 'border-[#D8D5CC] hover:border-[#BDD7DE]',
      iconBg: 'bg-[#E8F1F3] text-[#385963] border-[#BDD7DE]',
    },
    terracotta: {
      border: 'border-[#D8D5CC] hover:border-[#E6C0B1]',
      iconBg: 'bg-[#FAEAE5] text-[#914B38] border-[#E6C0B1]',
    },
  }[normalizedVariant as 'default' | 'forest' | 'brass' | 'map-blue' | 'terracotta'] || {
    border: 'border-[#D8D5CC] hover:border-[#BFCDBF]',
    iconBg: 'bg-[#FAF9F5] text-[#2E513E] border-[#D8D5CC]',
  };

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
      case 'cadastral':
        return <CadastralPattern opacity={patternOpacity} />;
      case 'flight-path':
        return <FlightPathPattern opacity={patternOpacity} />;
      case 'raster':
        return <RasterGrid opacity={patternOpacity} />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`metric-card relative overflow-hidden bg-white border ${variantStyles.border} rounded-[var(--radius-lg)] p-5 shadow-[0_4px_18px_rgba(44,52,43,0.07)] hover:shadow-[0_8px_26px_rgba(44,52,43,0.10)] hover:bg-[#FCFCF8] transition-all duration-200 group flex flex-col justify-between ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Visual Pattern */}
      {renderPattern()}

      {/* Optical Corner Reticles (Stone / subtle Forest tint) */}
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
        <span className="text-xs font-semibold uppercase tracking-wider text-[#5F665D]">{label}</span>
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
        <div className="text-2xl sm:text-3xl font-bold font-sans text-[#20251F] tracking-tight">
          {value}
        </div>
        {subtitle && (
          <div className="mt-2 text-xs text-[#5F665D] flex items-center justify-between border-t border-[#D8D5CC] pt-2.5">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
