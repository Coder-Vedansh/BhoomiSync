import React from 'react';

interface TopographicPatternProps {
  className?: string;
  opacity?: number;
}

export const TopographicPattern: React.FC<TopographicPatternProps> = ({
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
        viewBox="0 0 320 200"
        fill="none"
      >
        <path
          d="M 20 40 C 80 10, 160 80, 240 30 C 280 5, 300 35, 320 25"
          stroke="#10b981"
          strokeWidth="1.2"
        />
        <path
          d="M 0 80 C 70 45, 140 120, 220 75 C 270 45, 290 85, 320 65"
          stroke="#10b981"
          strokeWidth="0.8"
          strokeDasharray="4 3"
        />
        <path
          d="M 10 120 C 85 90, 150 160, 230 115 C 280 85, 300 125, 320 105"
          stroke="#f59e0b"
          strokeWidth="1"
        />
        <path
          d="M 0 160 C 90 130, 170 190, 250 155 C 290 135, 310 165, 320 145"
          stroke="#94a3b8"
          strokeWidth="0.8"
          strokeDasharray="2 3"
        />
      </svg>
    </div>
  );
};

export default TopographicPattern;
