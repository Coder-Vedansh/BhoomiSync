import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { UserProfile, UserRole, DemoAccountPreset, AuthTokens } from "./authTypes";
import { authApi } from "./authApi";
import { DEMO_ACCOUNTS } from "./authStore";

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  activeRole: UserRole;
  permissions: string[];
  isLoading: boolean;
  login: (username_or_email: string, password: string) => Promise<void>;
  quickDemoLogin: (preset: DemoAccountPreset) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasRole: (role: UserRole | string) => boolean;
  switchRoleDev: (role: UserRole) => void;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("bhoomi_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem("bhoomi_access_token"));
  });
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem("bhoomi_active_role") as UserRole;
    return saved || (user?.roles?.[0] as UserRole) || "SURVEYOR";
  });
  const [permissions, setPermissions] = useState<string[]>(() => {
    return user?.permissions || [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and verify user on mount
  const refreshUserProfile = useCallback(async () => {
    const token = localStorage.getItem("bhoomi_access_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const profile = await authApi.getMe();
      setUser(profile);
      setIsAuthenticated(true);
      setPermissions(profile.permissions || []);
      const primaryRole = (profile.roles?.[0] as UserRole) || "SURVEYOR";
      setActiveRole(primaryRole);
      localStorage.setItem("bhoomi_user", JSON.stringify(profile));
      localStorage.setItem("bhoomi_active_role", primaryRole);
    } catch {
      // If token expired / invalid
      localStorage.removeItem("bhoomi_access_token");
      localStorage.removeItem("bhoomi_refresh_token");
      localStorage.removeItem("bhoomi_user");
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUserProfile();
  }, [refreshUserProfile]);

  const handleLoginSuccess = (tokens: AuthTokens) => {
    localStorage.setItem("bhoomi_access_token", tokens.access_token);
    localStorage.setItem("bhoomi_refresh_token", tokens.refresh_token);
    const primaryRole = (tokens.roles?.[0] as UserRole) || "SURVEYOR";
    localStorage.setItem("bhoomi_active_role", primaryRole);

    const mockProfile: UserProfile = {
      id: 1,
      user_id: tokens.user_id,
      username: tokens.username,
      email: tokens.email,
      full_name: tokens.username,
      is_active: true,
      is_verified: true,
      failed_login_attempts: 0,
      roles: tokens.roles,
      permissions: tokens.permissions,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setUser(mockProfile);
    setIsAuthenticated(true);
    setActiveRole(primaryRole);
    setPermissions(tokens.permissions || []);
    localStorage.setItem("bhoomi_user", JSON.stringify(mockProfile));

    // Fetch full profile in background
    authApi.getMe().then((prof) => {
      setUser(prof);
      setPermissions(prof.permissions || []);
      localStorage.setItem("bhoomi_user", JSON.stringify(prof));
    }).catch(() => {});
  };

  const login = async (username_or_email: string, password: string) => {
    setIsLoading(true);
    try {
      const tokens = await authApi.login({ username_or_email, password });
      handleLoginSuccess(tokens);
    } finally {
      setIsLoading(false);
    }
  };

  const quickDemoLogin = async (preset: DemoAccountPreset) => {
    setIsLoading(true);
    try {
      const tokens = await authApi.login({
        username_or_email: preset.email,
        password: preset.password,
      });
      handleLoginSuccess(tokens);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const refresh = localStorage.getItem("bhoomi_refresh_token") || undefined;
      await authApi.logout(refresh);
    } catch {
      // proceed with local cleanup
    } finally {
      localStorage.removeItem("bhoomi_access_token");
      localStorage.removeItem("bhoomi_refresh_token");
      localStorage.removeItem("bhoomi_user");
      setUser(null);
      setIsAuthenticated(false);
      setActiveRole("SURVEYOR");
      setPermissions([]);
      setIsLoading(false);
    }
  };

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (activeRole === "ADMIN" || permissions.includes("*")) return true;
      return permissions.includes(permission);
    },
    [activeRole, permissions]
  );

  const hasAnyPermission = useCallback(
    (perms: string[]): boolean => {
      if (activeRole === "ADMIN" || permissions.includes("*")) return true;
      return perms.some((p) => permissions.includes(p));
    },
    [activeRole, permissions]
  );

  const hasRole = useCallback(
    (role: UserRole | string): boolean => {
      if (activeRole === "ADMIN" && role === "ADMIN") return true;
      return user?.roles?.includes(role) || activeRole === role;
    },
    [activeRole, user]
  );

  const switchRoleDev = (newRole: UserRole) => {
    setActiveRole(newRole);
    localStorage.setItem("bhoomi_active_role", newRole);
    // Find matching demo account permissions if in dev mode
    const preset = DEMO_ACCOUNTS.find((d) => d.role === newRole);
    if (preset && !isAuthenticated) {
      localStorage.setItem("bhoomi_active_role", newRole);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        activeRole,
        permissions,
        isLoading,
        login,
        quickDemoLogin,
        logout,
        hasPermission,
        hasAnyPermission,
        hasRole,
        switchRoleDev,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
