import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = 'md',
  style,
  ...props
}) => {
  const roundedClass = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }[rounded];

  return (
    <div
      className={`skeleton-shimmer bg-slate-800/60 ${roundedClass} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
};

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 6,
}) => {
  const cellWidths = ['60%', '80%', '45%', '70%', '55%', '90%', '40%'];

  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="border-b border-slate-800/60">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <td key={cIdx} className="py-3 px-4">
              <Skeleton
                height={14}
                style={{ width: cellWidths[(rIdx + cIdx) % cellWidths.length] }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export interface CardSkeletonProps {
  count?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-5 rounded-2xl bg-[#131b2e] border border-[#22334d] flex flex-col justify-between h-32"
        >
          <div className="flex items-center justify-between">
            <Skeleton width="45%" height={12} />
            <Skeleton width={28} height={28} rounded="md" />
          </div>
          <Skeleton width="60%" height={26} />
          <Skeleton width="40%" height={10} />
        </div>
      ))}
    </div>
  );
};

export interface ProgressOperationBannerProps {
  title?: string;
  stageName?: string;
  stageIndex?: number;
  totalStages?: number;
  progressPercent?: number;
  className?: string;
}

export const ProgressOperationBanner: React.FC<ProgressOperationBannerProps> = ({
  title = 'Processing survey...',
  stageName = 'Orthomosaic generation',
  stageIndex = 6,
  totalStages = 11,
  progressPercent = 54,
  className = '',
}) => {
  return (
    <div className={`p-4 rounded-xl bg-slate-900/90 border border-sky-500/30 backdrop-blur-md shadow-lg space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-xs font-semibold text-white">{title}</span>
        </div>
        <span className="text-[11px] font-mono text-sky-400 font-bold">{progressPercent}%</span>
      </div>

      {/* Engineered Progress Track */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>Current stage: <strong className="text-slate-200">{stageName}</strong></span>
        <span className="font-mono text-[10px] text-slate-500">Stage {stageIndex} of {totalStages}</span>
      </div>
    </div>
  );
};
