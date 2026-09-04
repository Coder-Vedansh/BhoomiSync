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

  // Determine if active view is a map-centric GIS workspace
  const isGisWorkspace = [
    'gis',
    'workbench',
    'drone-mission',
    'gis-workbench',
    'geospatial',
    'ai-modules',
    'ai-analysis',
    'datasets',
    'surveys',
    'survey-detail',
  ].includes(currentTab);

  return (
    <div className={`app-container bg-bg-primary text-slate-100 min-h-screen ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
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
      <div className="main-content flex flex-col flex-1 min-w-0 min-h-screen">
        <Header
          currentTab={currentTab}
          onNavigate={onSelectTab}
          onToggleMobileMenu={() => setMobileOpen(!mobileOpen)}
          isSidebarCollapsed={isCollapsed}
          onToggleSidebar={() => setIsCollapsed(!isCollapsed)}
        />

        {/* Dynamic Canvas: Map views receive 100% edge-to-edge area; dashboard/tables receive clean padding */}
        {isGisWorkspace ? (
          <main className="flex-1 flex flex-col min-h-0 w-full overflow-hidden relative">
            {children}
          </main>
        ) : (
          <main className="page-container flex-1">
            {children}
          </main>
        )}
      </div>
    </div>
  );
};
