import React, { useState } from 'react';
import { X, Plus, Trash2, Edit3, Check, Globe, Server, Radio, Shield, AlertCircle } from 'lucide-react';
import { CampusLink } from '../types/noc';

interface CampusTelcoManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add-branch' | 'edit-telco';
  campusName?: string;
  allLinks: CampusLink[];
  onRefreshState: () => Promise<void> | void;
}

const DEFAULT_TELCO_PROVIDERS = [
  'Eastern Communications',
  'Converge ICT',
  'PLDT Enterprise',
  'Starlink Enterprise',
  'Globe Telecom',
  'DITO Telecommunity',
];

const TELCO_DEFAULTS: Record<string, { email: string; hotline: string }> = {
  'Eastern Communications': { email: 'linkgold@etpi.com.ph', hotline: '+63 (2) 5300-7000' },
  'Converge ICT': { email: 'enterprisesupport@convergeict.com', hotline: '+63 (2) 8667-0848' },
  'PLDT Enterprise': { email: 'enterprisecare@pldt.com.ph', hotline: '+63 (2) 8888-1777' },
  'Starlink Enterprise': { email: 'enterprise-support@starlink.com', hotline: 'Starlink Priority Desk' },
  'Globe Telecom': { email: 'business-support@globe.com.ph', hotline: '+63 (2) 7730-1000' },
  'DITO Telecommunity': { email: 'enterprisesupport@dito.ph', hotline: '+63 (2) 8888-3486' },
};

