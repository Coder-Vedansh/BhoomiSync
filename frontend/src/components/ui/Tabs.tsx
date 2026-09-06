import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div className={`tabs-container ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`tab-btn ${isActive ? 'active' : ''}`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? 'bg-[#E6EFE8] text-[#2E6645]' : 'bg-[#EFEEE8] text-[#5F665D]'}`}>
                {tab.count}
              </span>
            )}
            {tab.badge}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
