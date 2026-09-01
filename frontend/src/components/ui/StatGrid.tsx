import React from 'react';

export interface StatGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export const StatGrid: React.FC<StatGridProps> = ({
  children,
  columns = 4,
  className = '',
}) => {
  const colClass = {
    1: 'grid-1',
    2: 'grid-2',
    3: 'grid-3',
    4: 'grid-4',
  }[columns];

  return <div className={`${colClass} mb-6 ${className}`}>{children}</div>;
};
