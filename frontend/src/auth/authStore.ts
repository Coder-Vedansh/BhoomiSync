import { UserProfile, UserRole, DemoAccountPreset } from "./authTypes";

export const DEMO_ACCOUNTS: DemoAccountPreset[] = [
  {
    role: "ADMIN",
    badge: "👑 Full Control",
    title: "System Administrator",
    email: "admin@bhoomisync.demo",
    username: "admin",
    password: "AdminPassword@2026",
    fullName: "BhoomiSync Administrator",
    description: "Full administrative access, user lifecycle management, session revocation, and security audit log inspection.",
    icon: "ShieldAlert",
    color: "var(--accent-purple)",
  },
  {
    role: "SURVEYOR",
    badge: "📐 High Precision",
    title: "Cadastral Surveyor",
    email: "surveyor@bhoomisync.demo",
    username: "surveyor",
    password: "SurveyorPassword@2026",
    fullName: "Vikram Singh (Surveyor)",
    description: "Drone telemetry ingestion, point cloud processing, AI boundary verification, and parcel editing sign-off.",
    icon: "Compass",
    color: "var(--accent-blue)",
  },
  {
    role: "GOVERNMENT_OFFICIAL",
    badge: "🏛️ Revenue Authority",
    title: "Tehsildar / Revenue Official",
    email: "official@bhoomisync.demo",
    username: "official",
    password: "OfficialPassword@2026",
    fullName: "Sunita Sharma (Tehsildar)",
    description: "Official cadastral batch record imports, dispute resolution, ownership title updates, and mutation registry.",
    icon: "Building2",
    color: "var(--accent-amber)",
  },
  {
    role: "PUBLIC",
    badge: "🧑‍🌾 Citizen Access",
    title: "Citizen / Land Owner (Khatedar)",
    email: "citizen@bhoomisync.demo",
    username: "citizen",
    password: "CitizenPassword@2026",
    fullName: "Ramesh Chandra Patel (Khatedar)",
    description: "Public land record search, privacy-masked landowner queries, and survey history tracking.",
    icon: "Users",
    color: "var(--accent-emerald)",
  },
];

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  activeRole: UserRole;
  permissions: string[];
  isLoading: boolean;
}
