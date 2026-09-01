import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export interface AppShellProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onSelectTab,
  children,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-container bg-bg-primary text-slate-100 min-h-screen">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main View Area */}
      <div
        className="main-content flex flex-col flex-1 min-h-screen"
        style={{
          marginLeft: isCollapsed ? 76 : 260,
          width: `calc(100% - ${isCollapsed ? 76 : 260}px)`,
        }}
      >
        <Header
          currentTab={currentTab}
          onNavigate={onSelectTab}
          onToggleMobileMenu={() => setMobileOpen(!mobileOpen)}
        />

        <main className="page-container flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};
