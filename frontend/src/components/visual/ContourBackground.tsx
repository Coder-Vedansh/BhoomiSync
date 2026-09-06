import React from 'react';

interface ContourBackgroundProps {
  className?: string;
  opacity?: number;
}

export const ContourBackground: React.FC<ContourBackgroundProps> = ({
  className = '',
  opacity = 0.05,
}) => {
  return (
    <div
      className={`card-pattern-overlay ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full contour-drift-anim"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 240"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M-20,40 Q80,10 180,60 T380,30 T480,70"
          stroke="#4F7D60"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        <path
          d="M-10,90 Q90,50 200,110 T390,80 T490,120"
          stroke="#568693"
          strokeWidth="0.85"
        />
        <path
          d="M-30,140 Q70,110 170,160 T370,130 T470,170"
          stroke="#827561"
          strokeWidth="1"
          strokeDasharray="6 4"
        />
        <path
          d="M-15,190 Q85,150 190,210 T385,180 T485,220"
          stroke="#B18F2E"
          strokeWidth="0.75"
        />
      </svg>
    </div>
  );
};

export default ContourBackground;
