import React from 'react';

interface RasterGridProps {
  className?: string;
  opacity?: number;
}

export const RasterGrid: React.FC<RasterGridProps> = ({
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
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 240 160"
        fill="none"
      >
        <defs>
          <pattern id="rasterTilePattern" width="24" height="24" patternUnits="userSpaceOnUse">
            <rect width="24" height="24" fill="none" stroke="#568693" strokeWidth="0.5" strokeOpacity="0.4" />
            <circle cx="12" cy="12" r="1" fill="#568693" fillOpacity="0.6" />
          </pattern>
        </defs>
        <rect width="240" height="160" fill="url(#rasterTilePattern)" />
        {/* Subtle satellite tile diagonal demarcation */}
        <line x1="0" y1="48" x2="240" y2="48" stroke="#4F7D60" strokeWidth="0.8" strokeDasharray="6 4" strokeOpacity="0.5" />
        <line x1="120" y1="0" x2="120" y2="160" stroke="#4F7D60" strokeWidth="0.8" strokeDasharray="6 4" strokeOpacity="0.5" />
      </svg>
    </div>
  );
};

export default RasterGrid;
