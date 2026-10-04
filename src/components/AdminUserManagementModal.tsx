import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { NocUser, UserRole, UserStatus } from '../types/noc';
import { CopLogo } from './CopLogo';

interface AdminUserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: NocUser | null;
  users: NocUser[];
  onRefreshUsers: () => void;
  onApproveUser: (userId: string) => Promise<void>;
  onSuspendUser: (userId: string, reason?: string) => Promise<void>;
  onReactivateUser: (userId: string) => Promise<void>;
  onChangeRole: (userId: string, role: UserRole) => Promise<void>;
  onResetPassword: (userId: string, newPass: string) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onCreateUser: (newUser: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    department: string;
    phone?: string;
  }) => Promise<void>;
}

export const AdminUserManagementModal: React.FC<
  AdminUserManagementModalProps
> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  onRefreshUsers,
  onApproveUser,
  onSuspendUser,
  onReactivateUser,
  onChangeRole,
  onResetPassword,
  onDeleteUser,
  onCreateUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [isCreating, setIsCreating] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // New User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('OPERATOR');
  const [newDept, setNewDept] = useState('Cathedral of Praise IT');
  const [newPhone, setNewPhone] = useState('');

  // Password Reset Prompt State
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Suspend Prompt State
  const [suspendingUserId, setSuspendingUserId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState(
    'Account access suspended per NOC Administrator policy.'
  );

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => {
      setActionNotice((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      showToast('Please provide Name, Email, and Password.');
      return;
    }
    try {
      await onCreateUser({
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword.trim(),
        role: newRole,
        department: newDept.trim(),
        phone: newPhone.trim(),
      });
      setIsCreating(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      showToast(`User ${newEmail} created and approved successfully.`);
      onRefreshUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to create user');
    }
  };

  const handleExecuteSuspend = async (userId: string) => {
    try {
      await onSuspendUser(userId, suspendReason);
      setSuspendingUserId(null);
      showToast('User has been suspended immediately.');
      onRefreshUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to suspend user');
    }
  };

  const handleExecuteResetPassword = async (userId: string) => {
    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 6) {
      showToast('Password must be at least 6 characters.');
      return;
    }
    try {
      await onResetPassword(userId, newPasswordInput.trim());
      setResettingUserId(null);
      setNewPasswordInput('');
      showToast('Password reset successfully.');
      onRefreshUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password');
    }
  };

  const filteredUsers = users.filter((u) => {
    if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q)
    );
  });

  const pendingCount = users.filter((u) => u.status === 'PENDING').length;
  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const suspendedCount = users.filter((u) => u.status === 'SUSPENDED').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <CopLogo size={36} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  NOC User &amp; Access Control Administration
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cathedral of Praise Network Operations — Approve registration requests, suspend accounts, and manage operator roles.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Notice Banner */}
        {actionNotice && (
          <div className="px-6 py-2.5 bg-indigo-950/90 border-b border-indigo-800/80 text-indigo-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <button
              onClick={() => setActionNotice(null)}
              className="text-indigo-400 hover:text-indigo-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-slate-200">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium text-slate-400">
                  Total Accounts
                </div>
                <div className="text-2xl font-bold font-mono text-slate-100 mt-0.5">
                  {users.length}
                </div>
              </div>
              <div className="p-2 bg-slate-800/60 rounded-lg text-slate-300">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
              className={`p-3.5 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                pendingCount > 0
                  ? 'bg-amber-950/40 border-amber-600/50 hover:border-amber-500'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div>
                <div className="text-[11px] font-medium text-amber-400 flex items-center gap-1">
                  Pending Approvals
                  {pendingCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </div>
                <div className="text-2xl font-bold font-mono text-amber-300 mt-0.5">
                  {pendingCount}
                </div>
              </div>
              <div className="p-2 bg-amber-500/20 text-amber-300 rounded-lg">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
              className="p-3.5 bg-slate-950/60 border border-slate-800 hover:border-emerald-600/50 rounded-xl flex items-center justify-between cursor-pointer transition-all"
            >
              <div>
                <div className="text-[11px] font-medium text-emerald-400">
                  Active Operators
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-300 mt-0.5">
                  {activeCount}
                </div>
              </div>
              <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === 'SUSPENDED' ? 'ALL' : 'SUSPENDED')}
              className={`p-3.5 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                suspendedCount > 0
                  ? 'bg-rose-950/40 border-rose-600/50 hover:border-rose-500'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div>
                <div className="text-[11px] font-medium text-rose-400">
                  Suspended Accounts
                </div>
                <div className="text-2xl font-bold font-mono text-rose-300 mt-0.5">
                  {suspendedCount}
                </div>
              </div>
              <div className="p-2 bg-rose-500/20 text-rose-300 rounded-lg">
                <UserX className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Pending Alert Callout if pending requests exist */}
          {pendingCount > 0 && (
            <div className="p-4 bg-amber-950/40 border border-amber-600/60 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="font-semibold text-amber-200 text-sm">
                    {pendingCount} User Registration{pendingCount > 1 ? 's' : ''} Awaiting Approval
                  </div>
                  <p className="text-xs text-amber-300/80">
                    Staff members have requested access to the Cathedral of Praise NOC. Review and click "Approve" below to grant dashboard access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusFilter('PENDING')}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shrink-0"
              >
                View Pending Users
              </button>
            </div>
          )}

          {/* Toolbar: Search, Filters, and Add User Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2.5 w-full">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Statuses ({users.length})</option>
                <option value="PENDING">Pending Only ({pendingCount})</option>
                <option value="ACTIVE">Active Only ({activeCount})</option>
                <option value="SUSPENDED">Suspended Only ({suspendedCount})</option>
              </select>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admins Only</option>
                <option value="OPERATOR">Operators Only</option>
                <option value="VIEWER">Viewers Only</option>
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onRefreshUsers}
                title="Refresh user list"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(!isCreating)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20"
              >
                <UserPlus className="w-4 h-4" />
                {isCreating ? 'Cancel Creation' : 'Add New User'}
              </button>
            </div>
          </div>

          {/* Create User Form Drawer/Panel */}
          {isCreating && (
            <form
              onSubmit={handleCreateSubmit}
              className="p-5 bg-slate-950/90 border border-indigo-500/40 rounded-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
                  <UserPlus className="w-4 h-4" />
                  Provision Pre-Approved NOC User
                </div>
                <span className="text-[11px] text-slate-400">
                  User will be created in ACTIVE status with credentials immediately.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bro. Nathan Reyes"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. nreyes@cathedralofpraise.com.ph"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Initial Password * (min 6 chars)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Set secure password..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Access Role *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="OPERATOR">NOC Operator (Can edit tickets &amp; dispatch emails)</option>
                    <option value="ADMIN">Administrator (Full rights + User approvals)</option>
                    <option value="VIEWER">Read-Only Viewer (Wallboard monitoring only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Department / Campus
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Main Campus IT Systems"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Contact Phone (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="+63 9XX XXX XXXX"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg"
                >
                  Confirm &amp; Provision User
                </button>
              </div>
            </form>
          )}

          {/* Reset Password Modal / Dialog */}
          {resettingUserId && (
            <div className="p-4 bg-slate-950 border border-amber-500/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                  <KeyRound className="w-4 h-4" />
                  Reset Password for {users.find((u) => u.id === resettingUserId)?.name}
                </div>
                <button
                  onClick={() => setResettingUserId(null)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Enter a new password for {users.find((u) => u.id === resettingUserId)?.email}. They can use this immediately to log in.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="New password (min 6 characters)..."
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleExecuteResetPassword(resettingUserId)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
                >
                  Update Password
                </button>
              </div>
            </div>
          )}

          {/* Suspend Confirmation Dialog */}
          {suspendingUserId && (
            <div className="p-4 bg-rose-950/50 border border-rose-600/60 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-300 font-semibold text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  Suspend Access for {users.find((u) => u.id === suspendingUserId)?.name}
                </div>
                <button
                  onClick={() => setSuspendingUserId(null)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-rose-200/90">
                Suspending this user will immediately revoke their NOC dashboard access. They will not be able to log in until reactivated.
              </p>
              <div className="space-y-2">
                <label className="block text-[11px] text-slate-400">
                  Suspension Reason (Logged in Audit Trail):
                </label>
                <input
                  type="text"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. End of contractor term, role transition, or security review."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSuspendingUserId(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteSuspend(suspendingUserId)}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg"
                >
                  Confirm Suspension
                </button>
              </div>
            </div>
          )}

          {/* User Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Operator / User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Department &amp; Contact</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No users match the current search or filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isSelf = currentUser?.id === user.id;
                      return (
                        <tr
                          key={user.id}
                          className={`hover:bg-slate-900/50 transition-colors ${
                            user.status === 'PENDING'
                              ? 'bg-amber-950/15'
                              : user.status === 'SUSPENDED'
                              ? 'bg-rose-950/10'
                              : ''
                          }`}
                        >
                          {/* User info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                                  user.role === 'ADMIN'
                                    ? 'bg-indigo-600 text-white'
                                    : user.role === 'OPERATOR'
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                {user.name.slice(0, 2)}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                                  {user.name}
                                  {isSelf && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role with selector */}
                          <td className="py-3.5 px-4">
                            <select
                              value={user.role}
                              disabled={isSelf}
                              onChange={(e) =>
                                onChangeRole(user.id, e.target.value as UserRole)
                              }
                              className={`px-2 py-1 rounded text-[11px] font-semibold border focus:outline-none transition-colors ${
                                user.role === 'ADMIN'
                                  ? 'bg-indigo-950/60 border-indigo-600/40 text-indigo-300'
                                  : user.role === 'OPERATOR'
                                  ? 'bg-cyan-950/60 border-cyan-600/40 text-cyan-300'
                                  : 'bg-slate-800/80 border-slate-700 text-slate-300'
                              }`}
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="OPERATOR">OPERATOR</option>
                              <option value="VIEWER">VIEWER</option>
                            </select>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            {user.status === 'ACTIVE' && (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 w-max">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  ACTIVE
                                </span>
                                {user.approvedBy && (
                                  <span className="text-[9px] text-slate-500 mt-0.5">
                                    by {user.approvedBy.split(' ')[0]}
                                  </span>
                                )}
                              </div>
                            )}

                            {user.status === 'PENDING' && (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 w-max animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  PENDING APPROVAL
                                </span>
                                <span className="text-[9px] text-amber-400/80 mt-0.5">
                                  Awaiting Admin Action
                                </span>
                              </div>
                            )}

                            {user.status === 'SUSPENDED' && (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 w-max">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                  SUSPENDED
                                </span>
                                {user.suspendedReason && (
                                  <span
                                    className="text-[9px] text-rose-400/80 mt-0.5 truncate max-w-[140px]"
                                    title={user.suspendedReason}
                                  >
                                    {user.suspendedReason}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Department & Contact */}
                          <td className="py-3.5 px-4">
                            <div className="text-slate-300">{user.department}</div>
                            {user.phone && (
                              <div className="text-[10px] font-mono text-slate-500">
                                {user.phone}
                              </div>
                            )}
                          </td>

                          {/* Last Active */}
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                            {user.lastLoginAt
                              ? new Date(user.lastLoginAt).toLocaleDateString(
                                  'en-US',
                                  {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )
                              : 'Never'}
                          </td>

                          {/* Admin Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Approve Button for PENDING */}
                              {user.status === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await onApproveUser(user.id);
                                    showToast(`Approved ${user.name} (${user.email}). Account is now ACTIVE.`);
                                    onRefreshUsers();
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-sm"
                                  title="Approve registration"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                              )}

                              {/* Suspend Button for ACTIVE */}
                              {user.status === 'ACTIVE' && !isSelf && (
                                <button
                                  type="button"
                                  onClick={() => setSuspendingUserId(user.id)}
                                  className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-700/60 text-rose-300 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                                  title="Suspend access"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  Suspend
                                </button>
                              )}

                              {/* Reactivate Button for SUSPENDED */}
                              {user.status === 'SUSPENDED' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await onReactivateUser(user.id);
                                    showToast(`Reactivated ${user.name} (${user.email}).`);
                                    onRefreshUsers();
                                  }}
                                  className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                                  title="Reactivate account"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Reactivate
                                </button>
                              )}

                              {/* Reset Password */}
                              <button
                                type="button"
                                onClick={() => setResettingUserId(user.id)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 rounded transition-colors"
                                title="Reset password"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete User */}
                              {!isSelf && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (
                                      window.confirm(
                                        `Are you sure you want to delete user ${user.name} (${user.email})?`
                                      )
                                    ) {
                                      await onDeleteUser(user.id);
                                      showToast(`User ${user.email} deleted.`);
                                      onRefreshUsers();
                                    }
                                  }}
                                  className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded transition-colors"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Policy & Security Note */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-start gap-3 text-xs text-slate-400">
            <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-slate-200">
                Cathedral of Praise NOC Access Security Policy
              </div>
              <p>
                Only authenticated operators with an approved status may modify circuit records, simulate outages, or dispatch automated escalation notices to Telco providers (PLDT, Eastern, Converge, Starlink). Suspending an account terminates all active operator sessions immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
