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
    <div className={`mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#D8D5CC] ${className}`}>
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-[#858B82] mb-1.5">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span>/</span>}
                {crumb.onClick ? (
                  <button
                    onClick={crumb.onClick}
                    className="hover:text-[#2E513E] transition-colors"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-[#5F665D] font-medium">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl md:text-2xl font-extrabold text-[#20251F] tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-xs md:text-sm text-[#5F665D] mt-1 max-w-3xl leading-relaxed">{subtitle}</p>}
      </div>

      {actions && <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0">{actions}</div>}
    </div>
  );
};

export default PageHeader;
