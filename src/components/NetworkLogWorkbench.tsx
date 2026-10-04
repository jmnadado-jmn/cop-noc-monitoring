import React, { useMemo, useState } from 'react';
import { ArrowRight, Plus, Search } from 'lucide-react';
import {
  CampusLink,
  IncidentTicket,
  NetworkLogEvent,
} from '../types/noc';
import {
  parseNetworkLogForIncident,
  SAMPLE_RAW_LOG_PRESETS,
} from '../utils/logParser';

interface NetworkLogWorkbenchProps {
  logs: NetworkLogEvent[];
  campuses: CampusLink[];
  incidents: IncidentTicket[];
  onCreateIncidentFromLog: (log: NetworkLogEvent) => void;
  onSimulateCampusEvent: (
    campusId: string,
    mode: 'outage' | 'degraded' | 'restore'
  ) => Promise<void>;
}

export const NetworkLogWorkbench: React.FC<NetworkLogWorkbenchProps> = ({
  logs,
  campuses,
  incidents,
  onCreateIncidentFromLog,
  onSimulateCampusEvent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [testLogText, setTestLogText] = useState<string>(
    SAMPLE_RAW_LOG_PRESETS[0].rawText
  );
  const [simulatingCampusId, setSimulatingCampusId] = useState<string>(
    campuses[0]?.id || ''
  );
  const [isSimulating, setIsSimulating] = useState(false);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (severityFilter !== 'ALL' && log.severity !== severityFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        log.campusName.toLowerCase().includes(q) ||
        (log.linkName && log.linkName.toLowerCase().includes(q)) ||
        log.circuitId.toLowerCase().includes(q) ||
        log.routerHostname.toLowerCase().includes(q) ||
        log.rawSyslog.toLowerCase().includes(q) ||
        log.provider.toLowerCase().includes(q)
      );
    });
  }, [logs, severityFilter, searchQuery]);

  const liveExtraction = useMemo(
    () => parseNetworkLogForIncident(testLogText, campuses),
    [testLogText, campuses]
  );

  const handleSimulate = async (mode: 'outage' | 'degraded' | 'restore') => {
    if (!simulatingCampusId) return;
    setIsSimulating(true);
    try {
      await onSimulateCampusEvent(simulatingCampusId, mode);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header + Live Simulator Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Cathedral of Praise — Network Log Ingestion & Incident Autofill Engine
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Correlates raw BGP, Optical dBm, SNMP, and Starlink telemetry logs against all 35 Cathedral of Praise campus links.
          </p>
        </div>

        {/* Live Telemetry Fault Injector */}
        <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 p-2 rounded-lg">
          <span className="text-xs font-medium text-slate-600 pl-1">
            Simulate Link Event:
          </span>
          <select
            value={simulatingCampusId}
            onChange={(e) => setSimulatingCampusId(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md"
          >
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.campusName} — {c.linkName} ({c.circuitId})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isSimulating}
            onClick={() => handleSimulate('outage')}
            className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors whitespace-nowrap"
          >
            Simulate Link DOWN (Red)
          </button>
          <button
            type="button"
            disabled={isSimulating}
            onClick={() => handleSimulate('restore')}
            className="px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors whitespace-nowrap"
          >
            Simulate Restored (Green)
          </button>
        </div>
      </div>

      {/* Interactive Log Autofill Inspector */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Interactive Log-to-Incident Autofill Sandbox
            </h3>
            <p className="text-xs text-slate-600">
              Paste any router syslog or select a preset to see how Campus, Link, Circuit, and Telemetry auto-populate.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {SAMPLE_RAW_LOG_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setTestLogText(preset.rawText)}
                className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                {preset.campusHint}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left: Raw Syslog Input */}
          <div className="lg:col-span-5 p-6 space-y-3">
            <label className="block text-xs font-semibold text-slate-800">
              Raw Router Syslog / SNMP Trap Input:
            </label>
            <textarea
              rows={6}
              value={testLogText}
              onChange={(e) => setTestLogText(e.target.value)}
              className="w-full p-3 text-xs font-mono bg-slate-900 text-slate-100 rounded-md border border-slate-800 leading-relaxed"
            />
            <button
              type="button"
              onClick={() =>
                onCreateIncidentFromLog({
                  id: `log-custom-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  routerHostname: liveExtraction.extractedHostname,
                  interfaceName: liveExtraction.extractedInterface,
                  campusId:
                    liveExtraction.matchedCampus?.id || campuses[0].id,
                  campusName:
                    liveExtraction.matchedCampus?.campusName ||
                    campuses[0].campusName,
                  linkName:
                    liveExtraction.matchedCampus?.linkName ||
                    campuses[0].linkName,
                  circuitId:
                    liveExtraction.matchedCampus?.circuitId ||
                    campuses[0].circuitId,
                  provider:
                    liveExtraction.matchedCampus?.provider ||
                    campuses[0].provider,
                  protocol: liveExtraction.extractedProtocol,
                  severity: liveExtraction.extractedSeverity,
                  rawSyslog: testLogText,
                  parsedSummary: liveExtraction.extractedProblemSummary,
                  detectedIssueType: liveExtraction.extractedProblemSummary,
                  metrics: {
                    packetLossPct: liveExtraction.extractedPacketLossPct,
                    latencyMs: liveExtraction.extractedLatencyMs,
                    opticalRxDbm: liveExtraction.extractedOpticalRxDbm,
                  },
                })
              }
              className="w-full py-2.5 px-4 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>Open Incident Form with These Autofilled Fields</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: Side-by-Side Breakdown of Auto-Pulled vs Manual Telco Fields */}
          <div className="lg:col-span-7 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-xs font-semibold text-emerald-800 border-b border-slate-200 pb-2">
                Automatically Pulled from Logs (Zero Typing)
              </div>
              <dl className="space-y-2 text-xs">
                <div>
                  <dt className="text-slate-500">Matched Campus & Link:</dt>
                  <dd className="font-semibold text-slate-900">
                    {liveExtraction.matchedCampus
                      ? `${liveExtraction.matchedCampus.campusName} — ${liveExtraction.matchedCampus.linkName}`
                      : 'Unmatched — Select Manually'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">
                    Telco Provider & Circuit ID:
                  </dt>
                  <dd className="font-mono font-semibold text-slate-900">
                    {liveExtraction.matchedCampus
                      ? `${liveExtraction.matchedCampus.provider} · ${liveExtraction.matchedCampus.circuitId}`
                      : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">
                    Provider NOC Dispatch Email:
                  </dt>
                  <dd className="font-mono text-slate-800">
                    {liveExtraction.matchedCampus?.providerNocEmail || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">
                    CE Router & WAN Interface:
                  </dt>
                  <dd className="font-mono text-slate-800">
                    {liveExtraction.extractedHostname} (
                    {liveExtraction.extractedInterface})
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">
                    Telemetry (Loss / RTT / Optical Rx):
                  </dt>
                  <dd className="font-mono tabular-nums text-slate-900">
                    {liveExtraction.extractedPacketLossPct}% Loss ·{' '}
                    {liveExtraction.extractedLatencyMs}ms ·{' '}
                    {liveExtraction.extractedOpticalRxDbm} dBm
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Auto-Generated Problem:</dt>
                  <dd className="text-slate-800 font-medium">
                    {liveExtraction.extractedProblemSummary}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-amber-800 border-b border-slate-200 pb-2">
                Staff / Telco Tracking Fields (Confirmed or Updated Later)
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li>
                  <strong className="text-slate-900 block">
                    1. Telco Reference Ticket Number
                  </strong>
                  Internal ticket ID is auto-sequenced immediately. Once Eastern, Converge, PLDT, or Starlink replies with their Ticket #, staff enter it.
                </li>
                <li>
                  <strong className="text-slate-900 block">
                    2. Incident Status (Pending / Waiting for Telco / Resolved)
                  </strong>
                  Controls whether the link displays as <strong className="text-red-700">RED (Down)</strong> or <strong className="text-emerald-700">GREEN (Restored)</strong>.
                </li>
                <li>
                  <strong className="text-slate-900 block">
                    3. Reported to Telco Already? (Yes / No)
                  </strong>
                  Automatically marked <strong>Yes</strong> if you check &ldquo;Auto-Send Provider Outage Email&rdquo; on creation.
                </li>
                <li>
                  <strong className="text-slate-900 block">
                    4. Expected Resolution Timeline (Provider ETR)
                  </strong>
                  Defaults to contracted SLA (+
                  {liveExtraction.suggestedEtrHours}h) until the Telco provides an exact ETR timestamp.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Live Network Log Stream Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Live Campus Router Syslog & SNMP Trap Stream
            </h3>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              ({filteredLogs.length} events)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter campus, link, circuit..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    severityFilter === sev
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredLogs.map((log) => {
            const linkedIncident = incidents.find(
              (inc) =>
                inc.id === log.linkedIncidentId || inc.sourceLogId === log.id
            );

            return (
              <div
                key={log.id}
                className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`font-mono font-semibold ${
                        log.severity === 'CRITICAL'
                          ? 'text-red-700'
                          : log.severity === 'WARNING'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                      }`}
                    >
                      {log.severity}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {new Date(log.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-semibold text-slate-900">
                      {log.campusName} — {log.linkName}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono text-slate-700">
                      {log.circuitId} ({log.provider})
                    </span>
                  </div>

                  <div className="text-sm font-medium text-slate-900">
                    {log.parsedSummary}
                  </div>

                  <pre className="text-xs font-mono text-slate-600 bg-slate-100 px-3 py-1.5 rounded overflow-x-auto">
                    {log.rawSyslog}
                  </pre>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {linkedIncident ? (
                    <div className="text-right text-xs font-mono">
                      <div className="text-slate-500">Linked Ticket:</div>
                      <div className="font-semibold text-slate-900">
                        {linkedIncident.ticketNumber} ({linkedIncident.status})
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCreateIncidentFromLog(log)}
                      className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      1-Click Autofill Incident
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
