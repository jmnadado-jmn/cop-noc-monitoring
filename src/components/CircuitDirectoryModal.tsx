import React, { useState } from 'react';
import { Check, Save, Search, X } from 'lucide-react';
import { CampusLink } from '../types/noc';
import { CopLogo } from './CopLogo';

interface CircuitDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  campuses: CampusLink[];
  onUpdateCircuit: (
    id: string,
    updates: Partial<CampusLink>
  ) => Promise<void>;
}

export const CircuitDirectoryModal: React.FC<CircuitDirectoryModalProps> = ({
  isOpen,
  onClose,
  campuses,
  onUpdateCircuit,
}) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [circuitIdInput, setCircuitIdInput] = useState('');
  const [accountInput, setAccountInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = campuses.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.campusName.toLowerCase().includes(q) ||
      c.linkName.toLowerCase().includes(q) ||
      c.circuitId.toLowerCase().includes(q) ||
      c.provider.toLowerCase().includes(q)
    );
  });

  const startEdit = (c: CampusLink) => {
    setEditingId(c.id);
    setCircuitIdInput(c.circuitId);
    setAccountInput(c.accountNumber);
    setEmailInput(c.providerNocEmail);
  };

  const handleSave = async (id: string) => {
    await onUpdateCircuit(id, {
      circuitId: circuitIdInput,
      accountNumber: accountInput,
      providerNocEmail: emailInput,
    });
    setEditingId(null);
    setSavedId(id);
    setTimeout(() => setSavedId(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="circuit-directory-title"
    >
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <CopLogo size={36} />
            <div>
              <h2
                id="circuit-directory-title"
                className="text-base font-semibold text-slate-100"
              >
                Cathedral of Praise — Internet &amp; Transport Circuit ID Directory (35 Links)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Update any Circuit ID, Account Number, or Provider NOC Email here. These IDs automatically populate incident tickets, log parsers, and Telco outage emails.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-md transition-colors"
            aria-label="Close Circuit Directory"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter campus, link, or circuit ID..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="text-xs text-slate-400 font-mono tabular-nums">
            Showing {filtered.length} of {campuses.length} links
          </div>
        </div>

        <div className="max-h-[68vh] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-xs font-semibold text-slate-400 sticky top-0">
                <th className="py-3 px-5">Campus</th>
                <th className="py-3 px-4">Link Name &amp; Role</th>
                <th className="py-3 px-4">Internet / Transport Circuit ID</th>
                <th className="py-3 px-4">Account Number</th>
                <th className="py-3 px-4">Provider NOC Email</th>
                <th className="py-3 px-5 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {filtered.map((c) => {
                const isEditing = editingId === c.id;
                return (
                  <tr key={c.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-5 font-semibold text-slate-100">
                      {c.campusName}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">
                        {c.linkName}
                      </div>
                      <div className="text-slate-400">{c.linkRole}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {isEditing ? (
                        <input
                          type="text"
                          value={circuitIdInput}
                          onChange={(e) => setCircuitIdInput(e.target.value)}
                          className="w-full px-2 py-1 text-xs font-mono bg-slate-950 border border-slate-600 rounded text-slate-200"
                        />
                      ) : (
                        <span className="font-semibold text-slate-200">
                          {c.circuitId}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {isEditing ? (
                        <input
                          type="text"
                          value={accountInput}
                          onChange={(e) => setAccountInput(e.target.value)}
                          className="w-full px-2 py-1 text-xs font-mono bg-slate-950 border border-slate-600 rounded text-slate-200"
                        />
                      ) : (
                        <span className="text-slate-400">{c.accountNumber}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {isEditing ? (
                        <input
                          type="text"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="w-full px-2 py-1 text-xs font-mono bg-slate-950 border border-slate-600 rounded text-slate-200"
                        />
                      ) : (
                        <span className="text-slate-400">{c.providerNocEmail}</span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleSave(c.id)}
                            className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-500 flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 text-xs font-semibold bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {savedId === c.id && (
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Saved
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => startEdit(c)}
                            className="px-2.5 py-1 text-xs font-semibold bg-slate-800 text-slate-300 rounded hover:bg-slate-700 hover:text-white"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
