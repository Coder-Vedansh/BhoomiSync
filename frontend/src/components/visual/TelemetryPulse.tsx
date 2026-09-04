import React from 'react';

interface TelemetryPulseProps {
  className?: string;
  opacity?: number;
  color?: string;
}

export const TelemetryPulse: React.FC<TelemetryPulseProps> = ({
  className = '',
  opacity = 0.09,
  color = '#06b6d4',
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
        viewBox="0 0 160 160"
      >
        <circle
          cx="80"
          cy="80"
          r="24"
          fill="none"
          stroke={color}
          strokeWidth="1"
          strokeDasharray="2 3"
        />
        <circle
          cx="80"
          cy="80"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="1.2"
          className="telemetry-pulse-anim"
        />
        <circle
          cx="80"
          cy="80"
          r="68"
          fill="none"
          stroke={color}
          strokeWidth="0.8"
          strokeDasharray="4 4"
        />
        <circle cx="80" cy="80" r="3" fill={color} />
      </svg>
    </div>
  );
};

export default TelemetryPulse;
