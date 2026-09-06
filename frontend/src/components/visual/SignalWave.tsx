import React from 'react';

interface SignalWaveProps {
  className?: string;
  opacity?: number;
  color?: string;
}

export const SignalWave: React.FC<SignalWaveProps> = ({
  className = '',
  opacity = 0.06,
  color = '#4F7D60',
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
        viewBox="0 0 300 120"
        fill="none"
      >
        <path
          d="M 0 60 Q 30 20 60 60 T 120 60 T 180 60 T 240 60 T 300 60"
          stroke={color}
          strokeWidth="1.2"
          className="signal-flow-anim"
        />
        <path
          d="M 0 60 Q 30 100 60 60 T 120 60 T 180 60 T 240 60 T 300 60"
          stroke="#827561"
          strokeWidth="0.8"
          opacity="0.6"
          strokeDasharray="2 4"
        />
        {/* Stream ticks */}
        <line x1="60" y1="50" x2="60" y2="70" stroke={color} strokeWidth="1" />
        <line x1="120" y1="45" x2="120" y2="75" stroke={color} strokeWidth="1" />
        <line x1="180" y1="52" x2="180" y2="68" stroke={color} strokeWidth="1" />
        <line x1="240" y1="46" x2="240" y2="74" stroke={color} strokeWidth="1" />
      </svg>
    </div>
  );
};

export default SignalWave;