export const CampusTelcoManageModal: React.FC<CampusTelcoManageModalProps> = ({
  isOpen,
  onClose,
  mode: initialMode,
  campusName: initialCampusName,
  allLinks,
  onRefreshState,
}) => {
  const [activeTab, setActiveTab] = useState<'add-branch' | 'edit-telco'>(initialMode);
  const [selectedCampus, setSelectedCampus] = useState<string>(initialCampusName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Branch Form State
  const [newCampusName, setNewCampusName] = useState('');
  const [newCampusCode, setNewCampusCode] = useState('');
  const [newRegion, setNewRegion] = useState('Metro Manila');
  const [newBuilding, setNewBuilding] = useState('');
  
  // Link 1 (Primary)
  const [l1Provider, setL1Provider] = useState('Eastern Communications');
  const [l1Role, setL1Role] = useState<'Dedicated Internet' | 'Metro-E Transport' | 'LEO Satellite Backup'>('Dedicated Internet');
  const [l1Name, setL1Name] = useState('Eastern Internet DIA');
  const [l1Bandwidth, setL1Bandwidth] = useState(500);
  const [l1Cid, setL1Cid] = useState('');
  const [l1Acct, setL1Acct] = useState('N/A (Circuit ID)');

  // Link 2 (Optional)
  const [includeSecondLink, setIncludeSecondLink] = useState(false);
  const [l2Provider, setL2Provider] = useState('Converge ICT');
  const [l2Role, setL2Role] = useState<'Dedicated Internet' | 'Metro-E Transport' | 'LEO Satellite Backup'>('Metro-E Transport');
  const [l2Name, setL2Name] = useState('Converge Transport');
  const [l2Bandwidth, setL2Bandwidth] = useState(500);
  const [l2Cid, setL2Cid] = useState('');
  const [l2Acct, setL2Acct] = useState('N/A (Circuit ID)');

  // Editing existing link
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editProvider, setEditProvider] = useState('');
  const [editLinkName, setEditLinkName] = useState('');
  const [editRole, setEditRole] = useState<'Dedicated Internet' | 'Metro-E Transport' | 'LEO Satellite Backup'>('Dedicated Internet');
  const [editBandwidth, setEditBandwidth] = useState(500);
  const [editCid, setEditCid] = useState('');
  const [editAcct, setEditAcct] = useState('');
  const [editInterface, setEditInterface] = useState('');
  const [editIp, setEditIp] = useState('');
  const [editNocEmail, setEditNocEmail] = useState('');
  const [editHotline, setEditHotline] = useState('');

  // Add Link to existing campus state
  const [showAddLinkToExisting, setShowAddLinkToExisting] = useState(false);
  const [addLinkProvider, setAddLinkProvider] = useState('Starlink Enterprise');
  const [addLinkRole, setAddLinkRole] = useState<'Dedicated Internet' | 'Metro-E Transport' | 'LEO Satellite Backup'>('LEO Satellite Backup');
  const [addLinkName, setAddLinkName] = useState('Starlink Backup');
  const [addLinkBw, setAddLinkBw] = useState(250);
  const [addLinkCid, setAddLinkCid] = useState('');
  const [addLinkAcct, setAddLinkAcct] = useState('Starlink');

  if (!isOpen) return null;

  // Extract unique campus names
  const campusList = Array.from(new Set(allLinks.map((l) => l.campusName)));
  const currentCampusName = selectedCampus || (campusList.length > 0 ? campusList[0] : '');
  const campusLinks = allLinks.filter((l) => l.campusName === currentCampusName);

  const startEditLink = (l: CampusLink) => {
    setEditingLinkId(l.id);
    setEditProvider(l.provider);
    setEditLinkName(l.linkName);
    setEditRole(l.linkRole);
    setEditBandwidth(l.bandwidthMbps);
    setEditCid(l.circuitId);
    setEditAcct(l.accountNumber);
    setEditInterface(l.interfaceName);
    setEditIp(l.bgpPeerIp);
    setEditNocEmail(l.providerNocEmail);
    setEditHotline(l.providerHotline);
    setFeedback(null);
  };

  const handleSaveEditedLink = async (linkId: string) => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/campuses/links/${linkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: editProvider,
          linkName: editLinkName,
          linkRole: editRole,
          bandwidthMbps: editBandwidth,
          circuitId: editCid,
          accountNumber: editAcct,
          interfaceName: editInterface,
          bgpPeerIp: editIp,
          providerNocEmail: editNocEmail,
          providerHotline: editHotline,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update circuit details');
      }

      setFeedback({ type: 'success', message: 'Telco circuit details updated successfully!' });
      setEditingLinkId(null);
      await onRefreshState();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error updating telco details' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLink = async (linkId: string, linkName: string) => {
    if (!window.confirm(`Are you sure you want to remove circuit "${linkName}"?`)) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/campuses/links/${linkId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete circuit');
      setFeedback({ type: 'success', message: `Circuit ${linkName} removed.` });
      await onRefreshState();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error removing circuit' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBranch = async (cName: string) => {
    if (!window.confirm(`WARNING: Are you sure you want to completely remove campus "${cName}" and all its circuits?`)) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/campuses/branch/${encodeURIComponent(cName)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete campus branch');
      setFeedback({ type: 'success', message: `Campus "${cName}" removed.` });
      setSelectedCampus('');
      await onRefreshState();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error removing campus' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddLinkToExisting = async () => {
    if (!currentCampusName) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/campuses/${encodeURIComponent(currentCampusName)}/add-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: addLinkProvider,
          linkRole: addLinkRole,
          linkName: addLinkName || `${addLinkProvider} Link`,
          bandwidthMbps: addLinkBw,
          circuitId: addLinkCid || `CID-${Math.floor(100000 + Math.random() * 900000)}`,
          accountNumber: addLinkAcct || 'N/A',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add circuit');
      }

      setFeedback({ type: 'success', message: `New circuit added to ${currentCampusName}!` });
      setShowAddLinkToExisting(false);
      setAddLinkCid('');
      await onRefreshState();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error adding circuit' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNewBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampusName.trim()) {
      setFeedback({ type: 'error', message: 'Campus Name is required' });
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);

    const linksPayload = [
      {
        provider: l1Provider,
        linkRole: l1Role,
        linkName: l1Name || `${l1Provider} ${l1Role === 'Dedicated Internet' ? 'Internet' : 'Transport'}`,
        bandwidthMbps: l1Bandwidth,
        circuitId: l1Cid || `CID-${Math.floor(100000 + Math.random() * 900000)}`,
        accountNumber: l1Acct || 'N/A (Circuit ID)',
      },
    ];

    if (includeSecondLink) {
      linksPayload.push({
        provider: l2Provider,
        linkRole: l2Role,
        linkName: l2Name || `${l2Provider} ${l2Role === 'Dedicated Internet' ? 'Internet' : 'Transport'}`,
        bandwidthMbps: l2Bandwidth,
        circuitId: l2Cid || `CID-${Math.floor(100000 + Math.random() * 900000)}`,
        accountNumber: l2Acct || 'N/A (Circuit ID)',
      });
    }

    try {
      const res = await fetch('/api/campuses/new-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campusName: newCampusName.trim(),
          campusCode: newCampusCode.trim() || undefined,
          region: newRegion,
          building: newBuilding.trim() || `${newCampusName.trim()} Sanctuary & IT Rack`,
          links: linksPayload,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add campus');
      }

      setFeedback({ type: 'success', message: `Branch "${newCampusName}" created successfully!` });
      setNewCampusName('');
      setNewCampusCode('');
      setNewBuilding('');
      setL1Cid('');
      setL2Cid('');
      setIncludeSecondLink(false);
      await onRefreshState();
      setTimeout(() => {
        setActiveTab('edit-telco');
        setSelectedCampus(newCampusName.trim());
      }, 800);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error creating campus branch' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Campus &amp; Telco Network Management
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  NOC ADMIN
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Add new Cathedral of Praise campuses, edit telco circuits, or reconfigure WAN lines.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 pt-2 text-xs font-semibold gap-2">
          <button
            onClick={() => {
              setActiveTab('edit-telco');
              setFeedback(null);
            }}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'edit-telco'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Telco &amp; Circuits ({campusList.length} Campuses)
          </button>
          <button
            onClick={() => {
              setActiveTab('add-branch');
              setFeedback(null);
            }}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'add-branch'
                ? 'border-cyan-400 text-cyan-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            ➕ Add New Campus / Branch
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-5 mt-4 p-3 rounded-lg text-xs flex items-center gap-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800'
                : 'bg-red-950/50 text-red-300 border-red-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Tab 1: Edit Existing Campus & Telco Details */}
        {activeTab === 'edit-telco' && (
          <div className="p-5 overflow-y-auto space-y-5">
            {/* Campus Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              <div className="flex-1">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Select Campus / Branch to Manage:
                </label>
                <select
                  value={currentCampusName}
                  onChange={(e) => {
                    setSelectedCampus(e.target.value);
                    setEditingLinkId(null);
                    setShowAddLinkToExisting(false);
                    setFeedback(null);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400"
                >
                  {campusList.map((cName) => (
                    <option key={cName} value={cName}>
                      {cName} ({allLinks.filter((l) => l.campusName === cName).length} links)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddLinkToExisting(!showAddLinkToExisting)}
                  className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-500/30 flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Circuit Link
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteBranch(currentCampusName)}
                  className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 flex items-center gap-1.5 transition-colors"
                  title="Remove this entire campus branch"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Branch
                </button>
              </div>
            </div>

            {/* Add Circuit Link to Selected Campus Form */}
            {showAddLinkToExisting && (
              <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    ➕ Add Additional Circuit to {currentCampusName}
                  </h4>
                  <button
                    onClick={() => setShowAddLinkToExisting(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    ✕ Cancel
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Telco Provider</label>
                    <select
                      value={addLinkProvider}
                      onChange={(e) => {
                        setAddLinkProvider(e.target.value);
                        setAddLinkName(`${e.target.value} ${addLinkRole === 'Dedicated Internet' ? 'Internet' : 'Transport'}`);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      {DEFAULT_TELCO_PROVIDERS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Link Role</label>
                    <select
                      value={addLinkRole}
                      onChange={(e: any) => setAddLinkRole(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="Dedicated Internet">Dedicated Internet</option>
                      <option value="Metro-E Transport">Metro-E Transport</option>
                      <option value="LEO Satellite Backup">LEO Satellite Backup</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Bandwidth (Mbps)</label>
                    <input
                      type="number"
                      value={addLinkBw}
                      onChange={(e) => setAddLinkBw(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Link Display Name</label>
                    <input
                      type="text"
                      value={addLinkName}
                      onChange={(e) => setAddLinkName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Circuit ID (CID)</label>
                    <input
                      type="text"
                      placeholder="e.g. 930473671 / MC12984"
                      value={addLinkCid}
                      onChange={(e) => setAddLinkCid(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Account Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 657871060 or N/A"
                      value={addLinkAcct}
                      onChange={(e) => setAddLinkAcct(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleAddLinkToExisting}
                    className="px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors"
                  >
                    {isSubmitting ? 'Saving...' : 'Save New Circuit'}
                  </button>
                </div>
              </div>
            )}

            {/* List of Circuits for Selected Campus */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Active Telco Circuits for {currentCampusName} ({campusLinks.length}):
              </h3>

              {campusLinks.map((link) => {
                const isEditing = editingLinkId === link.id;

                if (isEditing) {
                  return (
                    <div
                      key={link.id}
                      className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-3 shadow-lg"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-xs font-bold text-cyan-300">
                          Editing: {link.linkName} ({link.id})
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingLinkId(null)}
                          className="text-slate-400 hover:text-white text-xs"
                        >
                          ✕ Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Telco Provider</label>
                          <input
                            type="text"
                            value={editProvider}
                            onChange={(e) => setEditProvider(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Link Name</label>
                          <input
                            type="text"
                            value={editLinkName}
                            onChange={(e) => setEditLinkName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Link Role</label>
                          <select
                            value={editRole}
                            onChange={(e: any) => setEditRole(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="Dedicated Internet">Dedicated Internet</option>
                            <option value="Metro-E Transport">Metro-E Transport</option>
                            <option value="LEO Satellite Backup">LEO Satellite Backup</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Circuit ID (CID)</label>
                          <input
                            type="text"
                            value={editCid}
                            onChange={(e) => setEditCid(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Account Number</label>
                          <input
                            type="text"
                            value={editAcct}
                            onChange={(e) => setEditAcct(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Bandwidth (Mbps)</label>
                          <input
                            type="number"
                            value={editBandwidth}
                            onChange={(e) => setEditBandwidth(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Interface Name</label>
                          <input
                            type="text"
                            value={editInterface}
                            onChange={(e) => setEditInterface(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">BGP Peer / Gateway IP</label>
                          <input
                            type="text"
                            value={editIp}
                            onChange={(e) => setEditIp(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Provider NOC Email</label>
                          <input
                            type="email"
                            value={editNocEmail}
                            onChange={(e) => setEditNocEmail(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingLinkId(null)}
                          className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleSaveEditedLink(link.id)}
                          className="px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400"
                        >
                          {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={link.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5 text-slate-400">
                        {link.linkRole === 'LEO Satellite Backup' ? (
                          <Radio className="w-4 h-4 text-emerald-400" />
                        ) : link.linkRole === 'Metro-E Transport' ? (
                          <Server className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Globe className="w-4 h-4 text-cyan-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{link.linkName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {link.provider}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                              link.status === 'Operational'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {link.status}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>CID: <strong className="text-slate-200">{link.circuitId}</strong></span>
                          <span>Acct: <strong className="text-slate-200">{link.accountNumber}</strong></span>
                          <span>BW: <strong className="text-slate-200">{link.bandwidthMbps} Mbps</strong></span>
                          <span>IP: <strong className="text-slate-200">{link.bgpPeerIp}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditLink(link)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Edit3 className="w-3 h-3 text-cyan-400" />
                        Edit Details
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLink(link.id, link.linkName)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete Circuit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Add New Campus Branch */}
        {activeTab === 'add-branch' && (
          <form onSubmit={handleCreateNewBranch} className="p-5 overflow-y-auto space-y-5">
            {/* Campus Identity */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                1. Campus / Branch Identity
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1 font-semibold">
                    Campus Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Iloilo Campus, Tagaytay Campus"
                    value={newCampusName}
                    onChange={(e) => {
                      setNewCampusName(e.target.value);
                      if (!newCampusCode) {
                        const clean = e.target.value.replace(/\s+campus/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                        setNewCampusCode(`COP-${clean}`);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1 font-semibold">
                    Campus Code (Router Prefix)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. COP-ILOILO"
                    value={newCampusCode}
                    onChange={(e) => setNewCampusCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1 font-semibold">
                    Geographic Region
                  </label>
                  <select
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Metro Manila">Metro Manila</option>
                    <option value="South Luzon (Laguna / Batangas)">South Luzon (Laguna / Batangas)</option>
                    <option value="Cavite">Cavite</option>
                    <option value="Central Luzon (Bulacan / Pampanga)">Central Luzon (Bulacan / Pampanga)</option>
                    <option value="North Luzon (Ilocos / Isabela)">North Luzon (Ilocos / Isabela)</option>
                    <option value="Visayas (Cebu / Iloilo)">Visayas (Cebu / Iloilo)</option>
                    <option value="Mindanao (Davao / Gensan)">Mindanao (Davao / Gensan)</option>
                    <option value="National Regional Branch">National Regional Branch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1 font-semibold">
                    Facility / Sanctuary Rack
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sanctuary Broadcast Rack & IT Core"
                    value={newBuilding}
                    onChange={(e) => setNewBuilding(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Primary Telco Link */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                2. Primary Telco Circuit Link
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Telco Provider</label>
                  <select
                    value={l1Provider}
                    onChange={(e) => {
                      setL1Provider(e.target.value);
                      setL1Name(`${e.target.value} ${l1Role === 'Dedicated Internet' ? 'Internet' : 'Transport'}`);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    {DEFAULT_TELCO_PROVIDERS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Link Role</label>
                  <select
                    value={l1Role}
                    onChange={(e: any) => {
                      setL1Role(e.target.value);
                      setL1Name(`${l1Provider} ${e.target.value === 'Dedicated Internet' ? 'Internet' : 'Transport'}`);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="Dedicated Internet">Dedicated Internet</option>
                    <option value="Metro-E Transport">Metro-E Transport</option>
                    <option value="LEO Satellite Backup">LEO Satellite Backup</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Bandwidth (Mbps)</label>
                  <input
                    type="number"
                    value={l1Bandwidth}
                    onChange={(e) => setL1Bandwidth(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Link Name</label>
                  <input
                    type="text"
                    value={l1Name}
                    onChange={(e) => setL1Name(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Circuit ID (CID)</label>
                  <input
                    type="text"
                    placeholder="e.g. 930473671 / MC12984"
                    value={l1Cid}
                    onChange={(e) => setL1Cid(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 657871060 or N/A"
                    value={l1Acct}
                    onChange={(e) => setL1Acct(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Optional Secondary Telco Link */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                  3. Secondary / Redundant Telco Link (Optional)
                </h3>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-cyan-400 font-semibold">
                  <input
                    type="checkbox"
                    checked={includeSecondLink}
                    onChange={(e) => setIncludeSecondLink(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  Enable 2nd Circuit
                </label>
              </div>

              {includeSecondLink && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Telco Provider</label>
                    <select
                      value={l2Provider}
                      onChange={(e) => {
                        setL2Provider(e.target.value);
                        setL2Name(`${e.target.value} ${l2Role === 'Dedicated Internet' ? 'Internet' : 'Transport'}`);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      {DEFAULT_TELCO_PROVIDERS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Link Role</label>
                    <select
                      value={l2Role}
                      onChange={(e: any) => {
                        setL2Role(e.target.value);
                        setL2Name(`${l2Provider} ${e.target.value === 'Dedicated Internet' ? 'Internet' : 'Transport'}`);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="Metro-E Transport">Metro-E Transport</option>
                      <option value="Dedicated Internet">Dedicated Internet</option>
                      <option value="LEO Satellite Backup">LEO Satellite Backup</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Bandwidth (Mbps)</label>
                    <input
                      type="number"
                      value={l2Bandwidth}
                      onChange={(e) => setL2Bandwidth(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Link Name</label>
                    <input
                      type="text"
                      value={l2Name}
                      onChange={(e) => setL2Name(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Circuit ID (CID)</label>
                    <input
                      type="text"
                      placeholder="e.g. CNV-METROE-9921"
                      value={l2Cid}
                      onChange={(e) => setL2Cid(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Account Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 657871060 or N/A"
                      value={l2Acct}
                      onChange={(e) => setL2Acct(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  'Creating Branch...'
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create Campus Branch
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
