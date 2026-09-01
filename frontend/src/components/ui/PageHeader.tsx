import React from 'react';

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; onClick?: () => void }[];
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs,
  className = '',
}) => {
  return (
    <div className={`mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800/80 ${className}`}>
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span>/</span>}
                {crumb.onClick ? (
                  <button
                    onClick={crumb.onClick}
                    className="hover:text-emerald-400 transition-colors"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-slate-300">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-3xl">{subtitle}</p>}
      </div>

      {actions && <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0">{actions}</div>}
    </div>
  );
};
