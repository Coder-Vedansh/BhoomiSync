import { useState } from 'react';
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

  return (
    <AppShell currentTab={currentTab} onSelectTab={(tab) => setCurrentTab(tab)}>
      {/* 1. Primary Workspace #1: Executive Dashboard */}
      {isDashboardWorkspace && <DashboardPage onNavigate={handleNavigate} />}

      {/* 2. Primary Workspace #2: Cadastral GIS & Mission Workbench */}
      {isGisWorkspace && <CadastralGisWorkbenchPage onNavigate={handleNavigate} />}

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
