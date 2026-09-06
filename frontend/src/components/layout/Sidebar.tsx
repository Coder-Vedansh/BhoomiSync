import React from 'react';
import {
  LayoutDashboard,
  Map,
  ShieldCheck,
  FileText,
  Radio,
  Cloud,
  Trees,
  ShieldAlert,
  KeyRound,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Zap,
  Activity,
  Compass,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { isAuthenticated, user, activeRole } = useAuth();

  // User Workflow Sections (Standardized for Cadastral Surveyors & GIS Analysts)
  const navigationSections = [
    {
      section: 'WORKSPACE',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          subtitle: 'Executive Overview',
          icon: LayoutDashboard,
        },
        {
          id: 'surveys',
          label: 'Survey Workspace',
          subtitle: 'Revenue Village Haripura',
          icon: Compass,
        },
        {
          id: 'gis',
          label: 'GIS Workbench',
          subtitle: '24-Layer Spatial Canvas',
          icon: Map,
          badge: 'GIS',
        },
        {
          id: 'land-registry',
          label: 'Land Registry',
          subtitle: 'Khasra Plots & Ownership',
          icon: ShieldCheck,
        },
        {
          id: 'reports',
          label: 'Reports & Exports',
          subtitle: 'Form 1-A & KML Dossiers',
          icon: FileText,
          badge: 'EXPORT',
        },
      ],
    },
    {
      section: 'OPERATIONS',
      items: [
        {
          id: 'drone-data',
          label: 'Drone Sensor Data',
          subtitle: 'Camera Frames & ToF Stream',
          icon: Activity,
          badge: 'LIVE',
        },
        {
          id: 'ai-analysis',
          label: 'AI Analysis',
          subtitle: 'SAM ViT Bund & LULC',
          icon: Zap,
        },
      ],
    },
    {
      section: 'ADMINISTRATION',
      items: [
        {
          id: 'security-admin',
          label: 'Security & Access',
          subtitle: 'RBAC, Audit Logs & Keys',
          icon: ShieldAlert,
        },
        {
          id: 'system-settings',
          label: 'System Settings',
          subtitle: 'R2 Store & PostGIS Engine',
          icon: Settings,
        },
      ],
    },
  ];

  const handleNavClick = (id: string) => {
    if (id === 'system-settings') {
      onSelectTab('security-admin');
    } else {
      onSelectTab(id);
    }
    onCloseMobile?.();
  };

  const getActiveId = (tab: string) => {
    if (['gis', 'workbench', 'gis-workbench', 'geospatial', 'drone-mission', 'datasets'].includes(tab)) return 'gis';
    if (['surveys', 'survey-detail'].includes(tab)) return 'surveys';
    if (['drone-data', 'ingestion', 'telemetry'].includes(tab)) return 'drone-data';
    if (['ai-analysis', 'ai-modules'].includes(tab)) return 'ai-analysis';
    if (['land-registry', 'land-records', 'parcel-detail', 'comparison'].includes(tab)) return 'land-registry';
    if (['reports', 'report-detail'].includes(tab)) return 'reports';
    if (['security-admin', 'system-settings'].includes(tab)) return 'security-admin';
    return 'dashboard';
  };

  const activeId = getActiveId(currentTab);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-[#24201B]/40 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`sidebar ${mobileOpen ? 'mobile-open' : ''} ${
          isCollapsed ? 'collapsed' : ''
        } fixed top-0 bottom-0 left-0 h-screen h-[100dvh] flex flex-col justify-between z-40 bg-[#ECEAE2] border-r border-[#D8D5CC] transition-all duration-200`}
      >
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3.5 space-y-4">
          {/* Brand Logo Header: Forest + Brass */}
          <div className="flex items-center justify-between border-b border-[#D8D5CC] pb-3">
            <div
              className="flex items-center gap-2.5 cursor-pointer group"
              onClick={() => handleNavClick('dashboard')}
            >
              <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[#2E513E] border border-[#3C664D] flex items-center justify-center text-[#F5EBC5] shadow-xs flex-shrink-0 group-hover:bg-[#3C664D] transition-colors">
                <Trees size={16} />
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <h2 className="text-xs font-bold text-[#20251F] leading-none tracking-tight">BhoomiSync</h2>
                  <span className="text-[9px] font-semibold text-[#2E513E] uppercase tracking-wider block mt-0.5">
                    Cadastral Station
                  </span>
                </div>
              )}
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-md text-[#5F665D] hover:text-[#20251F] lg:hidden cursor-pointer"
              title="Close menu"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Sections */}
          <nav className="space-y-4">
            {navigationSections.map((sec) => (
              <div key={sec.section}>
                {!isCollapsed && (
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#737A70] px-2 mb-1.5">
                    {sec.section}
                  </div>
                )}
                <div className="space-y-0.5">
                  {sec.items.map((item) => {
                    const isActive = activeId === item.id;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-all text-left cursor-pointer relative ${
                          isActive
                            ? 'bg-[#DDE9E0] text-[#2E513E] font-semibold border border-[#BBD4C1] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-[#4F7D60] before:rounded-r'
                            : 'text-[#30372F] hover:text-[#20251F] hover:bg-[#EEF2EC] border border-transparent'
                        }`}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <Icon
                          size={15}
                          className={isActive ? 'text-[#3C664D] flex-shrink-0' : 'text-[#657064] flex-shrink-0'}
                        />
                        {!isCollapsed && (
                          <div className="flex-1 truncate">
                            <div className="leading-tight text-[#30372F]">{item.label}</div>
                            <div className="text-[10px] text-[#737A70] truncate mt-0.5">{item.subtitle}</div>
                          </div>
                        )}
                        {!isCollapsed && item.badge && (
                          <span className="text-[8px] font-mono font-semibold px-1 py-0.2 rounded bg-[#FAF9F5] text-[#5F665D] border border-[#D8D5CC]">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Honest Hardware Provenance Status Box */}
          {!isCollapsed && (
            <div className="p-3 bg-[#FAF9F5] rounded-[var(--radius-md)] border border-[#D8D5CC] text-xs text-[#5F665D] space-y-2 shadow-xs">
              <div className="font-semibold uppercase tracking-wider text-[#30372F] text-[10px] border-b border-[#D8D5CC] pb-1.5 flex items-center justify-between">
                <span>Hardware Sensors</span>
                <span className="inline-flex items-center gap-1 text-[9px] font-mono text-[#2E6645] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F7D60]" />
                  ACTIVE
                </span>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span className="flex items-center gap-1.5 text-[#4F574D]">
                  <Radio size={12} className="text-[#568693]" />
                  <span>Camera:</span>
                </span>
                <span className="font-mono text-[#2E6645] font-semibold text-[11px]">
                  ESP32 [LIVE]
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#4F574D]">
                  <Activity size={12} className="text-[#568693]" />
                  <span>ToF Distance:</span>
                </span>
                <span className="font-mono text-[#2E6645] font-semibold text-[11px]">
                  2.0 cm [VALID]
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#737A70]">GNSS / RTK:</span>
                <span className="font-mono text-[9px] text-[#5F665D] bg-[#EFEEE8] px-1.5 py-0.5 rounded border border-[#D8D5CC]">
                  NOT AVAILABLE
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#4F574D]">
                  <Cloud size={12} className="text-[#4F7D60]" />
                  <span>R2 Cloud:</span>
                </span>
                <span className="font-mono text-[#2E513E] font-medium text-[11px]">
                  CONNECTED
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer: User Account & Collapse Toggle */}
        <div className="p-2.5 border-t border-[#D8D5CC] space-y-1.5 bg-[#ECEAE2]">
          {/* User Account Tile */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between p-1.5 bg-[#FAF9F5] rounded-[var(--radius-sm)] border border-[#D8D5CC]">
              <div
                className="flex items-center gap-2 cursor-pointer truncate"
                onClick={() => handleNavClick('security-admin')}
              >
                <div className="w-6 h-6 rounded-md bg-[#E6EFE8] text-[#2E513E] flex items-center justify-center font-bold text-xs flex-shrink-0">
                  <User size={12} />
                </div>
                <div className="truncate text-left">
                  <div className="text-[11px] font-medium text-[#20251F] truncate leading-tight">
                    {isAuthenticated ? (user?.full_name || user?.username) : 'Chief Surveyor'}
                  </div>
                  <div className="text-[9px] font-mono text-[#2E513E] leading-tight">
                    {activeRole}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleNavClick('security-admin')}
                className="p-1 text-[#5F665D] hover:text-[#20251F] rounded hover:bg-[#EEF2EC] cursor-pointer"
                title="Security & System Settings"
              >
                <KeyRound size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleNavClick('security-admin')}
              className="w-full flex items-center justify-center p-1.5 rounded-lg text-[#5F665D] hover:text-[#20251F] hover:bg-[#EEF2EC] cursor-pointer"
              title="Security & System Settings"
            >
              <KeyRound size={15} />
            </button>
          )}

          {/* Collapse Sidebar Button */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="w-full flex items-center justify-center gap-1.5 p-1 rounded-md text-[#5F665D] hover:text-[#20251F] hover:bg-[#DDE9E0] text-[11px] font-medium transition-colors hidden lg:flex cursor-pointer"
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              {!isCollapsed && <span>Collapse</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
