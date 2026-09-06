import React from 'react';

interface RadarSweepProps {
  className?: string;
  opacity?: number;
}

export const RadarSweep: React.FC<RadarSweepProps> = ({
  className = '',
  opacity = 0.08,
}) => {
  return (
    <div
      className={`card-pattern-overlay ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 200"
      >
        <defs>
          <radialGradient id="radar-forest-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4F7D60" stopOpacity="0.3" />
            <stop offset="60%" stopColor="#2E513E" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#2E513E" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sweep-beam-forest" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F7D60" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#4F7D60" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Concentric distance rings (Warm stone) */}
        <circle cx="100" cy="100" r="30" fill="none" stroke="#827561" strokeWidth="0.75" strokeDasharray="2 3" />
        <circle cx="100" cy="100" r="60" fill="none" stroke="#827561" strokeWidth="0.75" strokeDasharray="3 4" />
        <circle cx="100" cy="100" r="90" fill="none" stroke="#827561" strokeWidth="0.75" />

        {/* Orthogonal crosshairs */}
        <line x1="10" y1="100" x2="190" y2="100" stroke="#827561" strokeWidth="0.6" strokeDasharray="2 2" />
        <line x1="100" y1="10" x2="100" y2="190" stroke="#827561" strokeWidth="0.6" strokeDasharray="2 2" />

        {/* Rotating Radar Sweep Blade (Forest to Transparent) */}
        <g className="radar-sweep-anim">
          <path
            d="M 100 100 L 190 100 A 90 90 0 0 0 163.6 36.4 Z"
            fill="url(#sweep-beam-forest)"
            opacity="0.35"
          />
          <line x1="100" y1="100" x2="190" y2="100" stroke="#4F7D60" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
};

export default RadarSweep;
