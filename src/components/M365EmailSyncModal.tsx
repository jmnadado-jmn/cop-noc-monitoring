import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Mail, Send, X } from 'lucide-react';
import { CampusLink } from '../types/noc';
import {
  parseM365Email,
  SAMPLE_M365_EMAIL_PRESETS,
} from '../utils/logParser';

interface M365EmailSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  campuses: CampusLink[];
  onProcessM365Email: (payload: {
    from: string;
    to: string;
    subject: string;
    body: string;
  }) => Promise<void>;
}

const TELCO_RECIPIENT_BY_PROVIDER: Record<CampusLink['provider'], string> = {
  'Eastern Communications': 'linkgold@etpi.com.ph',
  'Converge ICT': 'enterprisesupport@convergeict.com',
  'PLDT Enterprise': 'enterprisecare@pldt.com.ph',
  'Starlink Enterprise': 'enterprise-support@starlink.com',
};

export const M365EmailSyncModal: React.FC<M365EmailSyncModalProps> = ({
  isOpen,
  onClose,
  campuses,
  onProcessM365Email,
}) => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'power-automate'>(
    'simulator'
  );
  const [selectedCampusId, setSelectedCampusId] = useState<string>('');
  const [emailActionMode, setEmailActionMode] = useState<'OUTAGE' | 'RESOLVED'>(
    'OUTAGE'
  );
  const [from, setFrom] = useState('jmnadado@cathedralofpraise.com.ph');
  const [to, setTo] = useState('linkgold@etpi.com.ph');
  const [telcoTicketInput, setTelcoTicketInput] = useState('');
  const [subject, setSubject] = useState(SAMPLE_M365_EMAIL_PRESETS[0].subject);
  const [body, setBody] = useState(SAMPLE_M365_EMAIL_PRESETS[0].body);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedSimpleUrl, setCopiedSimpleUrl] = useState(false);

  const parsedPreview = useMemo(
    () => parseM365Email(subject, body, campuses, to),
    [subject, body, campuses, to]
  );

  // Whenever the user types an Account Number or Circuit ID in the Subject and a campus link matches,
  // automatically set the To address to the exact Telco NOC email (linkgold@etpi.com.ph, enterprisesupport@convergeict.com, or enterprisecare@pldt.com.ph)
  useEffect(() => {
    if (parsedPreview.matchedCampus) {
      const targetEmail =
        TELCO_RECIPIENT_BY_PROVIDER[parsedPreview.matchedCampus.provider] ||
        parsedPreview.matchedCampus.providerNocEmail;
      setTo(targetEmail);
      setSelectedCampusId(parsedPreview.matchedCampus.id);
    }
  }, [parsedPreview.matchedCampus]);

  if (!isOpen) return null;

  const sharedOrigin = window.location.origin.replace('ais-dev-', 'ais-pre-');
  const webhookUrl = `${sharedOrigin}/api/webhooks/m365-email`;
  const noErrorQueryWebhookUrl = `${webhookUrl}?from=jmnadado@cathedralofpraise.com.ph&to=@{triggerOutputs()?['body/toRecipients']}&subject=@{encodeUriComponent(triggerOutputs()?['body/subject'])}`;

  const handleSelectCampusLink = (
    campusId: string,
    mode: 'OUTAGE' | 'RESOLVED' = emailActionMode
  ) => {
    setSelectedCampusId(campusId);
    setSubmitError(null);
    const found = campuses.find((c) => c.id === campusId);
    if (!found) return;

    const recipient =
      TELCO_RECIPIENT_BY_PROVIDER[found.provider] || found.providerNocEmail;
    setTo(recipient);

    const idLabel =
      found.accountNumber &&
      found.accountNumber !== 'N/A (Circuit ID)' &&
      found.accountNumber !== 'Starlink'
        ? `Account Number ${found.accountNumber}`
        : `Circuit ID ${found.circuitId}`;

    const ticketLine = telcoTicketInput.trim()
      ? `\nTelco Ticket #: ${telcoTicketInput.trim()}`
      : '';

    if (mode === 'RESOLVED') {
      setSubject(`RESOLVED: ${found.campusName} ${found.linkName} - ${idLabel}`);
      setBody(`Hi ${found.provider} Support (${recipient}),

Confirming that ${found.campusName} (${found.linkName}) with ${idLabel} is now RESOLVED and back online.${ticketLine}

Regards,
jmnadado@cathedralofpraise.com.ph`);
    } else {
      setSubject(
        `Urgent Outage: ${found.campusName} ${found.linkName} - ${idLabel}`
      );
      setBody(`Hi ${found.provider} Support (${recipient}),

Please create an urgent trouble ticket for our ${found.campusName} — ${found.linkName} link.
${idLabel}${ticketLine}
Problem: Link Down / Total loss of connectivity on ${found.campusName} router (${found.routerHostname}).

Please reply with your official Telco Ticket Number and ETR.

Regards,
jmnadado@cathedralofpraise.com.ph`);
    }
  };

  const handleToggleMode = (newMode: 'OUTAGE' | 'RESOLVED') => {
    setEmailActionMode(newMode);
    if (selectedCampusId) {
      handleSelectCampusLink(selectedCampusId, newMode);
    } else if (newMode === 'RESOLVED' && !/resolved/i.test(subject)) {
      setSubject(`RESOLVED: ${subject}`);
    } else if (newMode === 'OUTAGE' && /^RESOLVED:\s*/i.test(subject)) {
      setSubject(subject.replace(/^RESOLVED:\s*/i, 'Urgent Outage: '));
    }
  };

  const handleLoadPreset = (presetId: string) => {
    const found = SAMPLE_M365_EMAIL_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setSubmitError(null);
    setFrom(found.from);
    setTo(found.to);
    setSubject(found.subject);
    setBody(found.body);
    setEmailActionMode(/resolved/i.test(found.subject) ? 'RESOLVED' : 'OUTAGE');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!parsedPreview.matchedCampus) {
      setSubmitError(
        'Please include a valid Account Number (e.g. 657871060) or Circuit ID (e.g. 930473671, MC12984) in the Email Subject, or select a link from the dropdown above.'
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const finalBody =
        telcoTicketInput.trim() && !body.includes(telcoTicketInput.trim())
          ? `${body}\nTelco Ticket #: ${telcoTicketInput.trim()}`
          : body;
      await onProcessM365Email({ from, to, subject, body: finalBody });
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Failed to process email sync. Please check the Account Number or Circuit ID.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const ccEmail =
    from.toLowerCase() === 'lcmojal@cathedralofpraise.com.ph'
      ? 'jmnadado@cathedralofpraise.com.ph, jffernandez@cathedralofpraise.com.ph, jcjara@cathedralofpraise.com.ph'
      : 'lcmojal@cathedralofpraise.com.ph, jffernandez@cathedralofpraise.com.ph, jcjara@cathedralofpraise.com.ph';

  const outlookWebComposeUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(
    to
  )}&cc=${encodeURIComponent(ccEmail)}&subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="m365-sync-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-slate-900" />
            <div>
              <h2
                id="m365-sync-modal-title"
                className="text-base font-semibold text-slate-900"
              >
                M365 Email Ticket Sync — jmnadado@cathedralofpraise.com.ph
              </h2>
              <p className="text-xs text-slate-500">
                Put the <strong>Account Number</strong> or <strong>Circuit ID</strong> in the Email Subject when sending to{' '}
                <code>linkgold@etpi.com.ph</code>, <code>enterprisesupport@convergeict.com</code>, or{' '}
                <code>enterprisecare@pldt.com.ph</code> to auto-update the wallboard.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-md"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'simulator'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Compose / Sync M365 Email by Subject (Instant — No Setup Needed)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('power-automate')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'power-automate'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Power Automate Sent-Items Auto-Sync (Error-Free URL)
            </button>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Auto-CC: lcmojal · jffernandez · jcjara (@cathedralofpraise.com.ph)
          </span>
        </div>

        {activeTab === 'simulator' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Step 1: Pick Link or Load Preset */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Quick Pick Campus Link (Or just type the Account # / Circuit ID in the Subject below)
                  </label>
                  <select
                    value={selectedCampusId}
                    onChange={(e) => handleSelectCampusLink(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md font-medium text-slate-900"
                  >
                    <option value="">
                      -- Select any of the 39 Campus Links to auto-fill Subject & Telco Email --
                    </option>
                    {campuses.map((c) => {
                      const idDisp =
                        c.accountNumber &&
                        c.accountNumber !== 'N/A (Circuit ID)' &&
                        c.accountNumber !== 'Starlink'
                          ? `Acct #${c.accountNumber}`
                          : `Circuit ${c.circuitId}`;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.campusName} — {c.linkName} ({idDisp} → {c.providerNocEmail})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Email Action on Wallboard
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleMode('OUTAGE')}
                      className={`px-2.5 py-2 text-xs font-semibold rounded-md border transition-colors ${
                        emailActionMode === 'OUTAGE'
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Outage → RED
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleMode('RESOLVED')}
                      className={`px-2.5 py-2 text-xs font-semibold rounded-md border transition-colors ${
                        emailActionMode === 'RESOLVED'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Resolved → GREEN
                    </button>
                  </div>
                </div>
              </div>

              {/* 1-Click Sample Presets for ETPI, Converge, PLDT */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Or click a sample email for ETPI, Converge, or PLDT:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {SAMPLE_M365_EMAIL_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleLoadPreset(preset.id)}
                      className={`p-2 text-left text-xs rounded border transition-colors ${
                        subject === preset.subject
                          ? 'border-slate-900 bg-white font-semibold text-slate-900'
                          : 'border-slate-200 bg-white/70 hover:bg-white text-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  From / CC (Cathedral of Praise M365)
                </label>
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md"
                >
                  <option value="jmnadado@cathedralofpraise.com.ph">
                    jmnadado@cathedralofpraise.com.ph
                  </option>
                  <option value="lcmojal@cathedralofpraise.com.ph">
                    lcmojal@cathedralofpraise.com.ph
                  </option>
                  <option value="jffernandez@cathedralofpraise.com.ph">
                    jffernandez@cathedralofpraise.com.ph
                  </option>
                  <option value="jcjara@cathedralofpraise.com.ph">
                    jcjara@cathedralofpraise.com.ph
                  </option>
                </select>
                <p className="text-[11px] font-mono text-slate-500 mt-1">
                  Auto-CC: {ccEmail}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  To (ETPI / Converge / PLDT Support)
                </label>
                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md"
                >
                  <option value="linkgold@etpi.com.ph">
                    ETPI — linkgold@etpi.com.ph
                  </option>
                  <option value="enterprisesupport@convergeict.com">
                    Converge — enterprisesupport@convergeict.com
                  </option>
                  <option value="enterprisecare@pldt.com.ph">
                    PLDT — enterprisecare@pldt.com.ph
                  </option>
                  <option value="enterprise-support@starlink.com">
                    Starlink — enterprise-support@starlink.com
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Telco Ticket # (Optional if already issued)
                </label>
                <input
                  type="text"
                  value={telcoTicketInput}
                  onChange={(e) => setTelcoTicketInput(e.target.value)}
                  placeholder="e.g. ETPI-2026-991 or leave blank"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">
                Email Subject (Include the Account Number or Circuit ID — add &ldquo;RESOLVED&rdquo; when restored)
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Link Down: Main Campus - Circuit ID 930473671  OR  Outage Account 657871060"
                className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email Body
              </label>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md"
              />
            </div>

            {/* Live Subject Match Preview */}
            <div
              className={`p-3.5 rounded-lg border ${
                !parsedPreview.matchedCampus
                  ? 'bg-amber-50 border-amber-200'
                  : parsedPreview.detectedAction === 'RESOLVE_TO_GREEN'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-900">
                  Automatic Subject Matcher Preview
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                  {parsedPreview.confidence}
                </span>
              </div>

              {parsedPreview.matchedCampus ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Matched Link</span>
                    <span className="font-bold text-slate-900">
                      {parsedPreview.matchedCampus.campusName} —{' '}
                      {parsedPreview.matchedCampus.linkName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Circuit ID / Account #
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {parsedPreview.matchedCampus.circuitId}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Telco Recipient
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {to}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Wallboard Status Update
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        parsedPreview.detectedAction === 'RESOLVE_TO_GREEN'
                          ? 'text-emerald-700'
                          : 'text-red-700'
                      }`}
                    >
                      {parsedPreview.detectedAction === 'RESOLVE_TO_GREEN'
                        ? 'TURNS GREEN (RESOLVED)'
                        : 'TURNS RED (OUTAGE)'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-900">
                  Type any <strong>Circuit ID</strong> (e.g. <code>930473671</code>, <code>813303292</code>, <code>MC12984</code>) or <strong>PLDT Account Number</strong> (e.g. <code>657871060</code>, <code>220776581</code>) in the <strong>Email Subject</strong> above, or pick a link from the dropdown.
                </p>
              )}
            </div>

            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-medium">
                {submitError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <a
                href={outlookWebComposeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Pre-Filled Email in M365 Outlook Web ({to})
              </a>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!parsedPreview.matchedCampus || isSubmitting}
                  className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                    parsedPreview.detectedAction === 'RESOLVE_TO_GREEN'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : 'bg-red-700 hover:bg-red-800'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting
                    ? 'Updating Ticket & Wallboard...'
                    : parsedPreview.detectedAction === 'RESOLVE_TO_GREEN'
                      ? 'Sync Email Now → Mark Ticket Resolved & Turn Link GREEN'
                      : 'Sync Email Now → Create/Update Ticket & Turn Link RED'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-5 text-xs text-slate-700">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-1.5">
              <h3 className="text-sm font-semibold text-amber-950">
                Why Did You Get an Error Before? (Fixed!)
              </h3>
              <ul className="list-disc list-inside space-y-1 text-amber-900">
                <li>
                  <strong>Fix 1 (Sent Emails vs Inbox):</strong> When <code>jmnadado@cathedralofpraise.com.ph</code> sends an email to <code>linkgold@etpi.com.ph</code>, <code>enterprisesupport@convergeict.com</code>, or <code>enterprisecare@pldt.com.ph</code>, set the Power Automate folder to <strong>Sent Items</strong> (or CC <code>jmnadado@cathedralofpraise.com.ph</code>).
                </li>
                <li>
                  <strong>Fix 2 (No JSON Syntax Errors):</strong> Email bodies with line breaks can cause an <code>Invalid JSON</code> error in Power Automate. Since you include the <strong>Account Number or Circuit ID in the Email Subject</strong>, you can use the <strong>Single-Line URL below</strong> with <strong>no JSON body required</strong>!
                </li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Error-Free Power Automate Setup for jmnadado@cathedralofpraise.com.ph
              </h3>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-800 pt-1">
                <li>
                  In <strong>Power Automate</strong>, create an Automated Cloud Flow with trigger <strong>Office 365 Outlook — &ldquo;When a new email arrives (V3)&rdquo;</strong>.
                </li>
                <li>
                  In the trigger settings, select Folder: <strong>Sent Items</strong> (to trigger whenever you send an email to <code>linkgold@etpi.com.ph</code>, <code>enterprisesupport@convergeict.com</code>, or <code>enterprisecare@pldt.com.ph</code>).
                </li>
                <li>
                  Add action <strong>HTTP</strong> → Method: <code>GET</code> (or <code>POST</code>) → Paste the <strong>Single-Line Auto-Sync URL</strong> below into the <strong>URI</strong> field (leave Body empty!).
                </li>
              </ol>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-900">
                  Option A (Recommended — Zero JSON Errors): Single-Line Subject Sync URL (Method: GET or POST)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(noErrorQueryWebhookUrl);
                    setCopiedSimpleUrl(true);
                    setTimeout(() => setCopiedSimpleUrl(false), 2000);
                  }}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 flex items-center gap-1"
                >
                  {copiedSimpleUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copied Single-Line URL
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Single-Line URL
                    </>
                  )}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={noErrorQueryWebhookUrl}
                className="w-full px-3 py-2 font-mono text-xs bg-slate-100 border border-slate-300 rounded-md text-slate-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-900">
                  Option B: Base Webhook URL (If passing raw Power Automate &ldquo;Body&rdquo; token)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    setCopiedWebhook(true);
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  }}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 flex items-center gap-1"
                >
                  {copiedWebhook ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copied Base URL
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Base URL
                    </>
                  )}
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="w-full px-3 py-2 font-mono text-xs bg-slate-100 border border-slate-300 rounded-md text-slate-900"
              />
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950">
              <strong>Configured Telco Support Emails for jmnadado@cathedralofpraise.com.ph:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1 text-emerald-900">
                <li>
                  <strong>ETPI (Eastern Communications):</strong> <code>linkgold@etpi.com.ph</code> — Put the Circuit ID (e.g. <code>930473671</code>, <code>813303292</code>) in the Email Subject.
                </li>
                <li>
                  <strong>Converge ICT:</strong> <code>enterprisesupport@convergeict.com</code> — Put the Circuit ID (e.g. <code>MC12984</code>, <code>MC003576</code>) in the Email Subject.
                </li>
                <li>
                  <strong>PLDT Enterprise:</strong> <code>enterprisecare@pldt.com.ph</code> — Put the Account Number (e.g. <code>657871060</code>, <code>220776581</code>) in the Email Subject.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
