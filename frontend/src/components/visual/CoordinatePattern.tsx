import React from 'react';

interface CoordinatePatternProps {
  className?: string;
  opacity?: number;
}

export const CoordinatePattern: React.FC<CoordinatePatternProps> = ({
  className = '',
  opacity = 0.07,
}) => {
  return (
    <div
      className={`card-pattern-overlay ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full font-mono text-[8px]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 300 160"
        fill="none"
      >
        {/* Lat/Lon grid lines */}
        <line x1="0" y1="40" x2="300" y2="40" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1="0" y1="80" x2="300" y2="80" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1="0" y1="120" x2="300" y2="120" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="3 3" />

        <line x1="75" y1="0" x2="75" y2="160" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1="150" y1="0" x2="150" y2="160" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1="225" y1="0" x2="225" y2="160" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="3 3" />

        {/* Graduation ticks and coordinates */}
        <text x="8" y="36" fill="#10b981">24.5854° N</text>
        <text x="8" y="76" fill="#94a3b8">24.5840° N</text>
        <text x="8" y="116" fill="#94a3b8">24.5826° N</text>

        <text x="80" y="152" fill="#94a3b8">73.7110° E</text>
        <text x="155" y="152" fill="#10b981">73.7125° E</text>
        <text x="230" y="152" fill="#94a3b8">73.7140° E</text>

        {/* Center reticle */}
        <circle cx="150" cy="80" r="10" stroke="#10b981" strokeWidth="0.8" />
        <circle cx="150" cy="80" r="2" fill="#10b981" />
      </svg>
    </div>
  );
};

export default CoordinatePattern;
