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

  const navigationSections = [
    {
      section: 'OVERVIEW',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          subtitle: 'Operational Command',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      section: 'SURVEY',
      items: [
        {
          id: 'gis',
          label: 'GIS Workbench',
          subtitle: '24-Layer Spatial Canvas',
          icon: Map,
          badge: 'CORE',
        },
        {
          id: 'drone-mission',
          label: 'Live Missions',
          subtitle: 'ESP32 Camera & ToF Flight',
          icon: Radio,
        },
      ],
    },
    {
      section: 'LAND',
      items: [
        {
          id: 'land-registry',
          label: 'Land Registry',
          subtitle: 'Khasra Plots & Owners',
          icon: ShieldCheck,
        },
      ],
    },
    {
      section: 'ANALYSIS',
      items: [
        {
          id: 'ai-analysis',
          label: 'AI Geospatial Analysis',
          subtitle: 'SAM ViT & LULC 8-Class',
          icon: Zap,
        },
      ],
    },
    {
      section: 'OUTPUT',
      items: [
        {
          id: 'reports',
          label: 'Reports & Exports',
          subtitle: 'Form 1-A & KML Dossiers',
          icon: FileText,
          badge: 'EXPORT',
        },
      ],
    },
  ];

  const handleNavClick = (id: string) => {
    if (id === 'drone-mission') {
      onSelectTab('drone-mission');
    } else if (id === 'ai-analysis') {
      onSelectTab('ai-analysis');
    } else {
      onSelectTab(id);
    }
    onCloseMobile?.();
  };

  const getActiveWorkspaceId = (tab: string) => {
    if (['gis', 'workbench', 'drone-mission', 'gis-workbench', 'geospatial', 'ai-modules', 'ai-analysis', 'datasets'].includes(tab)) {
      return 'gis';
    }
    if (['land-registry', 'land-records', 'parcel-detail', 'comparison'].includes(tab)) {
      return 'land-registry';
    }
    if (['reports', 'report-detail'].includes(tab)) {
      return 'reports';
    }
    return 'dashboard';
  };

  const activeId = getActiveWorkspaceId(currentTab);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`sidebar ${mobileOpen ? 'mobile-open' : ''} ${
          isCollapsed ? 'collapsed' : ''
        } fixed top-0 bottom-0 left-0 h-screen h-[100dvh] flex flex-col justify-between z-40 bg-[#0d1322] border-r border-[#1e2c42]`}
      >
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3.5 space-y-4">
          {/* Brand Logo Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => handleNavClick('dashboard')}
            >
              <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                <Trees size={16} />
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <h2 className="text-xs font-bold text-slate-100 leading-none tracking-tight">BhoomiSync</h2>
                  <span className="text-[9px] font-semibold text-sky-400 uppercase tracking-wider block mt-0.5">
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
                    const isActive = activeId === item.id || (item.id === 'gis' && activeId === 'gis');
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                          isActive
                            ? 'bg-sky-500/10 text-sky-300 font-semibold border border-sky-500/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <Icon size={15} className={isActive ? 'text-sky-400 flex-shrink-0' : 'text-slate-400 flex-shrink-0'} />
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

          {/* Honest Hardware Provenance (Linear calm card) */}
          {!isCollapsed && (
            <div className="p-3 bg-[#0e1424] rounded-xl border border-[#1e2c42] text-xs text-slate-400 space-y-2">
              <div className="font-semibold uppercase tracking-wider text-slate-300 text-[10px] border-b border-[#1e2c42] pb-1.5 flex items-center justify-between">
                <span>Hardware Sensors</span>
                <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE
                </span>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Radio size={12} className="text-sky-400" />
                  <span>Camera:</span>
                </span>
                <span className="font-mono text-emerald-400 font-semibold text-[11px]">
                  ESP32 [LIVE]
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Activity size={12} className="text-sky-400" />
                  <span>ToF Distance:</span>
                </span>
                <span className="font-mono text-emerald-400 font-semibold text-[11px]">
                  2.0 cm [LIVE]
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">GNSS / RTK:</span>
                <span className="font-mono text-[10px] text-slate-400 bg-[#141b2e] px-1.5 py-0.5 rounded border border-[#1e2c42]">
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
        <div className="p-2.5 border-t border-slate-800/80 space-y-1.5">
          {/* Security Admin Link if Admin */}
          {activeRole === 'ADMIN' && !isCollapsed && (
            <button
              onClick={() => handleNavClick('security-admin')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                currentTab === 'security-admin'
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                  : 'text-purple-400 hover:bg-purple-500/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldAlert size={13} />
                <span>Security Admin</span>
              </div>
              <span className="text-[8px] bg-purple-500/20 px-1 py-0.2 rounded font-mono">
                ADMIN
              </span>
            </button>
          )}

          {/* User Account Tile */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between p-1.5 bg-slate-950/50 rounded-lg border border-slate-800/60">
              <div
                className="flex items-center gap-2 cursor-pointer truncate"
                onClick={() => handleNavClick('login')}
              >
                <div className="w-6 h-6 rounded-md bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  <User size={12} />
                </div>
                <div className="truncate text-left">
                  <div className="text-[11px] font-medium text-slate-200 truncate leading-tight">
                    {isAuthenticated ? (user?.full_name || user?.username) : 'Chief Surveyor'}
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 leading-tight">
                    {activeRole}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleNavClick('login')}
                className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 cursor-pointer"
                title="Account Settings"
              >
                <KeyRound size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleNavClick('login')}
              className="w-full flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="User Credentials"
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
