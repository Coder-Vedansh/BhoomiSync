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
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl border shadow-2xl z-50 text-sm font-medium flex items-center gap-2 backdrop-blur-lg ${
            notification.type === "success"
              ? "bg-emerald-950/90 border-emerald-500 text-emerald-200"
              : "bg-red-950/90 border-red-500 text-red-200"
          }`}
        >
          {notification.type === "success" ? <CheckCircle size={18} /> : <AlertOctagon size={18} />}
          {notification.message}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold uppercase tracking-wider">
            <Shield size={14} /> Security & Identity Administration
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Role-Based Access Control & Security Auditing
          </h1>
          <p className="text-sm text-slate-400">
            Manage system identities, monitor active token sessions, review cryptographic audit trails, and enforce least-privilege policies.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-center px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium text-slate-200 flex items-center gap-2 transition"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-purple-400" : ""} />
          Refresh Stats
        </button>
      </div>

      {/* Top KPI Metrics Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
            <div className="text-xs text-slate-400 flex items-center justify-between mb-1">
              <span>Total Users</span>
              <Users size={14} className="text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.total_users}</div>
            <div className="text-[11px] text-emerald-400 mt-1">{stats.active_users} active</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
            <div className="text-xs text-slate-400 flex items-center justify-between mb-1">
              <span>Active Sessions</span>
              <Activity size={14} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.active_sessions_count}</div>
            <div className="text-[11px] text-slate-400 mt-1">Live JWT sessions</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
            <div className="text-xs text-slate-400 flex items-center justify-between mb-1">
              <span>Locked Accounts</span>
              <Lock size={14} className="text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.locked_accounts}</div>
            <div className="text-[11px] text-amber-400 mt-1">Failed attempts &gt; 5</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
            <div className="text-xs text-slate-400 flex items-center justify-between mb-1">
              <span>24h Audit Logs</span>
              <Shield size={14} className="text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.audit_log_count}</div>
            <div className="text-[11px] text-purple-400 mt-1">Immutable events</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
            <div className="text-xs text-slate-400 flex items-center justify-between mb-1">
              <span>Failed Logins</span>
              <AlertOctagon size={14} className="text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.failed_logins_last_24h}</div>
            <div className="text-[11px] text-rose-400 mt-1">Last 24 hours</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
            <div className="text-xs text-slate-400 flex items-center justify-between mb-1">
              <span>Surveyors</span>
              <Key size={14} className="text-teal-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.users_by_role["SURVEYOR"] || 0}</div>
            <div className="text-[11px] text-teal-400 mt-1">
              {stats.users_by_role["ADMIN"] || 0} Admins
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "users"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users size={16} /> User Directory & Roles
        </button>
        <button
          onClick={() => setActiveTab("sessions")}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "sessions"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity size={16} /> Active Token Sessions ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "audit"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Shield size={16} /> Security Audit Trail ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab("matrix")}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "matrix"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
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
              <Search size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by username, email, full name..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-purple-500"
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
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-purple-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Users Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Roles</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Failed Logins</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u) => (
                    <tr key={u.user_id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs">
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{u.full_name || u.username}</div>
                            <div className="text-xs text-slate-400 font-mono">{u.email}</div>
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
                                  ? "bg-purple-950 text-purple-300 border border-purple-800/50"
                                  : r === "SURVEYOR"
                                  ? "bg-blue-950 text-blue-300 border border-blue-800/50"
                                  : r === "GOVERNMENT_OFFICIAL"
                                  ? "bg-amber-950 text-amber-300 border border-amber-800/50"
                                  : "bg-emerald-950 text-emerald-300 border border-emerald-800/50"
                              }`}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {u.locked_until && new Date(u.locked_until) > new Date() ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-full">
                            <Lock size={12} /> Locked
                          </span>
                        ) : u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                            <UserCheck size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                            <UserX size={12} /> Deactivated
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs">
                        <span className={u.failed_login_attempts > 0 ? "text-amber-400 font-bold" : "text-slate-400"}>
                          {u.failed_login_attempts} / 5
                        </span>
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-400">
                        {u.last_login ? new Date(u.last_login).toLocaleString() : "Never"}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.locked_until && new Date(u.locked_until) > new Date() && (
                            <button
                              onClick={() => handleUnlockUser(u)}
                              title="Unlock account"
                              className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition text-xs flex items-center gap-1"
                            >
                              <Unlock size={14} /> Unlock
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedUser(u)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition flex items-center gap-1"
                          >
                            <Key size={14} /> Manage Roles
                          </button>

                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`p-1.5 rounded-lg text-xs transition ${
                              u.is_active
                                ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
                                : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
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
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Key size={18} className="text-purple-400" />
                    Manage Roles: {selectedUser.username}
                  </h3>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-slate-400 hover:text-white text-lg font-bold"
                  >
                    ×
                  </button>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-medium block mb-2">Current Assigned Roles:</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.roles?.map((r) => (
                      <span
                        key={r}
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
                      >
                        {r}
                        <button
                          onClick={() => handleRemoveRole(r)}
                          className="text-red-400 hover:text-red-300 ml-1"
                          title="Remove role"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <label className="text-xs text-slate-400 font-medium block mb-1.5">Add Role:</label>
                  <div className="flex gap-2">
                    <select
                      value={roleToAssign}
                      onChange={(e) => setRoleToAssign(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="PUBLIC">PUBLIC</option>
                      <option value="SURVEYOR">SURVEYOR</option>
                      <option value="GOVERNMENT_OFFICIAL">GOVERNMENT_OFFICIAL</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <button
                      onClick={handleAssignRole}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition shadow-lg shadow-purple-600/20"
                    >
                      Add Role
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
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
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Live Cryptographic JWT Sessions</h3>
              <p className="text-xs text-slate-400">
                Track and revoke active user sessions in real time.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total Active: <strong className="text-emerald-400">{sessions.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Session ID</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">User Agent / Client</th>
                  <th className="py-3 px-4">Expires At</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sessions.map((s) => (
                  <tr key={s.session_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-xs text-purple-300">
                      {s.session_id.slice(0, 16)}...
                    </td>
                    <td className="py-3 px-4 font-medium text-white">{s.username}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">{s.ip_address || "127.0.0.1"}</td>
                    <td className="py-3 px-4 text-xs text-slate-400 max-w-xs truncate" title={s.user_agent}>
                      {s.user_agent || "Standard Browser"}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {new Date(s.expires_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRevokeSession(s.session_id)}
                        className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-semibold transition"
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
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-purple-500"
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

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
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
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {auditLogs.map((log) => (
                    <React.Fragment key={log.audit_id}>
                      <tr className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 text-purple-300">{log.audit_id}</td>
                        <td className="py-3 px-4 font-semibold text-slate-200">{log.action}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              log.result === "SUCCESS"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : log.result === "DENIED"
                                ? "bg-amber-950 text-amber-300 border border-amber-800"
                                : "bg-red-950 text-red-300 border border-red-800"
                            }`}
                          >
                            {log.result}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{log.username_snapshot || "Anonymous"}</td>
                        <td className="py-3 px-4 text-slate-400">{log.ip_address || "127.0.0.1"}</td>
                        <td className="py-3 px-4 text-slate-400 font-sans">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() =>
                              setExpandedLogId(expandedLogId === log.audit_id ? null : log.audit_id)
                            }
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                          >
                            {expandedLogId === log.audit_id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                      </tr>
                      {expandedLogId === log.audit_id && (
                        <tr>
                          <td colSpan={7} className="bg-slate-950/80 p-4 border-b border-slate-800">
                            <div className="text-[11px] text-slate-400 font-mono">
                              <div className="mb-1 font-bold text-slate-300">Sanitized Audit Metadata:</div>
                              <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto text-emerald-400">
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
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-purple-400" />
              Role-Based Access Control (RBAC) Permission Matrix
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Hierarchical mapping of granular permissions across BhoomiSync canonical system roles.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Granular Permission</th>
                  <th className="py-3 px-4 text-center">PUBLIC / Citizen</th>
                  <th className="py-3 px-4 text-center">SURVEYOR</th>
                  <th className="py-3 px-4 text-center">GOVERNMENT_OFFICIAL</th>
                  <th className="py-3 px-4 text-center">ADMIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {Object.entries(permissionMatrix).map(([perm, roles]) => (
                  <tr key={perm} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-200">{perm}</td>
                    <td className="py-2.5 px-4 text-center">
                      {roles.PUBLIC ? (
                        <CheckCircle size={16} className="text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle size={16} className="text-slate-600 mx-auto" />
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {roles.SURVEYOR ? (
                        <CheckCircle size={16} className="text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle size={16} className="text-slate-600 mx-auto" />
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {roles.GOVERNMENT_OFFICIAL ? (
                        <CheckCircle size={16} className="text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle size={16} className="text-slate-600 mx-auto" />
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {roles.ADMIN ? (
                        <CheckCircle size={16} className="text-purple-400 mx-auto" />
                      ) : (
                        <XCircle size={16} className="text-slate-600 mx-auto" />
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
