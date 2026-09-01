export type UserRole = "PUBLIC" | "SURVEYOR" | "GOVERNMENT_OFFICIAL" | "ADMIN";

export interface UserProfile {
  id: number;
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  phone_reference?: string;
  is_active: boolean;
  is_verified: boolean;
  last_login?: string;
  failed_login_attempts: number;
  locked_until?: string;
  roles: string[];
  permissions: string[];
  created_at: string;
  updated_at: string;
  active_sessions_count?: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in_seconds: number;
  user_id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface UserSessionInfo {
  id: number;
  session_id: string;
  user_id: string;
  username: string;
  ip_address?: string;
  user_agent?: string;
  device_info?: string;
  is_active: boolean;
  created_at: string;
  expires_at: string;
  last_active_at: string;
}

export interface SecurityAuditLogItem {
  id: number;
  audit_id: string;
  user_id?: string;
  username_snapshot?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  result: "SUCCESS" | "FAILURE" | "DENIED";
  ip_address?: string;
  user_agent?: string;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface SecurityStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  locked_accounts: number;
  unverified_users: number;
  users_by_role: Record<string, number>;
  active_sessions_count: number;
  audit_log_count: number;
  failed_logins_last_24h: number;
  suspicious_events_last_24h: number;
}

export interface DemoAccountPreset {
  role: UserRole;
  badge: string;
  title: string;
  email: string;
  username: string;
  password: string;
  fullName: string;
  description: string;
  icon: string;
  color: string;
}
