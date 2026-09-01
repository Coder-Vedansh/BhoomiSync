import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'purple' | 'slate';
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
  const variantClass = {
    emerald: 'badge-emerald',
    cyan: 'badge-cyan',
    amber: 'badge-amber',
    rose: 'badge-rose',
    purple: 'badge-purple',
    slate: 'badge-slate',
  }[variant];

  const dotColor = {
    emerald: 'bg-emerald-400',
    cyan: 'bg-cyan-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    purple: 'bg-purple-400',
    slate: 'bg-slate-400',
  }[variant];

  return (
    <span className={`badge ${variantClass} ${size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : ''} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse mr-1`} />}
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
    variant = 'purple';
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
    <Badge variant={variant} dot={norm.includes('RUN') || norm.includes('PROCESS') || norm.includes('LIVE')} className={className}>
      {formatLabel(status)}
    </Badge>
  );
};

