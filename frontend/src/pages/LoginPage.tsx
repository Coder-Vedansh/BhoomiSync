import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { DEMO_ACCOUNTS } from "../auth/authStore";
import { DemoAccountPreset } from "../auth/authTypes";
import { authApi } from "../auth/authApi";
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Building2,
  Compass,
  Users,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";

export const LoginPage: React.FC<{ onLoginSuccess?: () => void }> = ({ onLoginSuccess }) => {
  const { login, quickDemoLogin, isAuthenticated, user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [emailOrUser, setEmailOrUser] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register form state
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regRole, setRegRole] = useState("SURVEYOR");
  const [regPhone, setRegPhone] = useState("");

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUser.trim() || !password) {
      setErrorMessage("Please enter both username/email and password.");
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await login(emailOrUser.trim(), password);
      setSuccessMessage("Logged in successfully! Redirecting...");
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || "Invalid credentials or account locked.";
      setErrorMessage(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (preset: DemoAccountPreset) => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await quickDemoLogin(preset);
      setSuccessMessage(`Authenticated as ${preset.title}!`);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Authentication error. Ensure backend is running.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      await authApi.register({
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword,
        full_name: regFullName.trim(),
        role: regRole,
        phone_reference: regPhone.trim() || undefined,
      });
      setSuccessMessage("Account created successfully! Please sign in with your credentials.");
      setActiveTab("login");
      setEmailOrUser(regEmail.trim());
      setPassword("");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Registration failed. Check password strength or duplicate username.";
      setErrorMessage(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleIcon = (iconName: string) => {
    switch (iconName) {
      case "ShieldAlert":
        return <ShieldAlert size={24} className="text-purple-400" />;
      case "Compass":
        return <Compass size={24} className="text-blue-400" />;
      case "Building2":
        return <Building2 size={24} className="text-amber-400" />;
      default:
        return <Users size={24} className="text-emerald-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle technical background cadastral grid */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-4xl z-10 px-4">
        {/* Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldCheck size={14} /> BhoomiSync Security & RBAC Gateway
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center justify-center gap-3">
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              BhoomiSync
            </span>{" "}
            Identity Access
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
            Production-grade authenticated session management, cryptographic JWT tokens, and fine-grained Role-Based Access Control.
          </p>
        </div>

        {/* Current Active Session Status Banner */}
        {isAuthenticated && user && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-emerald-400" size={20} />
              <div>
                <div className="text-sm font-semibold text-white">
                  Active Session: <span className="text-emerald-300">{user.full_name || user.username}</span>
                </div>
                <div className="text-xs text-slate-400">
                  Role: <span className="text-emerald-400 font-mono">{user.roles?.join(", ") || "SURVEYOR"}</span> • Email: {user.email}
                </div>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-semibold transition"
            >
              Sign Out
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Quick Demo Login Cards */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                1-Click Quick Demo Sign-In
              </h2>
              <span className="text-xs text-slate-400">Select any role to test RBAC</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {DEMO_ACCOUNTS.map((preset) => (
                <div
                  key={preset.role}
                  onClick={() => !isSubmitting && handleDemoLogin(preset)}
                  className="p-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-600 transition-all cursor-pointer group relative overflow-hidden backdrop-blur-md shadow-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 rounded-lg bg-slate-800/80 group-hover:scale-105 transition">
                      {getRoleIcon(preset.icon)}
                    </div>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                      {preset.badge}
                    </span>
                  </div>

                  <h3 className="font-semibold text-white text-sm group-hover:text-emerald-300 transition">
                    {preset.title}
                  </h3>
                  <div className="text-xs font-mono text-slate-400 mb-1.5">{preset.email}</div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>

                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-emerald-400 font-medium">
                    <span>Instant Login</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition" />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/30 text-xs text-blue-300 flex items-start gap-2.5">
              <Info size={16} className="shrink-0 mt-0.5 text-blue-400" />
              <div>
                <strong>Zero Password Typing in Demo:</strong> Clicking any preset authenticates against the server with Argon2/Bcrypt hash verification, obtains a JWT access token & rotatable refresh token, and applies strict server-side permissions.
              </div>
            </div>
          </div>

          {/* Right Column: Credentials Login & Register Form */}
          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
            {/* Tabs */}
            <div className="flex border-b border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setErrorMessage(null);
                }}
                className={`pb-3 text-sm font-semibold flex-1 text-center transition border-b-2 ${
                  activeTab === "login"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("register");
                  setErrorMessage(null);
                }}
                className={`pb-3 text-sm font-semibold flex-1 text-center transition border-b-2 ${
                  activeTab === "register"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error & Success Feedback Alerts */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-start gap-2 animate-shake">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-400" />
                <div>{errorMessage}</div>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                <div>{successMessage}</div>
              </div>
            )}

            {activeTab === "login" ? (
              <form onSubmit={handleManualLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Username or Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail size={16} />
                    </div>
                    <input
                      type="text"
                      value={emailOrUser}
                      onChange={(e) => setEmailOrUser(e.target.value)}
                      placeholder="admin@bhoomisync.demo"
                      required
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Password
                    </label>
                    <span className="text-[11px] text-slate-500">Max 5 attempts before lockout</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <KeyRound size={16} /> Sign In with Credentials
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra"
                    required
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="rpatel"
                      required
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Role
                    </label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                    >
                      <option value="PUBLIC">PUBLIC / Citizen</option>
                      <option value="SURVEYOR">SURVEYOR</option>
                      <option value="GOVERNMENT_OFFICIAL">GOVERNMENT_OFFICIAL</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="ramesh@example.com"
                    required
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Phone / Reference Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Password (Min 8 chars, Upper, Lower, Digit, Special)
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="SecurePassword@2026"
                    required
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>


                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white text-sm font-semibold shadow-lg shadow-teal-500/20 transition flex items-center justify-center gap-2"
                >
                  <User size={16} /> Register Account
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
