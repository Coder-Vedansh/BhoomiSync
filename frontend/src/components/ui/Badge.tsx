import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'emerald'
    | 'cyan'
    | 'amber'
    | 'rose'
    | 'purple'
    | 'slate'
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'neutral'
    | 'forest'
    | 'brass'
    | 'terracotta';
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'emerald',
  dot = false,
  size = 'md',
  className = '',
}) => {
  // Normalize semantic variants
  const normalizedVariant =
    variant === 'success' || variant === 'forest'
      ? 'emerald'
      : variant === 'warning' || variant === 'brass'
      ? 'amber'
      : variant === 'error' || variant === 'terracotta'
      ? 'rose'
      : variant === 'info' || variant === 'purple'
      ? 'cyan'
      : variant === 'neutral'
      ? 'slate'
      : variant;

  const variantClass = {
    emerald: 'badge-emerald',
    cyan: 'badge-cyan',
    amber: 'badge-amber',
    rose: 'badge-rose',
    purple: 'badge-cyan', // Remapped from purple to cartographic blue
    slate: 'badge-slate',
  }[normalizedVariant] || 'badge-slate';

  const dotColor = {
    emerald: 'bg-[#2E6645]',
    cyan: 'bg-[#385963]',
    amber: 'bg-[#74591D]',
    rose: 'bg-[#914B38]',
    purple: 'bg-[#385963]',
    slate: 'bg-[#5F665D]',
  }[normalizedVariant] || 'bg-[#5F665D]';

  return (
    <span className={`badge ${variantClass} ${size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : ''} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mr-1`} />}
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{
  status: string;
  className?: string;
}> = ({ status, className = '' }) => {
  const norm = (status || '').toUpperCase();
  let variant: 'emerald' | 'cyan' | 'amber' | 'rose' | 'purple' | 'slate' = 'slate';

  if (norm.includes('COMPLET') || norm.includes('ACTIVE') || norm.includes('APPROV') || norm.includes('VERIF') || norm.includes('FIX') || norm.includes('ON') || norm.includes('GENERATE')) {
    variant = 'emerald';
  } else if (norm.includes('RUN') || norm.includes('PROCESS') || norm.includes('LIVE')) {
    variant = 'cyan';
  } else if (norm.includes('QUEU') || norm.includes('PEND') || norm.includes('WARN') || norm.includes('REVIEW') || norm.includes('INIT')) {
    variant = 'amber';
  } else if (norm.includes('FAIL') || norm.includes('ERR') || norm.includes('REJECT') || norm.includes('DISPUT') || norm.includes('STOP') || norm.includes('OFF')) {
    variant = 'rose';
  } else if (norm.includes('DRAFT') || norm.includes('DEMO')) {
    variant = 'cyan'; // Remapped from purple to cartographic blue
  }

  // Format label: remove underscores and title-case
  const formatLabel = (s: string) => {
    if (!s) return 'Unknown';
    if (s === 'SURVEYOR_VERIFIED' || s === 'VERIFIED') return 'Verified';
    if (s === 'AUTO_MATCHED') return 'Auto Matched';
    if (s === 'UNDER_REVIEW') return 'Under Review';
    if (s === 'AI_DETECTED') return 'AI Detected';
    if (s === 'MANUALLY_EDITED') return 'Manually Edited';
    if (s === 'GENERATED') return 'Generated';
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <Badge
      variant={variant}
      dot={norm.includes('RUN') || norm.includes('PROCESS') || norm.includes('LIVE')}
      className={className}
    >
      {formatLabel(status)}
    </Badge>
  );
};

export const DataProvenanceBadge: React.FC<{
  source: 'LIVE' | 'SIMULATED' | 'ESTIMATED' | 'UNAVAILABLE';
  className?: string;
}> = ({ source, className = '' }) => {
  const config = {
    LIVE: {
      label: 'LIVE SENSOR',
      variant: 'emerald' as const,
      dot: true,
    },
    SIMULATED: {
      label: 'SIMULATION',
      variant: 'slate' as const,
      dot: false,
    },
    ESTIMATED: {
      label: 'ESTIMATED',
      variant: 'amber' as const,
      dot: false,
    },
    UNAVAILABLE: {
      label: 'NOT AVAILABLE',
      variant: 'slate' as const,
      dot: false,
    },
  }[source];

  return (
    <Badge
      variant={config.variant}
      size="sm"
      dot={config.dot}
      className={`font-mono font-bold tracking-wider text-[9px] uppercase ${className}`}
    >
      {config.label}
    </Badge>
  );
};

export default Badge;
