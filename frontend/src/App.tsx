import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider } from './auth/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { CadastralGisWorkbenchPage } from './pages/CadastralGisWorkbenchPage';
import { UnifiedLandRegistryPage } from './pages/UnifiedLandRegistryPage';
import { ReportsPage } from './pages/ReportsPage';
import { ReportDetailPage } from './pages/ReportDetailPage';
import { LoginPage } from './pages/LoginPage';
import { SecurityAdminPage } from './pages/SecurityAdminPage';

function AppContent() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedReportId, setSelectedReportId] = useState<string>('REP-2026-0001');

  const handleNavigate = (tab: string, id?: string) => {
    if (tab === 'report-detail' && id) {
      setSelectedReportId(id);
    }
    setCurrentTab(tab);
  };

  // Helper to determine active workspace
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

  const isLandRegistryWorkspace = [
    'land-registry',
    'land-records',
    'parcel-detail',
    'comparison',
  ].includes(currentTab);

  const isReportsWorkspace = currentTab === 'reports';
  const isReportDetailWorkspace = currentTab === 'report-detail';
  const isDashboardWorkspace = currentTab === 'dashboard' || currentTab === '/' || currentTab === '';

  const activeWorkspaceKey = isDashboardWorkspace
    ? 'dashboard'
    : isGisWorkspace
    ? 'gis'
    : isLandRegistryWorkspace
    ? 'land-registry'
    : isReportDetailWorkspace
    ? `report-detail-${selectedReportId}`
    : isReportsWorkspace
    ? 'reports'
    : currentTab;

  return (
    <AppShell currentTab={currentTab} onSelectTab={(tab) => setCurrentTab(tab)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeWorkspaceKey}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0.96, y: -2 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full h-full flex flex-col flex-1 min-h-0"
        >
          {/* 1. Primary Workspace #1: Executive Dashboard */}
          {isDashboardWorkspace && <DashboardPage onNavigate={handleNavigate} />}

          {/* 2. Primary Workspace #2: Cadastral GIS & Mission Workbench */}
          {isGisWorkspace && (
            <CadastralGisWorkbenchPage
              onNavigate={handleNavigate}
              defaultTab={
                currentTab === 'ai-analysis'
                  ? 'ai'
                  : currentTab === 'drone-mission'
                  ? 'mission'
                  : 'layers'
              }
            />
          )}

          {/* 3. Primary Workspace #3: Authoritative Land Registry */}
          {isLandRegistryWorkspace && <UnifiedLandRegistryPage onNavigate={handleNavigate} />}

          {/* 4. Primary Workspace #4: Reports & Document Exports */}
          {isReportsWorkspace && <ReportsPage onNavigate={handleNavigate} />}
          {isReportDetailWorkspace && (
            <ReportDetailPage
              reportId={selectedReportId}
              onBack={() => setCurrentTab('reports')}
            />
          )}

          {/* Utility Views: Auth & Security Admin */}
          {currentTab === 'login' && <LoginPage onLoginSuccess={() => setCurrentTab('dashboard')} />}
          {currentTab === 'security-admin' && <SecurityAdminPage />}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
