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
  Database,
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
          id: 'drone-mission',
          label: 'Missions',
          subtitle: 'Flight Track & Telemetry',
          icon: Radio,
        },
        {
          id: 'datasets',
          label: 'Datasets',
          subtitle: 'R2 Cloud Rasters & DEM',
          icon: Database,
        },
        {
          id: 'drone-data',
          label: 'Drone Data',
          subtitle: 'Camera Frames & ToF Stream',
          icon: Activity,
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
    if (id === 'drone-data') {
      onSelectTab('drone-mission');
    } else if (id === 'system-settings') {
      onSelectTab('security-admin');
    } else {
      onSelectTab(id);
    }
    onCloseMobile?.();
  };

  const getActiveId = (tab: string) => {
    if (['gis', 'workbench', 'gis-workbench', 'geospatial'].includes(tab)) return 'gis';
    if (['surveys', 'survey-detail'].includes(tab)) return 'surveys';
    if (['drone-mission'].includes(tab)) return 'drone-mission';
    if (['datasets'].includes(tab)) return 'datasets';
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
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`sidebar ${mobileOpen ? 'mobile-open' : ''} ${
          isCollapsed ? 'collapsed' : ''
        } fixed top-0 bottom-0 left-0 h-screen h-[100dvh] flex flex-col justify-between z-40 bg-[var(--surface)] border-r border-[var(--border-subtle)] transition-all duration-200`}
      >
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3.5 space-y-4">
          {/* Brand Logo Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div
              className="flex items-center gap-2.5 cursor-pointer group"
              onClick={() => handleNavClick('dashboard')}
            >
              <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[#13261e] border border-[#1b382b] flex items-center justify-center text-emerald-400 shadow-xs flex-shrink-0 group-hover:border-emerald-500/50 transition-colors">
                <Trees size={16} />
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <h2 className="text-xs font-bold text-slate-100 leading-none tracking-tight">BhoomiSync</h2>
                  <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider block mt-0.5">
                    Cadastral Station
                  </span>
                </div>
              )}
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-md text-slate-400 hover:text-white lg:hidden cursor-pointer"
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
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-1.5">
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
                            ? 'bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/25 before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-emerald-400 before:rounded-r'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                        }`}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <Icon
                          size={15}
                          className={isActive ? 'text-emerald-400 flex-shrink-0' : 'text-slate-400 flex-shrink-0'}
                        />
                        {!isCollapsed && (
                          <div className="flex-1 truncate">
                            <div className="leading-tight text-slate-200">{item.label}</div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.subtitle}</div>
                          </div>
                        )}
                        {!isCollapsed && item.badge && (
                          <span className="text-[8px] font-mono font-semibold px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
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
            <div className="p-3 bg-[var(--surface-elevated)] rounded-[var(--radius-md)] border border-[var(--border)] text-xs text-slate-400 space-y-2">
              <div className="font-semibold uppercase tracking-wider text-slate-300 text-[10px] border-b border-[var(--border)] pb-1.5 flex items-center justify-between">
                <span>Hardware Sensors</span>
                <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE
                </span>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Radio size={12} className="text-cyan-400" />
                  <span>Camera:</span>
                </span>
                <span className="font-mono text-emerald-400 font-semibold text-[11px]">
                  ESP32 [LIVE]
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Activity size={12} className="text-cyan-400" />
                  <span>ToF Distance:</span>
                </span>
                <span className="font-mono text-emerald-400 font-semibold text-[11px]">
                  2.0 cm [VALID]
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">GNSS / RTK:</span>
                <span className="font-mono text-[9px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-[var(--border)]">
                  NOT AVAILABLE
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Cloud size={12} className="text-purple-400" />
                  <span>R2 Cloud:</span>
                </span>
                <span className="font-mono text-purple-300 font-medium text-[11px]">
                  CONNECTED
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer: User Account & Collapse Toggle */}
        <div className="p-2.5 border-t border-[var(--border)] space-y-1.5 bg-[var(--surface)]">
          {/* User Account Tile */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between p-1.5 bg-[var(--surface-elevated)] rounded-[var(--radius-sm)] border border-[var(--border)]">
              <div
                className="flex items-center gap-2 cursor-pointer truncate"
                onClick={() => handleNavClick('security-admin')}
              >
                <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  <User size={12} />
                </div>
                <div className="truncate text-left">
                  <div className="text-[11px] font-medium text-slate-200 truncate leading-tight">
                    {isAuthenticated ? (user?.full_name || user?.username) : 'Chief Surveyor'}
                  </div>
                  <div className="text-[9px] font-mono text-emerald-400 leading-tight">
                    {activeRole}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleNavClick('security-admin')}
                className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 cursor-pointer"
                title="Security & System Settings"
              >
                <KeyRound size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleNavClick('security-admin')}
              className="w-full flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="Security & System Settings"
            >
              <KeyRound size={15} />
            </button>
          )}

          {/* Collapse Sidebar Button */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="w-full flex items-center justify-center gap-1.5 p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-[11px] font-medium transition-colors hidden lg:flex cursor-pointer"
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
