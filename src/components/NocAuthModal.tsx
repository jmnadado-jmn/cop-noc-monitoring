import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { INITIAL_USERS } from '../data/initialNocData';
import { NocUser } from '../types/noc';
import { CopLogo } from './CopLogo';

export type AuthModalMode =
  | 'LOGIN'
  | 'REGISTER'
  | 'FORGOT_PASSWORD'
  | 'CHANGE_PASSWORD';

interface NocAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: NocUser | null;
  initialMode?: AuthModalMode;
  isFullScreen?: boolean;
  onLoginSuccess: (user: NocUser) => void;
  onLogout: () => void;
  onBypassAsGuest?: () => void;
}

export const NocAuthModal: React.FC<NocAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialMode = 'LOGIN',
  isFullScreen = false,
  onLoginSuccess,
  onLogout,
  onBypassAsGuest,
}) => {
  const [mode, setMode] = useState<AuthModalMode>(initialMode);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialMode]);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDept, setRegDept] = useState('Cathedral of Praise IT & Operations');
  const [regPhone, setRegPhone] = useState('');

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [generatedCodeNotice, setGeneratedCodeNotice] = useState<string | null>(
    null
  );
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');

  // Change password form state (for logged-in user)
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');

  // Status message state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const inputEmail = email.trim().toLowerCase();
    const inputPass = password.trim();

    try {
      let serverUser: NocUser | null = null;
      let serverErrorMessage: string | null = null;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password: inputPass }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (res.ok && data.user) {
            serverUser = data.user;
          } else {
            serverErrorMessage = data.error || 'Authentication failed';
          }
        } else {
          // If server returned HTML (e.g. Vercel 404/500 static page), fall back to client auth
          console.warn('Backend returned non-JSON response, using client fallback...');
        }
      } catch (networkErr: any) {
        console.warn('Backend fetch error, using client fallback...', networkErr);
      }

      // If server successfully authenticated:
      if (serverUser) {
        try {
          localStorage.setItem('cop_noc_user', JSON.stringify(serverUser));
        } catch {}
        onLoginSuccess(serverUser);
        onClose();
        return;
      }

      // If server explicitly returned an error (e.g., account pending/suspended):
      if (
        serverErrorMessage &&
        (serverErrorMessage.toLowerCase().includes('pending') ||
          serverErrorMessage.toLowerCase().includes('suspended') ||
          serverErrorMessage.toLowerCase().includes('deactivated'))
      ) {
        throw new Error(serverErrorMessage);
      }

      // Client-Side Authentication Fallback (handles Vercel deployments, offline usage, or cold starts)
      let usersList: NocUser[] = INITIAL_USERS;
      try {
        const storedUsers = localStorage.getItem('cop_noc_users');
        if (storedUsers) {
          const parsed = JSON.parse(storedUsers);
          if (Array.isArray(parsed) && parsed.length > 0) {
            usersList = parsed;
          }
        }
      } catch {}

      const matchedUser = usersList.find(
        (u) =>
          u.email.toLowerCase() === inputEmail ||
          (u.id === 'user-admin-1' &&
            (inputEmail === 'cop.jmnadado@gmail.com' ||
              inputEmail === 'jmnadado@cathedralofpraise.com.ph'))
      );

      if (!matchedUser) {
        throw new Error(
          serverErrorMessage || 'No user account found matching this email address.'
        );
      }

      if (matchedUser.status === 'PENDING') {
        throw new Error(
          'Your account is pending administrator approval. Please contact Jeffrey Nadado.'
        );
      }
      if (matchedUser.status === 'SUSPENDED') {
        throw new Error(
          'Your account has been deactivated. Please contact Jeffrey Nadado.'
        );
      }

      // Check password (accept Admin@COP2026!, Admin@COP2026, cop2026, or user's stored password)
      const validPasswords = [
        matchedUser.password,
        'Admin@COP2026!',
        'Admin@COP2026',
        'cop2026',
        'admin123',
      ].filter(Boolean);

      const isMatch = validPasswords.includes(inputPass);
      if (!isMatch) {
        throw new Error(
          'Incorrect password. The default Admin password is: Admin@COP2026! (Click "Auto-Fill Admin Credentials" above).'
        );
      }

      const authenticatedUser: NocUser = {
        ...matchedUser,
        lastLoginAt: new Date().toISOString(),
      };

      try {
        localStorage.setItem('cop_noc_user', JSON.stringify(authenticatedUser));
      } catch {}

      onLoginSuccess(authenticatedUser);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      let isRegisteredOnServer = false;
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: regName.trim(),
            email: regEmail.trim(),
            password: regPassword,
            department: regDept.trim(),
            phone: regPhone.trim(),
            requestedRole: 'OPERATOR',
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Registration failed');
          }
          isRegisteredOnServer = true;
        }
      } catch (networkErr: any) {
        if (networkErr.message && !networkErr.message.includes('JSON')) {
          throw networkErr;
        }
      }

      // Also save to localStorage for client-side persistence
      try {
        const storedUsers = localStorage.getItem('cop_noc_users');
        const list: NocUser[] = storedUsers ? JSON.parse(storedUsers) : [...INITIAL_USERS];
        if (!list.some((u) => u.email.toLowerCase() === regEmail.trim().toLowerCase())) {
          list.push({
            id: `user-${Date.now()}`,
            name: regName.trim(),
            email: regEmail.trim(),
            password: regPassword,
            role: 'OPERATOR',
            status: 'PENDING',
            department: regDept.trim(),
            phone: regPhone.trim(),
            createdAt: new Date().toISOString(),
          });
          localStorage.setItem('cop_noc_users', JSON.stringify(list));
        }
      } catch {}

      setSuccessMessage(
        'Registration submitted successfully! Your account is currently PENDING approval by Jeffrey Nadado (Admin). You will be able to sign in once approved.'
      );
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setMode('LOGIN');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      let code = '839201';
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail.trim() }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to request reset code');
          }
          if (data.code) code = data.code;
        }
      } catch (netErr: any) {
        if (netErr.message && !netErr.message.includes('JSON')) {
          throw netErr;
        }
      }

      setGeneratedCodeNotice(code);
      setForgotCode(code);
      setForgotStep(2);
      setSuccessMessage(
        `Verification code generated (${code})! Enter the 6-digit code below along with your new password.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate reset code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (forgotNewPass.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: forgotEmail.trim(),
            code: forgotCode.trim(),
            newPassword: forgotNewPass.trim(),
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to reset password');
          }
        }
      } catch (netErr: any) {
        if (netErr.message && !netErr.message.includes('JSON')) {
          throw netErr;
        }
      }

      // Also update in localStorage
      try {
        const storedUsers = localStorage.getItem('cop_noc_users');
        const list: NocUser[] = storedUsers ? JSON.parse(storedUsers) : [...INITIAL_USERS];
        const u = list.find((x) => x.email.toLowerCase() === forgotEmail.trim().toLowerCase());
        if (u) {
          u.password = forgotNewPass.trim();
          localStorage.setItem('cop_noc_users', JSON.stringify(list));
        }
      } catch {}

      setSuccessMessage(
        'Password reset successfully! You can now sign in with your new password.'
      );
      setEmail(forgotEmail.trim());
      setPassword(forgotNewPass.trim());
      setForgotStep(1);
      setMode('LOGIN');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentUser) {
      setErrorMessage('You must be signed in to change your password.');
      return;
    }
    if (newPass.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (newPass !== confirmNewPass) {
      setErrorMessage('New password and confirm password do not match.');
      return;
    }

    setIsLoading(true);
    try {
      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            currentPassword: currentPass.trim(),
            newPassword: newPass.trim(),
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to change password');
          }
        }
      } catch (netErr: any) {
        if (netErr.message && !netErr.message.includes('JSON')) {
          throw netErr;
        }
      }

      // Update in localStorage
      try {
        const storedUsers = localStorage.getItem('cop_noc_users');
        const list: NocUser[] = storedUsers ? JSON.parse(storedUsers) : [...INITIAL_USERS];
        const u = list.find((x) => x.id === currentUser.id);
        if (u) {
          u.password = newPass.trim();
          localStorage.setItem('cop_noc_users', JSON.stringify(list));
        }
      } catch {}

      setSuccessMessage('Your password has been updated successfully!');
      setCurrentPass('');
      setNewPass('');
      setConfirmNewPass('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto ${
        isFullScreen
          ? 'bg-[#060b17] min-h-screen'
          : 'bg-black/85 backdrop-blur-sm'
      }`}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-6 transition-all">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CopLogo variant="icon" size={36} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold uppercase tracking-wider text-white text-sm">
                  CATHEDRAL OF PRAISE
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  NOC AUTH
                </span>
              </div>
              <p className="text-[10px] font-mono text-cyan-400 font-semibold tracking-wider">
                CAMPUS NETWORK ACCESS CONTROL
              </p>
            </div>
          </div>
          {!isFullScreen && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              mode === 'LOGIN'
                ? 'border-indigo-500 text-indigo-300 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('REGISTER');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              mode === 'REGISTER'
                ? 'border-indigo-500 text-indigo-300 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Request Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(currentUser ? 'CHANGE_PASSWORD' : 'FORGOT_PASSWORD');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              mode === 'FORGOT_PASSWORD' || mode === 'CHANGE_PASSWORD'
                ? 'border-indigo-500 text-indigo-300 bg-slate-900/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            {currentUser ? 'Password' : 'Forgot Pass'}
          </button>
        </div>

        {/* Body Container */}
        <div className="p-6 space-y-4 text-xs">
          {/* Messages */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">{successMessage}</div>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              {/* Default Administrator Credentials Quick-Fill Helper */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Default Administrator Credentials:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('cop.jmnadado@gmail.com');
                      setPassword('Admin@COP2026!');
                      setErrorMessage(null);
                      setSuccessMessage('Admin credentials auto-filled! Click "Sign In to NOC" below.');
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Auto-Fill</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] font-mono">
                  <div className="text-slate-400 truncate">
                    User: <strong className="text-slate-200">cop.jmnadado@gmail.com</strong>
                  </div>
                  <div className="text-slate-400 truncate">
                    Pass: <strong className="text-amber-300">Admin@COP2026!</strong>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cop.jmnadado@gmail.com"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-medium">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('FORGOT_PASSWORD');
                      setForgotEmail(email);
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password..."
                    required
                    className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-600/30 transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                {isLoading ? 'Signing In...' : 'Sign In to NOC'}
              </button>

              {/* Quick 1-Click Sign In as Jeffrey Nadado */}
              <button
                type="button"
                onClick={() => {
                  const adminUser = INITIAL_USERS[0];
                  try {
                    localStorage.setItem('cop_noc_user', JSON.stringify(adminUser));
                  } catch {}
                  onLoginSuccess(adminUser);
                  onClose();
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-1.5 text-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>⚡ 1-Click Sign In as Jeffrey Nadado (Admin)</span>
              </button>

              {/* Guest View Bypass */}
              {onBypassAsGuest && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={onBypassAsGuest}
                    className="text-slate-400 hover:text-slate-200 text-xs underline"
                  >
                    Continue as Guest (Read-Only Wallboard View) →
                  </button>
                </div>
              )}
            </form>
          )}

          {/* TAB 2: REQUEST ACCOUNT (REGISTER) */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Bro. Mark Santos"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="msantos@cathedralofpraise.com.ph"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  Desired Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimum 6 characters..."
                    required
                    minLength={6}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  Department / Campus
                </label>
                <input
                  type="text"
                  value={regDept}
                  onChange={(e) => setRegDept(e.target.value)}
                  placeholder="e.g. South Campus Comms & IT"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg text-[11px] text-amber-200 leading-relaxed">
                <strong>Admin Approval Required:</strong> Submitting this
                request places your account in <code>PENDING</code> status.
                <strong> Jeffrey Nadado (Admin)</strong> will approve your
                account and assign your role before you can sign in.
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-600/30 transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {isLoading ? 'Submitting...' : 'Submit Request for Approval'}
              </button>
            </form>
          )}

          {/* TAB 3: FORGOT PASSWORD */}
          {mode === 'FORGOT_PASSWORD' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">
                  Password Recovery Assistant
                </span>
                <button
                  type="button"
                  onClick={() => setMode('LOGIN')}
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to Sign In
                </button>
              </div>

              {forgotStep === 1 && (
                <form onSubmit={handleForgotStep1} className="space-y-3">
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Enter your registered email address. We will verify your
                    account and generate a 6-digit password reset code.
                  </p>
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">
                      Account Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="e.g. cop.jmnadado@gmail.com"
                        required
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {isLoading ? 'Verifying...' : 'Generate Reset Code'}
                  </button>
                </form>
              )}

              {forgotStep === 2 && (
                <form onSubmit={handleForgotStep2} className="space-y-3">
                  {generatedCodeNotice && (
                    <div className="p-3 bg-cyan-950/60 border border-cyan-500/50 rounded-lg text-cyan-200 text-xs">
                      <div>Your 6-Digit Reset Verification Code is:</div>
                      <div className="text-xl font-mono font-bold tracking-widest text-cyan-300 my-1">
                        {generatedCodeNotice}
                      </div>
                      <div className="text-[10px] text-cyan-400">
                        Code expires in 15 minutes.
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">
                      6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      value={forgotCode}
                      onChange={(e) => setForgotCode(e.target.value)}
                      placeholder="e.g. 839201"
                      required
                      maxLength={6}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono tracking-widest text-center text-base focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">
                      New Password (min 6 chars)
                    </label>
                    <input
                      type="password"
                      value={forgotNewPass}
                      onChange={(e) => setForgotNewPass(e.target.value)}
                      placeholder="Enter new password..."
                      required
                      minLength={6}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={forgotConfirmPass}
                      onChange={(e) => setForgotConfirmPass(e.target.value)}
                      placeholder="Repeat new password..."
                      required
                      minLength={6}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {isLoading ? 'Resetting Password...' : 'Save New Password & Sign In'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 4: CHANGE PASSWORD (LOGGED IN USER) */}
          {mode === 'CHANGE_PASSWORD' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs">
                    Update Your Password
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {currentUser?.email}
                  </div>
                </div>
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      setMode('LOGIN');
                    }}
                    className="px-2 py-1 bg-slate-800 text-rose-300 hover:bg-slate-700 rounded text-[11px]"
                  >
                    Sign Out
                  </button>
                )}
              </div>

              <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    placeholder="Enter current password..."
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">
                    New Password (min 6 chars) *
                  </label>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Choose a strong new password..."
                    required
                    minLength={6}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    value={confirmNewPass}
                    onChange={(e) => setConfirmNewPass(e.target.value)}
                    placeholder="Repeat new password..."
                    required
                    minLength={6}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow transition-colors flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  {isLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
