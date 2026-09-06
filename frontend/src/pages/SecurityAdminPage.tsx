import React, { useState, useEffect, useCallback } from "react";
import { authApi } from "../auth/authApi";

import { UserProfile, UserSessionInfo, SecurityAuditLogItem, SecurityStats } from "../auth/authTypes";
import {
  Shield,
  Users,
  Key,
  Activity,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  AlertOctagon,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export const SecurityAdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"users" | "sessions" | "audit" | "matrix">("users");
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // User management state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [roleToAssign, setRoleToAssign] = useState<string>("SURVEYOR");

  // Sessions state
  const [sessions, setSessions] = useState<UserSessionInfo[]>([]);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLogItem[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Toast / notification
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Load Stats
      const s = await authApi.getSecurityStats();
      setStats(s);

      // 2. Load Users
      const uRes = await authApi.getUsers({
        role: roleFilter || undefined,
        is_active: statusFilter ? statusFilter === "active" : undefined,
        search_query: userSearch || undefined,
      });
      setUsers(uRes.users);

      // 3. Load Sessions
      const sessRes = await authApi.getSessions();
      setSessions(sessRes.sessions);

      // 4. Load Audit Logs
      const auditRes = await authApi.getAuditLogs({
        action: auditActionFilter || undefined,
        limit: 100,
      });
      setAuditLogs(auditRes.logs);
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to load security administration data", "error");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, userSearch, auditActionFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const handleToggleUserStatus = async (user: UserProfile) => {
    try {
      const updated = await authApi.updateUserStatus(user.user_id, {
        is_active: !user.is_active,
      });
      setUsers((prev) => prev.map((u) => (u.user_id === user.user_id ? updated : u)));
      showToast(`User ${user.username} is now ${updated.is_active ? "Active" : "Deactivated"}`);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Action failed", "error");
    }
  };

  const handleUnlockUser = async (user: UserProfile) => {
    try {
      const updated = await authApi.updateUserStatus(user.user_id, {
        unlock_account: true,
      });
      setUsers((prev) => prev.map((u) => (u.user_id === user.user_id ? updated : u)));
      showToast(`Account ${user.username} unlocked successfully!`);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Action failed", "error");
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser) return;
    try {
      const updated = await authApi.assignRole(selectedUser.user_id, roleToAssign);
      setUsers((prev) => prev.map((u) => (u.user_id === selectedUser.user_id ? updated : u)));
      setSelectedUser(updated);
      showToast(`Role ${roleToAssign} assigned to ${selectedUser.username}`);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to assign role", "error");
    }
  };

  const handleRemoveRole = async (roleName: string) => {
    if (!selectedUser) return;
    try {
      const updated = await authApi.removeRole(selectedUser.user_id, roleName);
      setUsers((prev) => prev.map((u) => (u.user_id === selectedUser.user_id ? updated : u)));
      setSelectedUser(updated);
      showToast(`Role ${roleName} removed from ${selectedUser.username}`);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to remove role", "error");
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await authApi.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      showToast(`Session ${sessionId} terminated.`);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to revoke session", "error");
    }
  };

  const permissionMatrix: Record<string, Record<string, boolean>> = {
    "survey.read": { PUBLIC: true, SURVEYOR: true, GOVERNMENT_OFFICIAL: true, ADMIN: true },
    "survey.create": { PUBLIC: false, SURVEYOR: true, GOVERNMENT_OFFICIAL: true, ADMIN: true },
    "dataset.read": { PUBLIC: true, SURVEYOR: true, GOVERNMENT_OFFICIAL: true, ADMIN: true },
    "dataset.upload": { PUBLIC: false, SURVEYOR: true, GOVERNMENT_OFFICIAL: false, ADMIN: true },
    "parcel.read.public": { PUBLIC: true, SURVEYOR: true, GOVERNMENT_OFFICIAL: true, ADMIN: true },
    "parcel.read.private": { PUBLIC: false, SURVEYOR: true, GOVERNMENT_OFFICIAL: true, ADMIN: true },
    "parcel.verify": { PUBLIC: false, SURVEYOR: true, GOVERNMENT_OFFICIAL: false, ADMIN: true },
    "land_record.import": { PUBLIC: false, SURVEYOR: false, GOVERNMENT_OFFICIAL: true, ADMIN: true },
    "land_record.title_update": { PUBLIC: false, SURVEYOR: false, GOVERNMENT_OFFICIAL: true, ADMIN: true },
    "ai.infer": { PUBLIC: false, SURVEYOR: true, GOVERNMENT_OFFICIAL: false, ADMIN: true },
    "ai.verify": { PUBLIC: false, SURVEYOR: true, GOVERNMENT_OFFICIAL: false, ADMIN: true },
    "gis.layers": { PUBLIC: true, SURVEYOR: true, GOVERNMENT_OFFICIAL: true, ADMIN: true },
    "user.read": { PUBLIC: false, SURVEYOR: false, GOVERNMENT_OFFICIAL: true, ADMIN: true },
    "user.update": { PUBLIC: false, SURVEYOR: false, GOVERNMENT_OFFICIAL: false, ADMIN: true },
    "audit.read": { PUBLIC: false, SURVEYOR: false, GOVERNMENT_OFFICIAL: true, ADMIN: true },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn text-[#20251F]">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl border shadow-xl z-50 text-sm font-medium flex items-center gap-2 backdrop-blur-md ${
            notification.type === "success"
              ? "bg-[#E8F0EA] border-[#BFCDBF] text-[#2E513E]"
              : "bg-[#F7ECE8] border-[#E4BFB4] text-[#914B38]"
          }`}
        >
          {notification.type === "success" ? <CheckCircle size={18} /> : <AlertOctagon size={18} />}
          {notification.message}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-[#D8D5CC] shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F0EA] border border-[#BFCDBF] text-[#2E513E] text-xs font-semibold uppercase tracking-wider">
            <Shield size={14} /> Security & Identity Administration
          </div>
          <h1 className="text-2xl font-bold text-[#20251F] tracking-tight">
            Role-Based Access Control & Security Auditing
          </h1>
          <p className="text-sm text-[#5F665D]">
            Manage system identities, monitor active token sessions, review cryptographic audit trails, and enforce least-privilege policies.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-center px-4 py-2 rounded-xl bg-[#FAF9F5] hover:bg-[#EFEEE8] border border-[#D8D5CC] text-sm font-semibold text-[#30372F] flex items-center gap-2 transition"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-[#2E513E]" : "text-[#4F7D60]"} />
          Refresh Stats
        </button>
      </div>

      {/* Top KPI Metrics Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="p-4 rounded-xl bg-white border border-[#D8D5CC] shadow-sm">
            <div className="text-xs text-[#5F665D] font-medium flex items-center justify-between mb-1">
              <span>Total Users</span>
              <Users size={14} className="text-[#385963]" />
            </div>
            <div className="text-2xl font-bold text-[#20251F]">{stats.total_users}</div>
            <div className="text-[11px] text-[#2E513E] font-medium mt-1">{stats.active_users} active</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#D8D5CC] shadow-sm">
            <div className="text-xs text-[#5F665D] font-medium flex items-center justify-between mb-1">
              <span>Active Sessions</span>
              <Activity size={14} className="text-[#2E513E]" />
            </div>
            <div className="text-2xl font-bold text-[#20251F]">{stats.active_sessions_count}</div>
            <div className="text-[11px] text-[#5F665D] mt-1">Live JWT sessions</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#D8D5CC] shadow-sm">
            <div className="text-xs text-[#5F665D] font-medium flex items-center justify-between mb-1">
              <span>Locked Accounts</span>
              <Lock size={14} className="text-[#927323]" />
            </div>
            <div className="text-2xl font-bold text-[#20251F]">{stats.locked_accounts}</div>
            <div className="text-[11px] text-[#927323] font-medium mt-1">Failed attempts &gt; 5</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#D8D5CC] shadow-sm">
            <div className="text-xs text-[#5F665D] font-medium flex items-center justify-between mb-1">
              <span>24h Audit Logs</span>
              <Shield size={14} className="text-[#385963]" />
            </div>
            <div className="text-2xl font-bold text-[#20251F]">{stats.audit_log_count}</div>
            <div className="text-[11px] text-[#385963] font-medium mt-1">Immutable events</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#D8D5CC] shadow-sm">
            <div className="text-xs text-[#5F665D] font-medium flex items-center justify-between mb-1">
              <span>Failed Logins</span>
              <AlertOctagon size={14} className="text-[#AD6048]" />
            </div>
            <div className="text-2xl font-bold text-[#20251F]">{stats.failed_logins_last_24h}</div>
            <div className="text-[11px] text-[#AD6048] font-medium mt-1">Last 24 hours</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#D8D5CC] shadow-sm">
            <div className="text-xs text-[#5F665D] font-medium flex items-center justify-between mb-1">
              <span>Surveyors</span>
              <Key size={14} className="text-[#2E513E]" />
            </div>
            <div className="text-2xl font-bold text-[#20251F]">{stats.users_by_role["SURVEYOR"] || 0}</div>
            <div className="text-[11px] text-[#2E513E] font-medium mt-1">
              {stats.users_by_role["ADMIN"] || 0} Admins
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-[#D8D5CC] space-x-2">
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "users"
              ? "border-[#2E513E] text-[#2E513E]"
              : "border-transparent text-[#5F665D] hover:text-[#20251F]"
          }`}
        >
          <Users size={16} /> User Directory & Roles
        </button>
        <button
          onClick={() => setActiveTab("sessions")}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "sessions"
              ? "border-[#2E513E] text-[#2E513E]"
              : "border-transparent text-[#5F665D] hover:text-[#20251F]"
          }`}
        >
          <Activity size={16} /> Active Token Sessions ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "audit"
              ? "border-[#2E513E] text-[#2E513E]"
              : "border-transparent text-[#5F665D] hover:text-[#20251F]"
          }`}
        >
          <Shield size={16} /> Security Audit Trail ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab("matrix")}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "matrix"
              ? "border-[#2E513E] text-[#2E513E]"
              : "border-transparent text-[#5F665D] hover:text-[#20251F]"
          }`}
        >
          <SlidersHorizontal size={16} /> RBAC Permission Matrix
        </button>
      </div>

      {/* TAB 1: User Directory */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-3 text-[#858B82]" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by username, email, full name..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#D8D5CC] rounded-xl text-sm text-[#20251F] placeholder-[#858B82] focus:outline-none focus:border-[#2E513E] transition"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-[#D8D5CC] rounded-xl text-sm text-[#30372F] focus:outline-none focus:border-[#2E513E]"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SURVEYOR">SURVEYOR</option>
              <option value="GOVERNMENT_OFFICIAL">GOVERNMENT_OFFICIAL</option>
              <option value="PUBLIC">PUBLIC</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-[#D8D5CC] rounded-xl text-sm text-[#30372F] focus:outline-none focus:border-[#2E513E]"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-[#D8D5CC] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#30372F]">
                <thead className="bg-[#FAF9F5] text-xs font-semibold text-[#5F665D] uppercase tracking-wider border-b border-[#D8D5CC]">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Roles</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Failed Logins</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8D5CC]/60">
                  {users.map((u) => (
                    <tr key={u.user_id} className="hover:bg-[#FAF9F5] transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#2E513E] flex items-center justify-center font-bold text-[#FAF9F5] text-xs">
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-[#20251F]">{u.full_name || u.username}</div>
                            <div className="text-xs text-[#5F665D] font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles?.map((r) => (
                            <span
                              key={r}
                              className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                r === "ADMIN"
                                  ? "bg-[#F8F3E6] text-[#927323] border border-[#E5D5A8]"
                                  : r === "SURVEYOR"
                                  ? "bg-[#E8F0EA] text-[#2E513E] border border-[#BFCDBF]"
                                  : r === "GOVERNMENT_OFFICIAL"
                                  ? "bg-[#EBF2F4] text-[#385963] border border-[#C6D8DC]"
                                  : "bg-[#EFEEE8] text-[#5F665D] border border-[#D8D5CC]"
                              }`}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {u.locked_until && new Date(u.locked_until) > new Date() ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#927323] bg-[#F8F3E6] border border-[#E5D5A8] px-2 py-0.5 rounded-full font-semibold">
                            <Lock size={12} /> Locked
                          </span>
                        ) : u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[#2E513E] bg-[#E8F0EA] border border-[#BFCDBF] px-2 py-0.5 rounded-full font-semibold">
                            <UserCheck size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-[#5F665D] bg-[#EFEEE8] border border-[#D8D5CC] px-2 py-0.5 rounded-full">
                            <UserX size={12} /> Deactivated
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs">
                        <span className={u.failed_login_attempts > 0 ? "text-[#AD6048] font-bold" : "text-[#5F665D]"}>
                          {u.failed_login_attempts} / 5
                        </span>
                      </td>

                      <td className="py-3 px-4 text-xs text-[#5F665D]">
                        {u.last_login ? new Date(u.last_login).toLocaleString() : "Never"}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.locked_until && new Date(u.locked_until) > new Date() && (
                            <button
                              onClick={() => handleUnlockUser(u)}
                              title="Unlock account"
                              className="p-1.5 rounded-lg bg-[#F8F3E6] hover:bg-[#F2E8CB] text-[#927323] border border-[#E5D5A8] transition text-xs flex items-center gap-1 font-medium"
                            >
                              <Unlock size={14} /> Unlock
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedUser(u)}
                            className="p-1.5 rounded-lg bg-[#FAF9F5] hover:bg-[#EFEEE8] border border-[#D8D5CC] text-[#30372F] text-xs transition flex items-center gap-1 font-medium"
                          >
                            <Key size={14} /> Manage Roles
                          </button>

                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`p-1.5 rounded-lg text-xs transition font-medium ${
                              u.is_active
                                ? "bg-[#F7ECE8] hover:bg-[#F2DDD7] text-[#914B38] border border-[#E4BFB4]"
                                : "bg-[#E8F0EA] hover:bg-[#DDE9E0] text-[#2E513E] border border-[#BFCDBF]"
                            }`}
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Assignment Modal */}
          {selectedUser && (
            <div className="fixed inset-0 bg-[#20251F]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
              <div className="bg-white border border-[#D8D5CC] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#D8D5CC] pb-3">
                  <h3 className="text-base font-bold text-[#20251F] flex items-center gap-2">
                    <Key size={18} className="text-[#2E513E]" />
                    Manage Roles: {selectedUser.username}
                  </h3>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-[#5F665D] hover:text-[#20251F] text-lg font-bold"
                  >
                    ×
                  </button>
                </div>

                <div>
                  <label className="text-xs text-[#5F665D] font-medium block mb-2">Current Assigned Roles:</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.roles?.map((r) => (
                      <span
                        key={r}
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-[#FAF9F5] border border-[#D8D5CC] text-[#30372F]"
                      >
                        {r}
                        <button
                          onClick={() => handleRemoveRole(r)}
                          className="text-[#AD6048] hover:text-[#914B38] ml-1 font-bold"
                          title="Remove role"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#D8D5CC]">
                  <label className="text-xs text-[#5F665D] font-medium block mb-1.5">Add Role:</label>
                  <div className="flex gap-2">
                    <select
                      value={roleToAssign}
                      onChange={(e) => setRoleToAssign(e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#FAF9F5] border border-[#D8D5CC] rounded-xl text-sm text-[#20251F] focus:outline-none focus:border-[#2E513E]"
                    >
                      <option value="PUBLIC">PUBLIC</option>
                      <option value="SURVEYOR">SURVEYOR</option>
                      <option value="GOVERNMENT_OFFICIAL">GOVERNMENT_OFFICIAL</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <button
                      onClick={handleAssignRole}
                      className="px-4 py-2 rounded-xl bg-[#2E513E] hover:bg-[#233F30] text-[#FAF9F5] text-sm font-semibold transition shadow-sm"
                    >
                      Add Role
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#D8D5CC] flex justify-end">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="px-4 py-1.5 rounded-xl bg-[#FAF9F5] hover:bg-[#EFEEE8] border border-[#D8D5CC] text-[#30372F] text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Active Token Sessions */}
      {activeTab === "sessions" && (
        <div className="bg-white border border-[#D8D5CC] rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-[#FAF9F5] border-b border-[#D8D5CC] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#20251F]">Live Cryptographic JWT Sessions</h3>
              <p className="text-xs text-[#5F665D]">
                Track and revoke active user sessions in real time.
              </p>
            </div>
            <span className="text-xs text-[#5F665D] font-mono">
              Total Active: <strong className="text-[#2E513E] font-bold">{sessions.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#30372F]">
              <thead className="bg-[#FAF9F5] text-xs font-semibold text-[#5F665D] uppercase tracking-wider border-b border-[#D8D5CC]">
                <tr>
                  <th className="py-3 px-4">Session ID</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">User Agent / Client</th>
                  <th className="py-3 px-4">Expires At</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8D5CC]/60">
                {sessions.map((s) => (
                  <tr key={s.session_id} className="hover:bg-[#FAF9F5] transition">
                    <td className="py-3 px-4 font-mono text-xs text-[#385963] font-semibold">
                      {s.session_id.slice(0, 16)}...
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#20251F]">{s.username}</td>
                    <td className="py-3 px-4 font-mono text-xs text-[#5F665D]">{s.ip_address || "127.0.0.1"}</td>
                    <td className="py-3 px-4 text-xs text-[#5F665D] max-w-xs truncate" title={s.user_agent}>
                      {s.user_agent || "Standard Browser"}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#5F665D]">
                      {new Date(s.expires_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRevokeSession(s.session_id)}
                        className="px-2.5 py-1 rounded-lg bg-[#F7ECE8] hover:bg-[#F2DDD7] text-[#914B38] border border-[#E4BFB4] text-xs font-semibold transition"
                      >
                        Terminate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Immutable Security Audit Logs */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <select
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-[#D8D5CC] rounded-xl text-sm text-[#30372F] focus:outline-none focus:border-[#2E513E]"
            >
              <option value="">All Security Events</option>
              <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
              <option value="LOGIN_FAILED">LOGIN_FAILED</option>
              <option value="TOKEN_REUSE_ATTACK_DETECTED">TOKEN_REUSE_ATTACK_DETECTED</option>
              <option value="USER_REGISTERED">USER_REGISTERED</option>
              <option value="PARCEL_VERIFIED">PARCEL_VERIFIED</option>
              <option value="ROLE_ASSIGNED">ROLE_ASSIGNED</option>
            </select>
          </div>

          <div className="bg-white border border-[#D8D5CC] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#30372F]">
                <thead className="bg-[#FAF9F5] text-xs font-semibold text-[#5F665D] uppercase tracking-wider border-b border-[#D8D5CC]">
                  <tr>
                    <th className="py-3 px-4">Audit ID</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Result</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8D5CC]/60 font-mono text-xs">
                  {auditLogs.map((log) => (
                    <React.Fragment key={log.audit_id}>
                      <tr className="hover:bg-[#FAF9F5] transition">
                        <td className="py-3 px-4 text-[#385963] font-semibold">{log.audit_id}</td>
                        <td className="py-3 px-4 font-semibold text-[#20251F]">{log.action}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              log.result === "SUCCESS"
                                ? "bg-[#E8F0EA] text-[#2E513E] border border-[#BFCDBF]"
                                : log.result === "DENIED"
                                ? "bg-[#F8F3E6] text-[#927323] border border-[#E5D5A8]"
                                : "bg-[#F7ECE8] text-[#914B38] border border-[#E4BFB4]"
                            }`}
                          >
                            {log.result}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#30372F]">{log.username_snapshot || "Anonymous"}</td>
                        <td className="py-3 px-4 text-[#5F665D]">{log.ip_address || "127.0.0.1"}</td>
                        <td className="py-3 px-4 text-[#5F665D] font-sans">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() =>
                              setExpandedLogId(expandedLogId === log.audit_id ? null : log.audit_id)
                            }
                            className="p-1 rounded bg-[#FAF9F5] hover:bg-[#EFEEE8] border border-[#D8D5CC] text-[#30372F] text-xs"
                          >
                            {expandedLogId === log.audit_id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                      </tr>
                      {expandedLogId === log.audit_id && (
                        <tr>
                          <td colSpan={7} className="bg-[#FAF9F5] p-4 border-b border-[#D8D5CC]">
                            <div className="text-[11px] text-[#5F665D] font-mono">
                              <div className="mb-1 font-bold text-[#20251F]">Sanitized Audit Metadata:</div>
                              <pre className="p-3 rounded-lg bg-white border border-[#D8D5CC] overflow-x-auto text-[#2E513E]">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RBAC Permission Matrix */}
      {activeTab === "matrix" && (
        <div className="bg-white border border-[#D8D5CC] rounded-2xl overflow-hidden shadow-sm p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#20251F] flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-[#2E513E]" />
              Role-Based Access Control (RBAC) Permission Matrix
            </h3>
            <p className="text-xs text-[#5F665D] mt-1">
              Hierarchical mapping of granular permissions across BhoomiSync canonical system roles.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#30372F]">
              <thead className="bg-[#FAF9F5] text-xs font-semibold text-[#5F665D] uppercase tracking-wider border-b border-[#D8D5CC]">
                <tr>
                  <th className="py-3 px-4">Granular Permission</th>
                  <th className="py-3 px-4 text-center">PUBLIC / Citizen</th>
                  <th className="py-3 px-4 text-center">SURVEYOR</th>
                  <th className="py-3 px-4 text-center">GOVERNMENT_OFFICIAL</th>
                  <th className="py-3 px-4 text-center">ADMIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8D5CC]/60">
                {Object.entries(permissionMatrix).map(([perm, roles]) => (
                  <tr key={perm} className="hover:bg-[#FAF9F5] transition">
                    <td className="py-2.5 px-4 font-mono text-xs text-[#20251F] font-medium">{perm}</td>
                    <td className="py-2.5 px-4 text-center">
                      {roles.PUBLIC ? (
                        <CheckCircle size={16} className="text-[#2E513E] mx-auto" />
                      ) : (
                        <XCircle size={16} className="text-[#C4C0B5] mx-auto" />
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {roles.SURVEYOR ? (
                        <CheckCircle size={16} className="text-[#2E513E] mx-auto" />
                      ) : (
                        <XCircle size={16} className="text-[#C4C0B5] mx-auto" />
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {roles.GOVERNMENT_OFFICIAL ? (
                        <CheckCircle size={16} className="text-[#2E513E] mx-auto" />
                      ) : (
                        <XCircle size={16} className="text-[#C4C0B5] mx-auto" />
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {roles.ADMIN ? (
                        <CheckCircle size={16} className="text-[#927323] mx-auto" />
                      ) : (
                        <XCircle size={16} className="text-[#C4C0B5] mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
