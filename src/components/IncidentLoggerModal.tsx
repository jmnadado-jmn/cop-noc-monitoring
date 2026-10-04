import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Mail,
  Send,
  Terminal,
  X,
} from 'lucide-react';
import {
  CampusLink,
  EscalationLevel,
  IncidentStatus,
  IncidentTicket,
  NetworkLogEvent,
} from '../types/noc';
import {
  buildProviderDispatchEmail,
  parseNetworkLogForIncident,
  SAMPLE_RAW_LOG_PRESETS,
} from '../utils/logParser';

interface IncidentLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  campuses: CampusLink[];
  logs: NetworkLogEvent[];
  initialLog?: NetworkLogEvent | null;
  initialCampusId?: string | null;
  nextSequenceNumber: number;
  onSubmitIncident: (
    payload: Partial<IncidentTicket> & {
      autoSendProviderEmail: boolean;
      autoSendInternalAlert: boolean;
    }
  ) => Promise<void>;
}

export const IncidentLoggerModal: React.FC<IncidentLoggerModalProps> = ({
  isOpen,
  onClose,
  campuses,
  logs,
  initialLog,
  initialCampusId,
  nextSequenceNumber,
  onSubmitIncident,
}) => {
  const [inputMode, setInputMode] = useState<
    'stream' | 'paste' | 'manual'
  >('stream');
  const [selectedLogId, setSelectedLogId] = useState<string>('');
  const [rawLogInput, setRawLogInput] = useState<string>('');

  // Form fields (both auto-filled and manual telco tracking fields)
  const [campusId, setCampusId] = useState<string>(
    initialCampusId || campuses[0]?.id || ''
  );
  const [ticketNumber, setTicketNumber] = useState<string>(
    `COP-INC-2026-0${nextSequenceNumber}`
  );
  const [telcoTicketNumber, setTelcoTicketNumber] = useState<string>('');
  const [status, setStatus] = useState<IncidentStatus>(
    'Waiting for Telco Repair'
  );
  const [reportedToTelco, setReportedToTelco] = useState<boolean>(true);
  const [reportedBy, setReportedBy] = useState<string>(
    'jmnadado@cathedralofpraise.com.ph'
  );
  const [etrHoursOffset, setEtrHoursOffset] = useState<number>(4);
  const [expectedResolutionAt, setExpectedResolutionAt] =
    useState<string>('');
  const [etrNotes, setEtrNotes] = useState<string>('');
  const [problemSummary, setProblemSummary] = useState<string>('');
  const [technicalDetails, setTechnicalDetails] = useState<string>('');
  const [escalationLevel, setEscalationLevel] = useState<EscalationLevel>(
    'L1 - Campus NOC'
  );
  const [autoSendProviderEmail, setAutoSendProviderEmail] =
    useState<boolean>(true);
  const [autoSendInternalAlert, setAutoSendInternalAlert] =
    useState<boolean>(true);
  const [showEmailPreview, setShowEmailPreview] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedCampus = useMemo(
    () => campuses.find((c) => c.id === campusId) || campuses[0],
    [campuses, campusId]
  );

  const computeEtrFromHours = (hours: number) => {
    const target = new Date(Date.now() + hours * 3600 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
  };

  const applyLogExtraction = (rawText: string, logId?: string) => {
    const parsed = parseNetworkLogForIncident(rawText, campuses);
    if (parsed.matchedCampus) {
      setCampusId(parsed.matchedCampus.id);
    }
    setProblemSummary(parsed.extractedProblemSummary);
    setTechnicalDetails(parsed.extractedTechnicalDetails);
    setStatus(parsed.suggestedStatus);
    setEtrHoursOffset(parsed.suggestedEtrHours);
    setExpectedResolutionAt(computeEtrFromHours(parsed.suggestedEtrHours));
    setRawLogInput(rawText);
    if (logId) {
      setSelectedLogId(logId);
    }
    if (!etrNotes) {
      setEtrNotes(
        `Auto-extracted from ${parsed.extractedProtocol} trap on ${parsed.extractedHostname}. Standard ${parsed.suggestedEtrHours}h Telco SLA window applied pending provider ETR confirmation.`
      );
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setTicketNumber(`COP-INC-2026-0${nextSequenceNumber}`);

    if (initialLog) {
      setInputMode('stream');
      setSelectedLogId(initialLog.id);
      applyLogExtraction(initialLog.rawSyslog, initialLog.id);
    } else if (initialCampusId) {
      const c = campuses.find((item) => item.id === initialCampusId);
      setCampusId(initialCampusId);
      const matchingLog = logs.find(
        (l) => l.campusId === initialCampusId && l.severity !== 'INFO'
      );
      if (matchingLog) {
        setInputMode('stream');
        setSelectedLogId(matchingLog.id);
        applyLogExtraction(matchingLog.rawSyslog, matchingLog.id);
      } else if (c) {
        setInputMode('manual');
        setProblemSummary(
          `${c.campusName} — ${c.linkName} DOWN (${c.circuitId})`
        );
        setTechnicalDetails(
          `Campus: ${c.campusName} | Link: ${c.linkName} (${c.linkRole})\nRouter: ${c.routerHostname} (${c.interfaceName}) | Circuit: ${c.circuitId} (${c.provider})`
        );
        setExpectedResolutionAt(computeEtrFromHours(4));
        setEtrNotes(
          `Reported ${c.linkName} down on ${c.campusName} to ${c.provider}. Awaiting field restoration and ETR.`
        );
      }
    } else {
      const unlinked =
        logs.find((l) => !l.linkedIncidentId && l.severity !== 'INFO') ||
        logs[0];
      if (unlinked) {
        setInputMode('stream');
        setSelectedLogId(unlinked.id);
        applyLogExtraction(unlinked.rawSyslog, unlinked.id);
      } else {
        setInputMode('manual');
        const c = campuses[0];
        if (c) {
          setCampusId(c.id);
          setProblemSummary(
            `${c.campusName} — ${c.linkName} DOWN (${c.circuitId})`
          );
          setTechnicalDetails(
            `Campus: ${c.campusName} | Link: ${c.linkName} (${c.linkRole})\nRouter: ${c.routerHostname} (${c.interfaceName}) | Circuit: ${c.circuitId} (${c.provider})`
          );
        }
        setExpectedResolutionAt(computeEtrFromHours(4));
      }
    }
  }, [isOpen, initialLog, initialCampusId, nextSequenceNumber]);

  // When user changes the selected link in manual mode, update problem & technical details
  const handleCampusChange = (newId: string) => {
    setCampusId(newId);
    const c = campuses.find((item) => item.id === newId);
    if (c && inputMode === 'manual') {
      setProblemSummary(
        `${c.campusName} — ${c.linkName} DOWN (${c.circuitId})`
      );
      setTechnicalDetails(
        `Campus: ${c.campusName} | Link: ${c.linkName} (${c.linkRole})\nRouter: ${c.routerHostname} (${c.interfaceName}) | Circuit: ${c.circuitId} (${c.provider})`
      );
    }
  };

  const parsedPreview = useMemo(() => {
    if (!rawLogInput.trim()) return null;
    return parseNetworkLogForIncident(rawLogInput, campuses);
  }, [rawLogInput, campuses]);

  const draftEmailPreview = useMemo(() => {
    if (!selectedCampus) return null;
    return buildProviderDispatchEmail({
      id: 'preview',
      ticketNumber: ticketNumber || `COP-INC-2026-0${nextSequenceNumber}`,
      telcoTicketNumber: telcoTicketNumber || 'Pending Telco Ref',
      campusName: selectedCampus.campusName,
      linkName: selectedCampus.linkName,
      circuitId: selectedCampus.circuitId,
      provider: selectedCampus.provider,
      providerNocEmail: selectedCampus.providerNocEmail,
      accountNumber: selectedCampus.accountNumber,
      routerHostname: selectedCampus.routerHostname,
      interfaceName: selectedCampus.interfaceName,
      problemSummary:
        problemSummary ||
        `${selectedCampus.campusName} — ${selectedCampus.linkName} DOWN`,
      technicalDetails:
        technicalDetails ||
        `Circuit ${selectedCampus.circuitId} on ${selectedCampus.routerHostname}`,
      rawLogSnippet: rawLogInput,
      expectedResolutionAt: expectedResolutionAt
        ? new Date(expectedResolutionAt).toISOString()
        : new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      reportedBy,
    });
  }, [
    selectedCampus,
    ticketNumber,
    telcoTicketNumber,
    problemSummary,
    technicalDetails,
    rawLogInput,
    expectedResolutionAt,
    reportedBy,
    nextSequenceNumber,
  ]);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampus) return;
    setIsSubmitting(true);
    try {
      await onSubmitIncident({
        ticketNumber,
        telcoTicketNumber: telcoTicketNumber.trim() || 'Pending Telco Ref',
        campusId: selectedCampus.id,
        campusName: selectedCampus.campusName,
        linkName: selectedCampus.linkName,
        circuitId: selectedCampus.circuitId,
        provider: selectedCampus.provider,
        providerNocEmail: selectedCampus.providerNocEmail,
        accountNumber: selectedCampus.accountNumber,
        routerHostname: selectedCampus.routerHostname,
        interfaceName: selectedCampus.interfaceName,
        problemSummary,
        technicalDetails,
        rawLogSnippet: rawLogInput,
        creationMode:
          inputMode === 'manual'
            ? 'Manual Entry'
            : telcoTicketNumber.trim()
              ? 'Hybrid Log + Manual'
              : 'Log Autofill',
        sourceLogId: selectedLogId || undefined,
        status,
        reportedToTelco: reportedToTelco || autoSendProviderEmail,
        reportedBy,
        expectedResolutionAt: expectedResolutionAt
          ? new Date(expectedResolutionAt).toISOString()
          : new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        etrNotes,
        escalationLevel,
        autoSendProviderEmail,
        autoSendInternalAlert,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-log-incident-title"
    >
      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-lg overflow-hidden my-8">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2
              id="modal-log-incident-title"
              className="text-lg font-semibold text-slate-900"
            >
              Cathedral of Praise — Log Campus Link Incident (Auto-Pull from Logs or Manual Input)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Logging an unresolved incident marks the campus link <strong className="text-red-700">RED (DOWN)</strong>. Marking it Resolved restores the link to <strong className="text-emerald-700">GREEN (GOOD & RESTORED)</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-md transition-colors"
            aria-label="Close incident logger"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="divide-y divide-slate-200 max-h-[82vh] overflow-y-auto">
          {/* Section 1: Direct Comparison of Auto-Pulled vs Manual Fields + Source Selector */}
          <div className="p-6 bg-slate-50/60 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-900">
                  Hybrid Log Autofill + Manual Telco Tracking
                </div>
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-emerald-700">Auto-Pulled from Router Logs:</span>{' '}
                  Campus & Link · Circuit ID · Telco Provider · Router Port · Optical dBm / Packet Loss
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="font-semibold text-amber-800">Staff / Telco Tracking Fields:</span>{' '}
                  Telco Ticket # · Status (Pending / Waiting for Telco / Resolved) · Reported Already (Yes/No) · Provider ETR
                </div>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setInputMode('stream')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    inputMode === 'stream'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  1. Autofill from Live Log Stream
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('paste')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    inputMode === 'paste'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  2. Paste Raw Syslog / Trap
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('manual')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    inputMode === 'manual'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  3. Manual Entry Only
                </button>
              </div>
            </div>

            {inputMode === 'stream' && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">
                  Select a Router Syslog Event to Autofill Campus & Link Fields:
                </label>
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-md bg-white max-h-44 overflow-y-auto">
                  {logs.map((log) => {
                    const isSelected = selectedLogId === log.id;
                    return (
                      <button
                        key={log.id}
                        type="button"
                        onClick={() =>
                          applyLogExtraction(log.rawSyslog, log.id)
                        }
                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-4 transition-colors ${
                          isSelected
                            ? 'bg-slate-900 text-white'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span
                              className={`font-mono font-semibold ${
                                isSelected
                                  ? 'text-amber-300'
                                  : log.severity === 'CRITICAL'
                                    ? 'text-red-700'
                                    : log.severity === 'WARNING'
                                      ? 'text-amber-700'
                                      : 'text-emerald-700'
                              }`}
                            >
                              {log.severity}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold truncate">
                              {log.campusName} — {log.linkName}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={`font-mono ${
                                isSelected ? 'text-slate-300' : 'text-slate-500'
                              }`}
                            >
                              {log.circuitId} ({log.provider})
                            </span>
                          </div>
                          <div
                            className={`text-xs mt-0.5 truncate ${
                              isSelected ? 'text-slate-200' : 'text-slate-600'
                            }`}
                          >
                            {log.parsedSummary}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-mono ${
                              isSelected ? 'text-emerald-300' : 'text-slate-600'
                            }`}
                          >
                            {isSelected ? '✓ Autofilled' : 'Click to Autofill'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {inputMode === 'paste' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-slate-500" />
                    Paste Raw Router Syslog, BGP Notification, or SNMP Trap:
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-slate-500">
                      Load Sample Log:
                    </span>
                    {SAMPLE_RAW_LOG_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyLogExtraction(preset.rawText)}
                        className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap"
                      >
                        {preset.campusHint}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={rawLogInput}
                  onChange={(e) => applyLogExtraction(e.target.value)}
                  placeholder="Paste raw syslog line here..."
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-900 text-slate-100 rounded-md border border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                {parsedPreview && (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 pt-1">
                    <div>
                      <span className="font-semibold text-emerald-700">
                        Parser Status: {parsedPreview.confidence}
                      </span>
                      <span className="mx-2 text-slate-300">·</span>
                      <span>
                        Matched Campus & Link:{' '}
                        <strong className="font-semibold">
                          {parsedPreview.matchedCampus
                            ? `${parsedPreview.matchedCampus.campusName} — ${parsedPreview.matchedCampus.linkName}`
                            : 'Unmatched (Select Below)'}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Core Incident Fields */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Field 1: Campus & Link */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  1. Affected Campus & Link (35 Monitored Links)
                </label>
                <select
                  value={campusId}
                  onChange={(e) => handleCampusChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.campusName} — {c.linkName} ({c.circuitId})
                    </option>
                  ))}
                </select>
                {selectedCampus && (
                  <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                    Provider: {selectedCampus.provider} · Router:{' '}
                    {selectedCampus.routerHostname} ({selectedCampus.interfaceName})
                  </p>
                )}
              </div>

              {/* Field 2: Internal Ticket Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  2. Internal NOC Ticket Number
                  <span className="ml-1.5 font-normal text-emerald-700">
                    · Auto-Sequenced
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  placeholder="e.g. COP-INC-2026-0103"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Cathedral of Praise internal NOC reference number.
                </p>
              </div>

              {/* Field 3: Telco Provider Reference Ticket Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  3. Telco Provider Ticket Number
                  <span className="ml-1.5 font-normal text-amber-800">
                    · Manual / Telco Desk Input
                  </span>
                </label>
                <input
                  type="text"
                  value={telcoTicketNumber}
                  onChange={(e) => setTelcoTicketNumber(e.target.value)}
                  placeholder="e.g. ETPI-FAULT-8812 / PLDT-SR-9921"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Leave blank if still waiting for Telco to issue a ticket number.
                </p>
              </div>
            </div>

            {/* Row 2: Incident Status, Reported to Telco Already, Expected Resolution Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 border-t border-slate-200">
              {/* Field 4: Incident Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  4. Incident Status (Controls RED vs GREEN Link State)
                </label>
                <div className="flex flex-col gap-1.5">
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
                      className={`px-3 py-2 text-xs font-medium rounded-md border text-left flex items-center justify-between transition-colors ${
                        status === st
                          ? st === 'Resolved'
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-red-700 text-white border-red-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>
                        {st}{' '}
                        {st === 'Resolved'
                          ? '(Link = GREEN)'
                          : '(Link = RED / Down)'}
                      </span>
                      {status === st && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 5: Is it Reported to Telco Already? */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  5. Reported to Telco Provider Already?
                </label>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setReportedToTelco(true)}
                    className={`px-3 py-2 text-xs font-medium rounded-md border text-left flex items-center justify-between transition-colors ${
                      reportedToTelco
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>Yes — Reported / Auto-Emailing Telco Now</span>
                    {reportedToTelco && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReportedToTelco(false);
                      setAutoSendProviderEmail(false);
                    }}
                    className={`px-3 py-2 text-xs font-medium rounded-md border text-left flex items-center justify-between transition-colors ${
                      !reportedToTelco
                        ? 'bg-amber-900 text-white border-amber-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>No — Not Yet Reported to Telco</span>
                    {!reportedToTelco && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="mt-2">
                  <label className="block text-xs text-slate-600 mb-1">
                    Logged By Staff Member:
                  </label>
                  <input
                    type="text"
                    value={reportedBy}
                    onChange={(e) => setReportedBy(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              {/* Field 6: Expected Resolution Timeline (ETR) from Provider */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  6. Expected Resolution Timeline (Provider ETR)
                </label>
                <input
                  type="datetime-local"
                  value={expectedResolutionAt}
                  onChange={(e) => setExpectedResolutionAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs text-slate-500">Quick SLA:</span>
                  {[2, 4, 8, 12].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => {
                        setEtrHoursOffset(hrs);
                        setExpectedResolutionAt(computeEtrFromHours(hrs));
                      }}
                      className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
                        etrHoursOffset === hrs
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      +{hrs}h
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Expected timeline from {selectedCampus?.provider} before L3 escalation.
                </p>
              </div>
            </div>

            {/* Row 3: Problem Description & Provider Repair Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  7. Problem Summary & Fault Signature
                </label>
                <input
                  type="text"
                  required
                  value={problemSummary}
                  onChange={(e) => setProblemSummary(e.target.value)}
                  placeholder="Describe connectivity issue..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <label className="block text-xs font-medium text-slate-600 mt-3 mb-1">
                  Auto-Extracted Technical Telemetry (Included in Telco Dispatch):
                </label>
                <textarea
                  rows={3}
                  value={technicalDetails}
                  onChange={(e) => setTechnicalDetails(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  8. Telco Provider Repair & ETR Notes
                </label>
                <textarea
                  rows={2}
                  value={etrNotes}
                  onChange={(e) => setEtrNotes(e.target.value)}
                  placeholder="e.g. Reported to Eastern / Converge / PLDT NOC; awaiting field splicing team..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                />

                <label className="block text-xs font-semibold text-slate-800 mt-3 mb-1">
                  Initial Escalation Workflow Tier:
                </label>
                <select
                  value={escalationLevel}
                  onChange={(e) =>
                    setEscalationLevel(e.target.value as EscalationLevel)
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                >
                  <option value="L1 - Campus NOC">
                    L1 - Campus NOC (Standard 15m Telco Dispatch SLA)
                  </option>
                  <option value="L2 - Regional Network Lead & Telco Account Mgr">
                    L2 - Regional Network Lead & Telco Account Mgr
                  </option>
                  <option value="L3 - VP Infrastructure & Telco Executive Desk">
                    L3 - VP Infrastructure & Telco Executive Desk
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Automated Service Provider Email Generation & Preview */}
          <div className="p-6 bg-slate-50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSendProviderEmail}
                    onChange={(e) => {
                      setAutoSendProviderEmail(e.target.checked);
                      if (e.target.checked) setReportedToTelco(true);
                    }}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <Mail className="w-4 h-4 text-slate-700" />
                  Auto-Create & Dispatch Outage Email to {selectedCampus?.provider} ({' '}
                  <span className="font-mono text-slate-700">
                    {selectedCampus?.providerNocEmail}
                  </span>
                  )
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSendInternalAlert}
                    onChange={(e) => setAutoSendInternalAlert(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  Send automated internal advisory email to Cathedral of Praise Campus IT Staff
                </label>
              </div>

              <button
                type="button"
                onClick={() => setShowEmailPreview(!showEmailPreview)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap self-start"
              >
                {showEmailPreview
                  ? 'Hide Auto-Generated Provider Email'
                  : 'Preview Auto-Generated Provider Email'}
              </button>
            </div>

            {showEmailPreview && draftEmailPreview && (
              <div className="bg-white border border-slate-200 rounded-md p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pb-2 border-b border-slate-200">
                  <div>
                    <span className="font-semibold text-slate-900">To:</span>{' '}
                    <span className="font-mono">{draftEmailPreview.to}</span>
                    <span className="mx-2 text-slate-300">·</span>
                    <span className="font-semibold text-slate-900">CC:</span>{' '}
                    <span className="font-mono">{draftEmailPreview.cc}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(draftEmailPreview.to)}&cc=${encodeURIComponent(draftEmailPreview.cc)}&subject=${encodeURIComponent(draftEmailPreview.subject)}&body=${encodeURIComponent(draftEmailPreview.body)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-slate-900 underline hover:text-slate-700 whitespace-nowrap"
                    >
                      Open in M365 Outlook Web
                    </a>
                    <span className="text-slate-300">|</span>
                    <a
                      href={`mailto:${encodeURIComponent(draftEmailPreview.to)}?cc=${encodeURIComponent(draftEmailPreview.cc)}&subject=${encodeURIComponent(draftEmailPreview.subject)}&body=${encodeURIComponent(draftEmailPreview.body)}`}
                      className="text-xs font-medium text-slate-700 underline hover:text-slate-900 whitespace-nowrap"
                    >
                      Open in Desktop Outlook (mailto:)
                    </a>
                  </div>
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-slate-900">Subject:</span>{' '}
                  <span className="font-mono text-slate-800">
                    {draftEmailPreview.subject}
                  </span>
                </div>
                <pre className="text-xs font-mono text-slate-700 bg-slate-50 p-3 rounded border border-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {draftEmailPreview.body}
                </pre>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-white flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              {status === 'Resolved' ? (
                <span className="text-emerald-700 font-semibold">
                  Link will be set to GREEN (Good & Restored).
                </span>
              ) : (
                <span className="text-red-700 font-semibold">
                  Link ({selectedCampus?.campusName} — {selectedCampus?.linkName}) will turn RED (Down) until resolved.
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting
                  ? 'Logging & Dispatching...'
                  : autoSendProviderEmail
                    ? 'Log Incident & Auto-Email Telco Provider'
                    : 'Log Incident Ticket'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
