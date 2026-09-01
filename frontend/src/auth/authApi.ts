import { AuthTokens, UserProfile, SecurityStats, SecurityAuditLogItem, UserSessionInfo } from "./authTypes";

const API_BASE = "/api/v1";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("bhoomi_access_token");
  const activeRole = localStorage.getItem("bhoomi_active_role");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (activeRole) {
    headers["X-User-Role"] = activeRole;
  }

  let res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Automatic token refresh on 401
  if (res.status === 401 && !endpoint.includes("/auth/login") && !endpoint.includes("/auth/refresh")) {
    const refreshToken = localStorage.getItem("bhoomi_refresh_token");
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken, device_info: navigator.userAgent }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newTokens: AuthTokens = refreshData.data;
          localStorage.setItem("bhoomi_access_token", newTokens.access_token);
          localStorage.setItem("bhoomi_refresh_token", newTokens.refresh_token);

          // Retry original request with new token
          headers["Authorization"] = `Bearer ${newTokens.access_token}`;
          res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
          });
        } else {
          localStorage.removeItem("bhoomi_access_token");
          localStorage.removeItem("bhoomi_refresh_token");
          localStorage.removeItem("bhoomi_user");
        }
      } catch {
        localStorage.removeItem("bhoomi_access_token");
        localStorage.removeItem("bhoomi_refresh_token");
        localStorage.removeItem("bhoomi_user");
      }
    }
  }

  const json = await res.json();
  if (!res.ok) {
    const error: any = new Error(json.detail || json.message || "API request failed");
    error.response = { status: res.status, data: json };
    throw error;
  }

  return json.data !== undefined ? json.data : json;
}

export const authApi = {
  // Authentication
  login: async (payload: { username_or_email: string; password: string }): Promise<AuthTokens> => {
    return request<AuthTokens>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  register: async (payload: { username: string; email: string; password: string; full_name: string; role?: string; phone_reference?: string }): Promise<UserProfile> => {
    return request<UserProfile>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    return request<AuthTokens>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },

  logout: async (refreshToken?: string): Promise<any> => {
    return request<any>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },

  logoutAll: async (): Promise<any> => {
    return request<any>("/auth/logout-all", {
      method: "POST",
    });
  },

  getMe: async (): Promise<UserProfile> => {
    return request<UserProfile>("/auth/me");
  },

  changePassword: async (payload: { current_password: string; new_password: string }): Promise<any> => {
    return request<any>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Sessions
  getSessions: async (): Promise<{ sessions: UserSessionInfo[]; total: number }> => {
    return request<{ sessions: UserSessionInfo[]; total: number }>("/auth/sessions");
  },

  revokeSession: async (sessionId: string): Promise<any> => {
    return request<any>(`/auth/sessions/${sessionId}`, {
      method: "DELETE",
    });
  },

  // Admin & RBAC
  getUsers: async (params?: { role?: string; is_active?: boolean; search_query?: string; skip?: number; limit?: number }): Promise<{ users: UserProfile[]; total: number; skip: number; limit: number }> => {
    const q = new URLSearchParams();
    if (params?.role) q.append("role", params.role);
    if (params?.is_active !== undefined) q.append("is_active", String(params.is_active));
    if (params?.search_query) q.append("search_query", params.search_query);
    if (params?.skip !== undefined) q.append("skip", String(params.skip));
    if (params?.limit !== undefined) q.append("limit", String(params.limit));
    const qs = q.toString();
    return request<{ users: UserProfile[]; total: number; skip: number; limit: number }>(`/auth/users${qs ? `?${qs}` : ""}`);
  },

  getUserDetail: async (userId: string): Promise<UserProfile> => {
    return request<UserProfile>(`/auth/users/${userId}`);
  },

  updateUserStatus: async (userId: string, payload: { is_active?: boolean; is_verified?: boolean; unlock_account?: boolean }): Promise<UserProfile> => {
    return request<UserProfile>(`/auth/users/${userId}/status`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  assignRole: async (userId: string, roleName: string): Promise<UserProfile> => {
    return request<UserProfile>(`/auth/users/${userId}/roles`, {
      method: "POST",
      body: JSON.stringify({ role_name: roleName }),
    });
  },

  removeRole: async (userId: string, roleName: string): Promise<UserProfile> => {
    return request<UserProfile>(`/auth/users/${userId}/roles/${roleName}`, {
      method: "DELETE",
    });
  },

  getAuditLogs: async (params?: { action?: string; resource_type?: string; result?: string; skip?: number; limit?: number }): Promise<{ logs: SecurityAuditLogItem[]; total: number; skip: number; limit: number }> => {
    const q = new URLSearchParams();
    if (params?.action) q.append("action", params.action);
    if (params?.resource_type) q.append("resource_type", params.resource_type);
    if (params?.result) q.append("result", params.result);
    if (params?.skip !== undefined) q.append("skip", String(params.skip));
    if (params?.limit !== undefined) q.append("limit", String(params.limit));
    const qs = q.toString();
    return request<{ logs: SecurityAuditLogItem[]; total: number; skip: number; limit: number }>(`/auth/audit-logs${qs ? `?${qs}` : ""}`);
  },

  getSecurityStats: async (): Promise<SecurityStats> => {
    return request<SecurityStats>("/auth/security-stats");
  },
};
