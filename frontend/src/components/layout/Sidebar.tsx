import React from 'react';
import {
  LayoutDashboard,
  Map,
  ShieldCheck,
  FileText,
  Radio,
  Cloud,
  Crosshair,
  Trees,
  ShieldAlert,
  KeyRound,
  X,
  ChevronLeft,
  ChevronRight,
  User,
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

  // 4 Primary Operational Workspaces ONLY
  const primaryWorkspaces = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      subtitle: 'Executive Survey Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'gis',
      label: 'GIS Workbench',
      subtitle: '24-Layer Map & Drone Stream',
      icon: Map,
      badge: 'CORE',
    },
    {
      id: 'land-registry',
      label: 'Land Registry',
      subtitle: 'Khasra Search & Comparison',
      icon: ShieldCheck,
    },
    {
      id: 'reports',
      label: 'Reports & Exports',
      subtitle: 'Multi-Format Dossiers',
      icon: FileText,
      badge: '5-FMT',
    },
  ];

  const handleNavClick = (id: string) => {
    onSelectTab(id);
    onCloseMobile?.();
  };

  // Map legacy route IDs to primary workspace IDs for active highlight
  const getActiveWorkspaceId = (tab: string) => {
    if (['gis', 'drone-mission', 'gis-workbench', 'geospatial', 'ai-modules', 'datasets'].includes(tab)) {
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
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`sidebar ${mobileOpen ? 'mobile-open' : ''} ${
          isCollapsed ? 'w-[76px]' : 'w-[260px]'
        } flex flex-col justify-between z-50 bg-slate-900 border-r border-slate-800`}
        style={{ width: isCollapsed ? 76 : 260 }}
      >
        <div>
          {/* Brand Logo Header */}
          <div className="brand-logo justify-between border-b border-slate-800 pb-3 mb-3">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => handleNavClick('dashboard')}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 flex-shrink-0">
                <Trees size={20} />
              </div>
              {!isCollapsed && (
                <div className="brand-text">
                  <h2 className="text-base font-extrabold text-white leading-none">BhoomiSync</h2>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mt-0.5">
                    Cadastral Workstation
                  </span>
                </div>
              )}
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 lg:hidden"
              title="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Section: 4 Primary Operational Workspaces */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-2">
            {!isCollapsed ? 'Operational Workspaces' : 'Menu'}
          </div>

          <nav className="flex flex-col gap-1.5 mb-4">
            {primaryWorkspaces.map((item) => {
              const Icon = item.icon;
              const isActive = activeId === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center transition-all duration-150 rounded-xl font-medium text-xs text-left cursor-pointer border ${
                    isCollapsed ? 'justify-center p-2.5 my-0.5' : 'justify-between px-3 py-2.5 my-0.5'
                  } ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm font-semibold'
                      : 'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      size={18}
                      className={`flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}
                    />
                    {!isCollapsed && (
                      <div className="truncate">
                        <div className="truncate font-semibold">{item.label}</div>
                        <div className="text-[10px] text-slate-500 font-normal truncate">
                          {item.subtitle}
                        </div>
                      </div>
                    )}
                  </div>

                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                        isActive
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Live System Telemetry Status Block */}
          {!isCollapsed && (
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-2 mb-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800/80 pb-1 flex items-center justify-between">
                <span>Hardware &amp; Cloud</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Radio size={12} className="text-emerald-400" />
                  <span>Mission:</span>
                </span>
                <span className="font-mono text-[10px] text-emerald-300 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  LIVE 5G
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Crosshair size={12} className="text-cyan-400" />
                  <span>RTK Fix:</span>
                </span>
                <span className="font-mono text-[10px] text-cyan-300 font-semibold">
                  FIXED (1.4 cm)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Cloud size={12} className="text-amber-400" />
                  <span>Storage:</span>
                </span>
                <span className="font-mono text-[10px] text-amber-300 font-semibold">
                  R2 CONNECTED
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Area: User Profile, Security & Role Switcher */}
        <div className="pt-2 border-t border-slate-800 space-y-1">
          {/* Admin Security Switcher (If Admin) */}
          {activeRole === 'ADMIN' && !isCollapsed && (
            <button
              onClick={() => handleNavClick('security-admin')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                currentTab === 'security-admin'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-purple-400 hover:bg-purple-500/10 border border-purple-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldAlert size={14} />
                <span>Security &amp; RBAC Admin</span>
              </div>
              <span className="text-[9px] bg-purple-500/30 px-1.5 py-0.2 rounded font-mono">
                ADMIN
              </span>
            </button>
          )}

          {/* User Account / Login Portal Button */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between p-2 bg-slate-950/60 rounded-xl border border-slate-800">
              <div
                className="flex items-center gap-2 cursor-pointer truncate"
                onClick={() => handleNavClick('login')}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold text-xs flex-shrink-0">
                  <User size={13} />
                </div>
                <div className="truncate text-left">
                  <div className="text-xs font-semibold text-white truncate leading-tight">
                    {isAuthenticated ? (user?.full_name || user?.username) : 'Guest User'}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400 font-bold leading-tight">
                    {activeRole}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleNavClick('login')}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                title="Account Credentials &amp; Role Switcher"
              >
                <KeyRound size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleNavClick('login')}
              className="w-full flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              title="User Credentials"
            >
              <KeyRound size={16} />
            </button>
          )}

          {/* Collapse Sidebar Toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="w-full flex items-center justify-center gap-2 p-1.5 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 text-xs font-semibold transition-colors hidden lg:flex"
            >
              {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
              {!isCollapsed && <span>Collapse Sidebar</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
