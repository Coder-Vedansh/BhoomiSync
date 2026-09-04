import React from 'react';

interface AnimatedGridProps {
  className?: string;
  opacity?: number;
}

export const AnimatedGrid: React.FC<AnimatedGridProps> = ({
  className = '',
  opacity = 0.06,
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
        width="100%"
        height="100%"
      >
        <defs>
          <pattern
            id="survey-grid-pattern"
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 32 0 L 0 0 0 32"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="0.75"
              strokeDasharray="2 3"
            />
            {/* Tiny intersection crosshair */}
            <path
              d="M 14 16 L 18 16 M 16 14 L 16 18"
              fill="none"
              stroke="#10b981"
              strokeWidth="0.85"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#survey-grid-pattern)" />
      </svg>
    </div>
  );
};

export default AnimatedGrid;
