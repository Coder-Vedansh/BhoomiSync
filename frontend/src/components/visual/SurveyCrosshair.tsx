import React from 'react';

interface SurveyCrosshairProps {
  className?: string;
  size?: number;
  color?: string;
}

export const SurveyCrosshair: React.FC<SurveyCrosshairProps> = ({
  className = '',
  size = 28,
  color = '#10b981',
}) => {
  return (
    <svg
      className={`inline-block ${className}`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="11" stroke={color} strokeWidth="1" strokeDasharray="3 2" />
      <circle cx="16" cy="16" r="5" stroke={color} strokeWidth="1" />
      <circle cx="16" cy="16" r="1.5" fill={color} />
      {/* Precision reticle crossbars */}
      <line x1="16" y1="2" x2="16" y2="9" stroke={color} strokeWidth="1.2" />
      <line x1="16" y1="23" x2="16" y2="30" stroke={color} strokeWidth="1.2" />
      <line x1="2" y1="16" x2="9" y2="16" stroke={color} strokeWidth="1.2" />
      <line x1="23" y1="16" x2="30" y2="16" stroke={color} strokeWidth="1.2" />
    </svg>
  );
};

export default SurveyCrosshair;
