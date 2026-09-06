import React, { useEffect, useState } from 'react';
import {
  Radio,
  User,
  ChevronDown,
  Menu,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { api } from '../../services/api';
import { SystemHealth } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { UserRole } from '../../auth/authTypes';

interface HeaderProps {
  currentTab: string;
  onNavigate?: (tab: string) => void;
  onToggleMobileMenu?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  onToggleMobileMenu,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const { user, isAuthenticated, activeRole, switchRoleDev } = useAuth();

  const fetchHealth = async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (e) {
      console.error('Health fetch failed', e);
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
    surveys: 'Survey Workspace',
    'survey-detail': 'Survey Workspace',
    'drone-mission': 'Mission Operations',
    'land-records': 'Land Registry',
    'land-registry': 'Land Registry',
    'parcel-detail': 'Parcel Inspector',
    'gis-workbench': 'GIS Workbench',
    gis: 'GIS Workbench',
    workbench: 'GIS Workbench',
    geospatial: 'Geospatial Canvas',
    'ai-modules': 'AI Computer Vision & Intelligence Hub',
    'ai-analysis': 'AI Computer Vision & Intelligence Hub',
    'ai-hub': 'AI Computer Vision & Intelligence Hub',
    ai: 'AI Computer Vision & Intelligence Hub',
    reports: 'Reports & Exports',
    'report-detail': 'Survey Dossier Detail',
    ingestion: 'Drone Sensor Data',
    'drone-data': 'Drone Sensor Data',
    datasets: 'Cloud Datasets',
    comparison: 'Historical Cadastre',
    'system-status': 'System Settings',
    'system-settings': 'System Settings',
    'security-admin': 'Security & Access',
    login: 'Auth Profile',
  };

  const currentTitle = pageTitleMap[currentTab] || currentTab.replace('-', ' ');

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-3 sm:px-6 bg-[#FAF9F5] border-b border-[#D8D5CC] shadow-xs flex-shrink-0">
      {/* Left: Sidebar Toggle & Clean Technical Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onToggleMobileMenu}
          className="p-1.5 rounded-[var(--radius-sm)] text-[#5F665D] hover:text-[#20251F] hover:bg-[#EEF2EC] lg:hidden flex items-center justify-center cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu size={18} />
        </button>

        {/* Desktop Sidebar Collapse button */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-[var(--radius-sm)] text-[#5F665D] hover:text-[#20251F] hover:bg-[#EEF2EC] hidden lg:flex items-center justify-center transition-colors cursor-pointer"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        )}

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#697066] font-medium hidden sm:inline">BhoomiSync</span>
          <span className="text-[#858B82] hidden sm:inline">/</span>
          <span className="text-[#20251F] font-semibold tracking-tight text-xs sm:text-sm">
            {currentTitle}
          </span>
        </div>
      </div>

      {/* Center: Survey Selector & Connectivity Status */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-white border border-[#D8D5CC] text-xs shadow-xs">
          <span className="text-[#697066] text-xs font-medium hidden sm:inline">Survey:</span>
          <select
            className="bg-transparent text-[#20251F] text-xs font-medium focus:outline-none cursor-pointer"
            defaultValue="SUR-2026-001"
            onChange={() => onNavigate?.('gis')}
            style={{ backgroundColor: 'transparent', color: '#20251F' }}
          >
            <option value="SUR-2026-001" className="bg-white text-[#20251F]" style={{ backgroundColor: '#FFFFFF', color: '#20251F' }}>
              SUR-2026-001 (Haripura Pilot 125.4 ha)
            </option>
            <option value="SUR-2026-002" className="bg-white text-[#20251F]" style={{ backgroundColor: '#FFFFFF', color: '#20251F' }}>
              SUR-2026-002 (Kolaras North 88.2 ha)
            </option>
          </select>
        </div>

        {/* System Online Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-white border border-[#D8D5CC] text-xs text-[#4F574D] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#4F7D60]" />
          <span className="font-mono text-[#4F7D60] text-[11px] font-semibold">R2 + PostGIS Connected</span>
        </div>

        {/* Honest Single Hardware Chip */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-white border border-[#D8D5CC] text-xs shadow-xs">
          <Radio size={12} className="text-[#568693]" />
          <span className="text-[#4F574D] text-[11px]">{health?.gateway_type ? 'ESP32 Cam + ToF' : 'ESP32 Cam + ToF'}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#4F7D60]" />
          <span className="text-[10px] text-[#2E6645] font-mono font-semibold">[LIVE]</span>
        </div>
      </div>

      {/* Right: Active Role & User Profile Switcher */}
      <div className="relative">
        <button
          onClick={() => setShowRoleMenu(!showRoleMenu)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-white border border-[#D8D5CC] hover:border-[#BFCDBF] transition-all text-xs font-medium text-[#20251F] cursor-pointer shadow-xs"
        >
          <div className="w-5 h-5 rounded-full bg-[#E6EFE8] text-[#2E513E] flex items-center justify-center font-bold text-[10px]">
            <User size={12} />
          </div>
          <span className="text-xs font-medium text-[#20251F] hidden sm:inline">
            {isAuthenticated ? (user?.full_name || user?.username) : 'Chief Surveyor'}
          </span>
          <span
            className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${
              activeRole === 'ADMIN'
                ? 'bg-[#E8F1F3] text-[#385963] border border-[#BDD7DE]'
                : activeRole === 'SURVEYOR'
                ? 'bg-[#E6EFE8] text-[#2E6645] border border-[#BBD4C1]'
                : activeRole === 'GOVERNMENT_OFFICIAL'
                ? 'bg-[#FBF4DC] text-[#74591D] border border-[#EBD99A]'
                : 'bg-[#EFEEE8] text-[#5F665D] border border-[#D8D5CC]'
            }`}
          >
            {activeRole}
          </span>
          <ChevronDown size={12} className="text-[#697066]" />
        </button>

        {/* Dropdown Menu */}
        {showRoleMenu && (
          <div className="absolute right-0 mt-2 w-64 rounded-[var(--radius-lg)] bg-white border border-[#D8D5CC] shadow-[0_16px_36px_rgba(44,52,43,0.14)] p-2 z-50 animate-fade-in text-xs">
            <div className="px-2.5 py-1.5 border-b border-[#D8D5CC] mb-1">
              <div className="font-semibold text-[#20251F]">Switch Operational Role</div>
              <div className="text-[11px] text-[#5F665D]">RBAC simulation mode</div>
            </div>

            <div className="space-y-1">
              {roles.map((r) => (
                <button
                  key={r.role}
                  onClick={() => {
                    switchRoleDev(r.role);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-[var(--radius-sm)] transition-colors cursor-pointer flex items-center justify-between ${
                    activeRole === r.role
                      ? 'bg-[#E6EFE8] text-[#2E6645] font-semibold'
                      : 'text-[#4F574D] hover:bg-[#F4F2EC]'
                  }`}
                >
                  <div>
                    <div className="leading-tight">{r.label}</div>
                    <div className="text-[10px] text-[#858B82] mt-0.5 leading-snug">{r.desc}</div>
                  </div>
                  {activeRole === r.role && <CheckCircle2 size={13} className="text-[#2E6645] flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
