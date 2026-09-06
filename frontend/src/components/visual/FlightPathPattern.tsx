import React from 'react';

interface FlightPathPatternProps {
  className?: string;
  opacity?: number;
}

export const FlightPathPattern: React.FC<FlightPathPatternProps> = ({
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
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 260 180"
        fill="none"
      >
        {/* Lawn-mower survey transects */}
        <path
          d="M 20 30 L 240 30 C 255 30, 255 70, 240 70 L 20 70 C 5 70, 5 110, 20 110 L 240 110 C 255 110, 255 150, 240 150 L 20 150"
          stroke="#568693"
          strokeWidth="1.2"
          strokeDasharray="5 3"
        />
        {/* Photo capture waypoint nodes */}
        <circle cx="20" cy="30" r="3" fill="#4F7D60" />
        <circle cx="90" cy="30" r="2" fill="#568693" />
        <circle cx="160" cy="30" r="2" fill="#568693" />
        <circle cx="240" cy="30" r="3" fill="#4F7D60" />

        <circle cx="240" cy="70" r="3" fill="#4F7D60" />
        <circle cx="160" cy="70" r="2" fill="#568693" />
        <circle cx="90" cy="70" r="2" fill="#568693" />
        <circle cx="20" cy="70" r="3" fill="#4F7D60" />

        <circle cx="20" cy="110" r="3" fill="#4F7D60" />
        <circle cx="130" cy="110" r="3.5" fill="#AD6048" />
        <circle cx="240" cy="110" r="3" fill="#4F7D60" />

        {/* Current position reticle */}
        <circle cx="130" cy="110" r="8" stroke="#AD6048" strokeWidth="0.8" strokeDasharray="2 2" />
      </svg>
    </div>
  );
};

export default FlightPathPattern;
