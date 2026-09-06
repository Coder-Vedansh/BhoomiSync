import React from 'react';

interface CadastralPatternProps {
  className?: string;
  opacity?: number;
}

export const CadastralPattern: React.FC<CadastralPatternProps> = ({
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
        viewBox="0 0 300 200"
        fill="none"
      >
        {/* Cadastral Khasra Boundary Grid */}
        <polygon
          points="20,20 120,35 110,110 30,95"
          stroke="#B18F2E"
          strokeWidth="1.2"
          fill="rgba(177, 143, 46, 0.03)"
        />
        <polygon
          points="120,35 240,25 250,115 110,110"
          stroke="#4F7D60"
          strokeWidth="1.2"
          fill="rgba(79, 125, 96, 0.03)"
        />
        <polygon
          points="30,95 110,110 95,185 15,165"
          stroke="#827561"
          strokeWidth="1"
          strokeDasharray="4 2"
          fill="rgba(130, 117, 97, 0.02)"
        />
        <polygon
          points="110,110 250,115 265,180 95,185"
          stroke="#B18F2E"
          strokeWidth="1.2"
          fill="rgba(177, 143, 46, 0.03)"
        />
        {/* Survey tie line */}
        <line x1="20" y1="20" x2="265" y2="180" stroke="#B18F2E" strokeWidth="0.6" strokeDasharray="2 4" />
      </svg>
    </div>
  );
};

export default CadastralPattern;
