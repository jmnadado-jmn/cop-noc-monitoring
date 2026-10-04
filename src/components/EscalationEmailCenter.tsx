import React, { useState } from 'react';
import { Check, Copy, Mail, Play, Send } from 'lucide-react';
import {
  EmailDispatch,
  EscalationPolicy,
  IncidentTicket,
} from '../types/noc';

interface EscalationEmailCenterProps {
  policies: EscalationPolicy[];
  emails: EmailDispatch[];
  incidents: IncidentTicket[];
  onRunEscalationCheck: () => Promise<string[]>;
  onSendManualEmail: (payload: Partial<EmailDispatch>) => Promise<void>;
}

export const EscalationEmailCenter: React.FC<EscalationEmailCenterProps> = ({
  policies,
  emails,
  incidents,
  onRunEscalationCheck,
  onSendManualEmail,
}) => {
  const [selectedEmailId, setSelectedEmailId] = useState<string>(
    emails[0]?.id || ''
  );
  const [recipientFilter, setRecipientFilter] = useState<string>('All');
  const [isRunningEngine, setIsRunningEngine] = useState(false);
  const [lastRunResults, setLastRunResults] = useState<string[] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredEmails = emails.filter((e) => {
    if (recipientFilter === 'All') return true;
    if (recipientFilter === 'Provider')
      return e.recipientType === 'Service Provider (Telco NOC)';
    return e.recipientType !== 'Service Provider (Telco NOC)';
  });

  const activeEmail =
    filteredEmails.find((e) => e.id === selectedEmailId) ||
    filteredEmails[0] ||
    null;

  const handleRunEscalations = async () => {
    setIsRunningEngine(true);
    try {
      const actions = await onRunEscalationCheck();
      setLastRunResults(
        actions.length > 0
          ? actions
          : [
              'All active incidents have already been reported to Telco and escalated to their appropriate SLA tier.',
            ]
      );
    } finally {
      setIsRunningEngine(false);
    }
  };

  const handleCopyEmail = (email: EmailDispatch) => {
    navigator.clipboard.writeText(
      `To: ${email.to}\nCC: ${email.cc}\nSubject: ${email.subject}\n\n${email.body}`
    );
    setCopiedId(email.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const unreportedCount = incidents.filter(
    (i) => i.status !== 'Resolved' && !i.reportedToTelco
  ).length;

  return (
    <div className="space-y-8">
      {/* Header + Run Automated Escalation Workflow Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Automated Escalation Workflows & Service Provider Email Dispatch
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Multi-tier SLA escalation rules and automated RFC outage emails dispatched to Telco NOCs and internal campus stakeholders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isRunningEngine}
            onClick={handleRunEscalations}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            {isRunningEngine
              ? 'Evaluating Active Incidents...'
              : `Evaluate & Trigger Escalations Now${unreportedCount > 0 ? ` (${unreportedCount} Unreported)` : ''}`}
          </button>
        </div>
      </div>

      {/* Escalation Execution Feedback */}
      {lastRunResults && (
        <div className="p-4 bg-slate-900 text-white rounded-lg space-y-1.5">
          <div className="text-xs font-semibold text-emerald-400">
            Escalation Workflow Evaluation Complete:
          </div>
          <ul className="space-y-1 text-xs font-mono text-slate-200">
            {lastRunResults.map((msg, idx) => (
              <li key={idx}>→ {msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Active Escalation Rules Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Configured Automated Escalation Policies (L1 → L3)
          </h3>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            3 Active Policies Monitoring {incidents.filter((i) => i.status !== 'Resolved').length} Open Incidents
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {policies.map((pol) => (
            <div
              key={pol.id}
              className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1 max-w-3xl">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-semibold text-slate-900">
                    {pol.level}
                  </span>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-semibold text-slate-900">
                    {pol.name}
                  </span>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-emerald-700 font-medium">
                    Active Policy
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  <strong className="font-medium text-slate-800">
                    Condition:
                  </strong>{' '}
                  {pol.triggerCondition}
                </p>
                <p className="text-xs text-slate-600">
                  <strong className="font-medium text-slate-800">
                    Automated Action:
                  </strong>{' '}
                  {pol.autoAction}
                </p>
              </div>

              <div className="text-left lg:text-right shrink-0 space-y-1 text-xs font-mono tabular-nums text-slate-600">
                <div>SLA Threshold: {pol.thresholdMinutes} mins</div>
                <div>30d Executions: {pol.triggeredCount30d} dispatches</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Automated Email Outbox & Service Provider Dispatch Viewer */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Automated Email Dispatch Outbox (Telco Provider & Internal IT Notifications)
            </h3>
            <p className="text-xs text-slate-500">
              Every email auto-created when a ticket is logged or escalated is archived here with one-click mailto: or resend.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {[
              { id: 'All', label: `All Dispatches (${emails.length})` },
              {
                id: 'Provider',
                label: 'Service Provider NOC Emails',
              },
              {
                id: 'Internal',
                label: 'Internal Campus IT Alerts',
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRecipientFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  recipientFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left Column: Dispatched Email List */}
          <div className="lg:col-span-5 divide-y divide-slate-200 max-h-[520px] overflow-y-auto">
            {filteredEmails.map((email) => {
              const isSelected = activeEmail?.id === email.id;
              return (
                <button
                  key={email.id}
                  type="button"
                  onClick={() => setSelectedEmailId(email.id)}
                  className={`w-full text-left p-4 transition-colors ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums">
                    <span
                      className={
                        isSelected
                          ? 'text-amber-300 font-semibold'
                          : email.recipientType ===
                              'Service Provider (Telco NOC)'
                            ? 'text-slate-900 font-semibold'
                            : 'text-slate-600'
                      }
                    >
                      {email.recipientType}
                    </span>
                    <span
                      className={
                        isSelected ? 'text-slate-300' : 'text-slate-400'
                      }
                    >
                      {new Date(email.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="text-xs font-semibold mt-1 truncate">
                    {email.subject}
                  </div>
                  <div
                    className={`text-xs mt-1 truncate font-mono ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    To: {email.to} · Ticket: {email.ticketNumber}
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      isSelected ? 'text-emerald-300' : 'text-slate-500'
                    }`}
                  >
                    Trigger: {email.triggerSource} · {email.deliveryStatus}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Selected Email Inspector */}
          <div className="lg:col-span-7 p-6">
            {activeEmail ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500 font-mono tabular-nums">
                      {activeEmail.recipientType} ·{' '}
                      {activeEmail.triggerSource} · Dispatched{' '}
                      {new Date(activeEmail.timestamp).toLocaleString()}
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      {activeEmail.subject}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyEmail(activeEmail)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {copiedId === activeEmail.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Email
                        </>
                      )}
                    </button>
                    <a
                      href={`mailto:${encodeURIComponent(activeEmail.to)}?cc=${encodeURIComponent(activeEmail.cc)}&subject=${encodeURIComponent(activeEmail.subject)}&body=${encodeURIComponent(activeEmail.body)}`}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Open in Mail Client
                    </a>
                  </div>
                </div>

                <div className="text-xs space-y-1 font-mono text-slate-600 bg-slate-50 p-3 rounded border border-slate-200">
                  <div>
                    <strong className="text-slate-900">To:</strong>{' '}
                    {activeEmail.to}
                  </div>
                  <div>
                    <strong className="text-slate-900">CC:</strong>{' '}
                    {activeEmail.cc}
                  </div>
                  <div>
                    <strong className="text-slate-900">Campus / Ticket:</strong>{' '}
                    {activeEmail.campusName} ({activeEmail.ticketNumber})
                  </div>
                </div>

                <pre className="p-4 bg-slate-900 text-slate-100 rounded-md text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                  {activeEmail.body}
                </pre>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                Select an email dispatch on the left to inspect its full RFC message and telemetry payload.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
