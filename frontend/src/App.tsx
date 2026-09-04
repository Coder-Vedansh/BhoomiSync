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
import { DroneTransitionProvider, useDroneTransition } from './context/DroneTransitionContext';

interface AppContentProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

function AppContent({ currentTab, setCurrentTab }: AppContentProps) {
  const [selectedReportId, setSelectedReportId] = useState<string>('REP-2026-0001');
  const { triggerDroneTransition } = useDroneTransition();

  // Intelligent signature drone transition handler for major workflows
  const handleSelectTabWithDrone = (targetTab: string, reportId?: string) => {
    if (targetTab === 'report-detail' && reportId) {
      setSelectedReportId(reportId);
    }

    // Identify major cadastral/GIS workflows that warrant the signature drone transition
    const isTransitionToGis = ['gis', 'workbench', 'gis-workbench'].includes(targetTab) && currentTab === 'dashboard';
    const isTransitionToLiveMission = targetTab === 'drone-mission' && currentTab !== 'drone-mission';
    const isTransitionFromMissionToGis = currentTab === 'drone-mission' && ['gis', 'workbench'].includes(targetTab);

    if (isTransitionToGis) {
      triggerDroneTransition({
        targetTab,
        variant: 'pipeline',
        duration: 1600,
        label: 'Drone Flight Path → Cadastral Map',
        subtitle: 'Drone data becomes geographic information',
        tofDistanceCm: '2 cm',
        tofStatus: 'VALID',
        gnssStatus: 'NOT AVAILABLE',
        khasraNumber: '105',
        surveyedArea: '1.47 ha',
      });
    } else if (isTransitionToLiveMission) {
      triggerDroneTransition({
        targetTab,
        variant: 'mission-start',
        duration: 950,
        label: 'Live Survey',
        subtitle: 'Connecting to drone...',
        isLive: true,
        hasGnss: false,
      });
    } else if (isTransitionFromMissionToGis) {
      triggerDroneTransition({
        targetTab,
        variant: 'survey-complete',
        duration: 850,
        label: 'Aerial Survey → Authoritative Cadastre',
        subtitle: 'Reconciling flight vector with PostGIS parcel boundaries',
      });
    } else {
      // Standard subtlest crossfade without drone transition (preserves speed on standard clicks)
      setCurrentTab(targetTab);
    }
  };

  const handleNavigate = (tab: string, id?: string) => {
    handleSelectTabWithDrone(tab, id);
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
    <AppShell currentTab={currentTab} onSelectTab={handleSelectTabWithDrone}>
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

function MainApp() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  return (
    <DroneTransitionProvider onNavigateTab={setCurrentTab}>
      <AppContent currentTab={currentTab} setCurrentTab={setCurrentTab} />
    </DroneTransitionProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
