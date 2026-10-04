import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, Copy, Mail, Send, X } from 'lucide-react';
import {
  EscalationLevel,
  IncidentStatus,
  IncidentTicket,
} from '../types/noc';
import { buildProviderDispatchEmail } from '../utils/logParser';

interface IncidentDetailDrawerProps {
  incident: IncidentTicket | null;
  onClose: () => void;
  onUpdateIncident: (
    id: string,
    updates: Partial<IncidentTicket> & {
      actor?: string;
      updateNote?: string;
      sendProviderFollowUp?: boolean;
    }
  ) => Promise<void>;
}

export const IncidentDetailDrawer: React.FC<IncidentDetailDrawerProps> = ({
  incident,
  onClose,
  onUpdateIncident,
}) => {
  const [problemSummary, setProblemSummary] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [telcoTicketNumber, setTelcoTicketNumber] = useState('');
  const [status, setStatus] = useState<IncidentStatus>('Pending');
  const [reportedToTelco, setReportedToTelco] = useState(false);
  const [expectedResolutionAt, setExpectedResolutionAt] = useState('');
  const [etrNotes, setEtrNotes] = useState('');
  const [escalationLevel, setEscalationLevel] = useState<EscalationLevel>(
    'L1 - Campus NOC'
  );
  const [updateNote, setUpdateNote] = useState('');
  const [actor] = useState('Cathedral of Praise NOC Team');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    if (!incident) return;
    setProblemSummary(incident.problemSummary);
    setTicketNumber(incident.ticketNumber);
    setTelcoTicketNumber(incident.telcoTicketNumber);
    setStatus(incident.status);
    setReportedToTelco(incident.reportedToTelco);

    if (incident.expectedResolutionAt) {
      const dt = new Date(incident.expectedResolutionAt);
      const pad = (n: number) => String(n).padStart(2, '0');
      setExpectedResolutionAt(
        `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
      );
    } else {
      setExpectedResolutionAt('');
    }
    setEtrNotes(incident.etrNotes);
    setEscalationLevel(incident.escalationLevel);
    setUpdateNote('');
  }, [incident]);

  if (!incident) return null;

  const handleSave = async (
    sendFollowUp = false,
    overrideStatus?: IncidentStatus
  ) => {
    const nextStatus = overrideStatus || status;
    setIsSaving(true);
    try {
      await onUpdateIncident(incident.id, {
        problemSummary,
        ticketNumber,
        telcoTicketNumber,
        status: nextStatus,
        reportedToTelco: sendFollowUp ? true : reportedToTelco,
        expectedResolutionAt: expectedResolutionAt
          ? new Date(expectedResolutionAt).toISOString()
          : incident.expectedResolutionAt,
        etrNotes,
        escalationLevel,
        actor,
        updateNote:
          updateNote.trim() ||
          (overrideStatus === 'Resolved'
            ? `Outage resolved — ${incident.campusName} (${incident.linkName}) restored to GREEN.`
            : sendFollowUp
              ? `Sent ETR follow-up chaser to ${incident.provider}`
              : undefined),
        sendProviderFollowUp: sendFollowUp,
      });
      if (overrideStatus) {
        setStatus(overrideStatus);
      }
      setUpdateNote('');
    } finally {
      setIsSaving(false);
    }
  };

  const emailDraft = buildProviderDispatchEmail(
    {
      ...incident,
      problemSummary,
      ticketNumber,
      telcoTicketNumber,
      expectedResolutionAt: expectedResolutionAt
        ? new Date(expectedResolutionAt).toISOString()
        : incident.expectedResolutionAt,
    },
    'Telco Escalation Chaser'
  );

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(
      `To: ${emailDraft.to}\nCC: ${emailDraft.cc}\nSubject: ${emailDraft.subject}\n\n${emailDraft.body}`
    );
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const isPldtAccount =
    incident.accountNumber &&
    incident.accountNumber !== 'N/A (Circuit ID)' &&
    incident.accountNumber !== 'Starlink';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-incident-title"
    >
      <div className="w-full max-w-2xl bg-white h-full border-l border-slate-200 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            status === 'Resolved'
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-red-50/70 border-red-200'
          }`}
        >
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
              <span className="font-semibold text-slate-900">
                Ticket: {incident.ticketNumber}
              </span>
              <span aria-hidden="true" className="text-slate-400">
                ·
              </span>
              <span className="text-slate-700">
                {isPldtAccount
                  ? `Account #: ${incident.accountNumber}`
                  : `Circuit ID: ${incident.circuitId}`}
              </span>
              <span aria-hidden="true" className="text-slate-400">
                ·
              </span>
              <span
                className={
                  status === 'Resolved'
                    ? 'text-emerald-800 font-semibold'
                    : 'text-red-800 font-semibold'
                }
              >
                {status === 'Resolved'
                  ? 'GREEN (RESOLVED & RESTORED)'
                  : 'RED (ACTIVE OUTAGE)'}
              </span>
            </div>
            <h2
              id="drawer-incident-title"
              className="text-base font-semibold text-slate-900 mt-1"
            >
              {incident.campusName} — {incident.linkName} ({incident.provider})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-md"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
          {/* Quick 1-Click Resolve Banner when Link is RED */}
          {status !== 'Resolved' && (
            <div className="px-6 py-3.5 bg-emerald-50/80 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-950">
                  Is this link outage resolved?
                </p>
                <p className="text-xs text-emerald-800">
                  Marking as Resolved will automatically turn{' '}
                  <span className="font-semibold">
                    {incident.campusName} — {incident.linkName}
                  </span>{' '}
                  back to <span className="font-semibold">GREEN (GOOD)</span>.
                </p>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave(false, 'Resolved')}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark Resolved & Turn Link GREEN
              </button>
            </div>
          )}

          {/* Outage Problem Details, Ticket Number & Status Update */}
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Outage Details, Ticket Number & Status Update
              </h3>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                Logged:{' '}
                {new Date(incident.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* What is the Problem */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                What is the Problem / Outage Description
              </label>
              <input
                type="text"
                value={problemSummary}
                onChange={(e) => setProblemSummary(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-md"
              />
            </div>

            {/* Ticket Numbers & Circuit/Account Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Internal NOC Ticket #
                </label>
                <input
                  type="text"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Telco Reference Ticket #
                </label>
                <input
                  type="text"
                  value={telcoTicketNumber}
                  onChange={(e) => setTelcoTicketNumber(e.target.value)}
                  placeholder="Enter Telco SR/Ticket #..."
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {isPldtAccount ? 'PLDT Account Number' : 'Circuit ID'}
                </label>
                <input
                  type="text"
                  readOnly
                  value={
                    isPldtAccount ? incident.accountNumber : incident.circuitId
                  }
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-100 text-slate-800 border border-slate-300 rounded-md"
                />
              </div>
            </div>

            {/* Status Segmented Control */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Status Update (Pending / Waiting for Telco Repair = RED · Resolved = GREEN)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    'Pending',
                    'Waiting for Telco Repair',
                    'Resolved',
                  ] as IncidentStatus[]
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`px-3 py-2 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap ${
                      status === st
                        ? st === 'Resolved'
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-red-700 text-white border-red-700'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {st === 'Resolved' ? 'Resolved (Turn GREEN)' : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Is it Reported to Telco Already?
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReportedToTelco(true)}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                      reportedToTelco
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Yes — Reported
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportedToTelco(false)}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                      !reportedToTelco
                        ? 'bg-red-700 text-white border-red-700'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    No — Unreported
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Expected Resolution Timeline (Provider ETR)
                </label>
                <input
                  type="datetime-local"
                  value={expectedResolutionAt}
                  onChange={(e) => setExpectedResolutionAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Provider ETR & Field Repair Progress Notes
              </label>
              <textarea
                rows={2}
                value={etrNotes}
                onChange={(e) => setEtrNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Escalation Tier
                </label>
                <select
                  value={escalationLevel}
                  onChange={(e) =>
                    setEscalationLevel(e.target.value as EscalationLevel)
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                >
                  <option value="L1 - Campus NOC">L1 - Campus NOC</option>
                  <option value="L2 - Regional Network Lead & Telco Account Mgr">
                    L2 - Regional Network Lead & Telco Account Mgr
                  </option>
                  <option value="L3 - VP Infrastructure & Telco Executive Desk">
                    L3 - VP Infrastructure & Telco Executive Desk
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Add Status Update Note (Optional)
                </label>
                <input
                  type="text"
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                  placeholder="e.g. Telco field team spliced fiber, link restored..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave(true)}
                className="px-3.5 py-2 text-xs font-medium text-slate-900 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Mail className="w-3.5 h-3.5" />
                Save & Email Telco Follow-Up ({incident.providerNocEmail})
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : 'Save Status Update'}
              </button>
            </div>
          </div>

          {/* Auto-Pulled Router Telemetry & Technical Details */}
          <div className="p-6 space-y-3 bg-slate-50/60">
            <h3 className="text-xs font-semibold text-slate-900">
              Link Circuit Metadata & Technical Details ({incident.creationMode})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-slate-500 block">Campus</span>
                <span className="font-semibold text-slate-900">
                  {incident.campusName}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-slate-500 block">Link Name</span>
                <span className="font-semibold text-slate-900">
                  {incident.linkName}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-slate-500 block">Account Number</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {incident.accountNumber}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-slate-500 block">Circuit ID</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {incident.circuitId}
                </span>
              </div>
            </div>

            <pre className="p-3 bg-white border border-slate-200 rounded-md text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
              {incident.technicalDetails}
            </pre>
          </div>

          {/* Ready-to-Send Service Provider Email Preview */}
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-900">
                  Auto-Formatted Telco Provider Email ({incident.provider})
                </h3>
                <p className="text-xs text-slate-500">
                  Pre-populated with official Account Number / Circuit ID for{' '}
                  {incident.providerNocEmail}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(emailDraft.to)}&cc=${encodeURIComponent(emailDraft.cc)}&subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200"
                >
                  Open in M365 Outlook
                </a>
                <button
                  type="button"
                  onClick={handleCopyDraft}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-1.5"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Email Text
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1.5 text-xs font-mono">
              <div className="text-slate-600">
                <span className="font-semibold text-slate-900">To:</span>{' '}
                {emailDraft.to}
              </div>
              <div className="text-slate-600">
                <span className="font-semibold text-slate-900">CC:</span>{' '}
                {emailDraft.cc}
              </div>
              <div className="text-slate-600">
                <span className="font-semibold text-slate-900">Subject:</span>{' '}
                {emailDraft.subject}
              </div>
              <div className="pt-2 border-t border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                {emailDraft.body}
              </div>
            </div>
          </div>

          {/* Audit Timeline */}
          <div className="p-6 space-y-3">
            <h3 className="text-xs font-semibold text-slate-900">
              Incident Audit Log & Status History ({incident.timeline.length})
            </h3>
            <div className="space-y-3">
              {incident.timeline
                .slice()
                .reverse()
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-md border border-slate-200 bg-slate-50/50 text-xs"
                  >
                    <div className="flex items-center justify-between text-slate-500 font-mono tabular-nums">
                      <span className="font-semibold text-slate-800 font-sans">
                        {entry.actor}
                      </span>
                      <span>
                        {new Date(entry.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="font-medium text-slate-900 mt-1">
                      {entry.action}
                    </p>
                    <p className="text-slate-600 mt-0.5">{entry.note}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
