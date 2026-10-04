import React, { useState } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck, Unlock, Users, X } from 'lucide-react';
import { CopLogo } from './CopLogo';

export const AUTHORIZED_NOC_EMAILS = [
  'cop.jmnadado@gmail.com',
  'jmnadado@cathedralofpraise.com.ph',
  'admin@cathedralofpraise.com.ph',
  'lcmojal@cathedralofpraise.com.ph',
  'jffernandez@cathedralofpraise.com.ph',
  'jcjara@cathedralofpraise.com.ph',
];

interface NocSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  isUnlocked: boolean;
  activeOperatorEmail: string;
  maskSensitiveIds: boolean;
  onToggleMaskSensitiveIds: (val: boolean) => void;
  onUnlockSuccess: (operatorEmail: string) => void;
  onLockDashboard: () => void;
  onOpenUserManagement?: () => void;
}

export const NocSecurityModal: React.FC<NocSecurityModalProps> = ({
  isOpen,
  onClose,
  isUnlocked,
  activeOperatorEmail,
  maskSensitiveIds,
  onToggleMaskSensitiveIds,
  onUnlockSuccess,
  onLockDashboard,
  onOpenUserManagement,
}) => {
  const [selectedEmail, setSelectedEmail] = useState<string>(
    activeOperatorEmail || AUTHORIZED_NOC_EMAILS[0]
  );
  const [pinInput, setPinInput] = useState<string>('');
  const [customPin, setCustomPin] = useState<string>(
    () => localStorage.getItem('cop_noc_pin') || '2026'
  );
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pinSavedMsg, setPinSavedMsg] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const normalizedEmail = selectedEmail.trim().toLowerCase();
    if (pinInput.trim() !== customPin && pinInput.trim() !== 'Admin@COP2026!') {
      setErrorMsg('Invalid NOC PIN or Password. (Default PIN: 2026, or use Admin Password)');
      return;
    }
    setPinInput('');
    onUnlockSuccess(normalizedEmail);
    onClose();
  };

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput.trim().length < 4) {
      setErrorMsg('New PIN must be at least 4 characters.');
      return;
    }
    localStorage.setItem('cop_noc_pin', newPinInput.trim());
    setCustomPin(newPinInput.trim());
    setNewPinInput('');
    setPinSavedMsg(true);
    setTimeout(() => setPinSavedMsg(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="noc-security-modal-title"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden my-8 shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <CopLogo size={36} />
            <div>
              <h2
                id="noc-security-modal-title"
                className="text-base font-semibold text-slate-100 flex items-center gap-2"
              >
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                NOC Security &amp; Data Privacy Controls
              </h2>
              <p className="text-xs text-slate-400">
                Protect confidential PLDT Account Numbers, Circuit IDs, and ticket controls.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-md transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs text-slate-300">
          {/* Admin User Management Quick Access */}
          {onOpenUserManagement && (
            <div className="p-4 bg-indigo-950/40 border border-indigo-700/50 rounded-xl flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="font-semibold text-indigo-200 flex items-center gap-1.5 text-xs">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Admin User Accounts &amp; Approvals
                </div>
                <p className="text-[11px] text-indigo-300/80">
                  Approve new staff signups, suspend unauthorized users, or reset operator passwords.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUserManagement();
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs shrink-0 transition-colors shadow-sm"
              >
                Manage Users →
              </button>
            </div>
          )}

          {/* Layer 1: Wallboard Privacy Masking */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                {maskSensitiveIds ? (
                  <EyeOff className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Eye className="w-4 h-4 text-amber-400" />
                )}
                Wallboard Account # &amp; Circuit ID Masking
              </div>
              <p className="text-slate-400">
                {maskSensitiveIds
                  ? 'ACTIVE: Account Numbers & Circuit IDs are masked (e.g. Acct #•••••0277) on the main wallboard so TV screens and visitors cannot see sensitive Telco credentials.'
                  : 'VISIBLE: Full Account Numbers and Circuit IDs are currently shown on the wallboard.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggleMaskSensitiveIds(!maskSensitiveIds)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border shrink-0 transition-colors ${
                maskSensitiveIds
                  ? 'bg-emerald-950 border-emerald-700 text-emerald-300 hover:bg-emerald-900'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {maskSensitiveIds ? 'Masked (Safe)' : 'Mask IDs Now'}
            </button>
          </div>

          {/* Layer 2: NOC Operator Lock / Unlock */}
          {!isUnlocked ? (
            <form
              onSubmit={handleUnlockSubmit}
              className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3"
            >
              <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
                <Lock className="w-4 h-4 text-rose-400" />
                Dashboard is Locked (Read-Only Wallboard Mode)
              </div>
              <p className="text-slate-400">
                Sign in with your authorized Cathedral of Praise IT email and NOC PIN (or Admin password) to reveal full Circuit IDs, record outages, or dispatch Telco emails.
              </p>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Authorized Cathedral of Praise IT Operator
                </label>
                <select
                  value={selectedEmail}
                  onChange={(e) => setSelectedEmail(e.target.value)}
                  className="w-full px-3 py-2 font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                >
                  {AUTHORIZED_NOC_EMAILS.map((email) => (
                    <option key={email} value={email}>
                      {email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  NOC Security PIN (Default: <code>2026</code>)
                </label>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Enter NOC PIN or Admin Password..."
                  className="w-full px-3 py-2 font-mono bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-950/80 border border-rose-600 rounded-lg text-rose-200 font-medium text-xs">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20"
              >
                <Unlock className="w-3.5 h-3.5" />
                Unlock NOC Engineer Mode
              </button>
            </form>
          ) : (
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-200 font-semibold text-sm">
                  <Unlock className="w-4 h-4 text-emerald-400" />
                  NOC Engineer Mode Unlocked
                </div>
                <span className="font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-emerald-800/80 text-emerald-300">
                  {activeOperatorEmail}
                </span>
              </div>
              <p className="text-emerald-300/90">
                You have full access to record outages, update ticket statuses, view unmasked Account Numbers / Circuit IDs, and dispatch Telco emails.
              </p>

              <form
                onSubmit={handleUpdatePin}
                className="pt-2 border-t border-emerald-900/60 flex items-end gap-2"
              >
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-emerald-200 mb-1">
                    Change NOC Security PIN
                  </label>
                  <input
                    type="password"
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="New 4+ digit PIN"
                    className="w-full px-2.5 py-1.5 font-mono bg-slate-900 border border-emerald-700/60 rounded-lg text-slate-100 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-emerald-900 hover:bg-emerald-800 border border-emerald-700 text-emerald-100 font-semibold rounded-lg text-xs transition-colors"
                >
                  {pinSavedMsg ? 'PIN Updated!' : 'Save PIN'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  onLockDashboard();
                  onClose();
                }}
                className="w-full py-2 px-4 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                Lock Dashboard &amp; Mask Sensitive IDs (Wallboard Mode)
              </button>
            </div>
          )}

          {/* Layer 3: Built-In Security Summary */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5 text-slate-400">
            <div className="font-semibold text-slate-200">
              Active Security Protections:
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              <li>
                <strong>Wallboard Credential Masking:</strong> Masks PLDT Account Numbers and ETPI/Converge Circuit IDs (e.g. <code>Acct #•••••0277</code>) on public screens.
              </li>
              <li>
                <strong>Admin Approval System:</strong> Only approved operator accounts can modify link statuses or dispatch telco emails.
              </li>
              <li>
                <strong>One-Click Suspension:</strong> Administrators can immediately suspend compromised or offboarded contractor accounts.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
