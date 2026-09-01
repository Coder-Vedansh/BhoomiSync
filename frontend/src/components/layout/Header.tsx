import React, { useEffect, useState } from 'react';
import {
  Radio,
  Database,
  Cloud,
  RefreshCw,
  User,
  ChevronDown,
  Menu,
  CheckCircle2,
  Trees,
} from 'lucide-react';
import { api } from '../../services/api';
import { SystemHealth } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { UserRole } from '../../auth/authTypes';

interface HeaderProps {
  currentTab: string;
  onNavigate?: (tab: string) => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  onToggleMobileMenu,
}) => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const { user, isAuthenticated, activeRole, switchRoleDev } = useAuth();

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const data = await api.getHealth();
      setHealth(data);
    } catch (e) {
      console.error('Health fetch failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const roles: { role: UserRole; label: string; desc: string }[] = [
    { role: 'ADMIN', label: 'Admin (Full Control)', desc: 'Manage users, audit logs, system configurations' },
    { role: 'SURVEYOR', label: 'Cadastral Surveyor', desc: 'Verify boundaries, import drone data' },
    { role: 'GOVERNMENT_OFFICIAL', label: 'Tehsildar / Official', desc: 'Approve reports, import land records' },
    { role: 'PUBLIC', label: 'Citizen (Public View)', desc: 'View privacy-masked public parcel registry' },
  ];

  const pageTitleMap: Record<string, string> = {
    dashboard: 'Dashboard',
    'drone-mission': 'Live Drone Mission',
    surveys: 'Surveys & Missions',
    'survey-detail': 'Survey Mission Dossier',
    'land-records': 'Authoritative Land Registry',
    'parcel-detail': 'Cadastral Parcel Inspector',
    'gis-workbench': 'GIS Map Workbench',
    geospatial: 'Geospatial Fusion',
    'ai-modules': 'AI Intelligence',
    reports: 'Reports & Exports',
    'report-detail': 'Survey Dossier Detail',
    ingestion: 'Drone Ingestion',
    datasets: 'Raw Sensor Datasets',
    comparison: 'Historical Cadastre',
    'system-status': 'System Infrastructure',
    'security-admin': 'Security & RBAC Admin',
    login: 'Auth Profile',
  };

  const currentTitle = pageTitleMap[currentTab] || currentTab.replace('-', ' ');

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8 py-2.5 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-sm">
      {/* Left: Mobile Hamburger & Clean Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-lg text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 lg:hidden flex items-center justify-center"
          title="Toggle Navigation Menu"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-2 text-xs">
          <div className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Trees size={13} />
          </div>
          <span className="text-slate-400 font-semibold hidden sm:inline">BhoomiSync</span>
          <span className="text-slate-600 hidden sm:inline">/</span>
          <span className="text-emerald-400 font-bold tracking-tight text-sm capitalize">
            {currentTitle}
          </span>
        </div>
      </div>

      {/* Center: System Health Badges (ESP32/5G, R2 Storage, PostGIS) */}
      <div className="hidden lg:flex items-center gap-2.5">
        {/* Gateway */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
          <Radio size={13} className="text-emerald-400" />
          <span className="text-slate-400 text-[11px]">Gateway:</span>
          <span className="font-semibold text-slate-200 font-mono text-[11px]">
            {health?.gateway_type === 'ESP32_PHONE' ? 'ESP32 / 5G' : 'Companion'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        {/* Storage */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
          <Cloud size={13} className="text-cyan-400" />
          <span className="text-slate-400 text-[11px]">Storage:</span>
          <span className="font-semibold text-slate-200 font-mono text-[11px]">Cloudflare R2</span>
        </div>

        {/* Database */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
          <Database size={13} className="text-amber-400" />
          <span className="text-slate-400 text-[11px]">Spatial DB:</span>
          <span className="font-semibold text-slate-200 font-mono text-[11px]">PostGIS</span>
        </div>

        {/* Refresh */}
        <button
          onClick={fetchHealth}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Refresh System Health"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Right: Active Role & User Profile Switcher */}
      <div className="relative">
        <button
          onClick={() => setShowRoleMenu(!showRoleMenu)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-slate-600 transition-all text-xs font-semibold text-white shadow-sm"
        >
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold">
            <User size={12} />
          </div>
          <div className="text-left">
            <div className="text-[11px] text-slate-300 font-medium leading-none">
              {isAuthenticated ? (user?.full_name || user?.username) : 'Active Role'}
            </div>
            <div
              className={`text-[10px] font-mono font-bold leading-tight mt-0.5 ${
                activeRole === 'ADMIN'
                  ? 'text-purple-400'
                  : activeRole === 'SURVEYOR'
                  ? 'text-cyan-400'
                  : activeRole === 'GOVERNMENT_OFFICIAL'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {activeRole}
            </div>
          </div>
          <ChevronDown size={14} className="text-slate-400 ml-1" />
        </button>

        {/* Dropdown Menu */}
        {showRoleMenu && (
          <div
            className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-fade-in"
            onClick={() => setShowRoleMenu(false)}
          >
            <div className="px-3 py-2 border-b border-slate-800 text-xs">
              <div className="font-bold text-white">Role-Based Access Control</div>
              <div className="text-[11px] text-slate-400">Select active permission context:</div>
            </div>

            <div className="py-1 flex flex-col gap-1">
              {roles.map((r) => {
                const isSelected = activeRole === r.role;
                return (
                  <button
                    key={r.role}
                    onClick={() => {
                      switchRoleDev(r.role);
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-start justify-between ${
                      isSelected
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-white'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{r.label}</span>
                        {isSelected && <CheckCircle2 size={12} className="text-emerald-400" />}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                        {r.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {onNavigate && (
              <div className="pt-2 border-t border-slate-800 mt-1">
                <button
                  onClick={() => {
                    onNavigate('login');
                    setShowRoleMenu(false);
                  }}
                  className="w-full text-center py-1.5 text-xs text-emerald-400 font-semibold hover:underline"
                >
                  Manage Authentication Credentials &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
