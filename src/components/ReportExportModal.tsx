import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  Printer,
  Shield,
  X,
} from 'lucide-react';
import { CampusLink, IncidentTicket } from '../types/noc';
import { CopLogo } from './CopLogo';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  campuses: CampusLink[];
  incidents: IncidentTicket[];
  dutyOperatorName: string;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  isOpen,
  onClose,
  campuses,
  incidents,
  dutyOperatorName,
}) => {
  const [reportType, setReportType] = useState<
    'EXECUTIVE_PDF' | 'CIRCUITS_CSV' | 'INCIDENTS_CSV' | 'GITHUB_ZIP'
  >('EXECUTIVE_PDF');

  if (!isOpen) return null;

  const now = new Date();
  const timestampStr = now.toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });
  const dateFileStr = now.toISOString().slice(0, 10);

  const activeIncidents = incidents.filter((i) => i.status !== 'Resolved');
  const downLinks = campuses.filter((c) => c.status !== 'Operational');
  const operationalLinks = campuses.filter((c) => c.status === 'Operational');
  const overallUptime = (
    campuses.reduce((acc, curr) => acc + (curr.uptime30dPct || 100), 0) /
    (campuses.length || 1)
  ).toFixed(2);

  // Group by campus for the matrix
  const campusGroups: Record<string, CampusLink[]> = {};
  campuses.forEach((link) => {
    if (!campusGroups[link.campusName]) {
      campusGroups[link.campusName] = [];
    }
    campusGroups[link.campusName].push(link);
  });

  // Handler to export CSV
  const handleExportCircuitsCsv = () => {
    const headers = [
      'Campus Name',
      'Region',
      'Link Name',
      'Circuit ID',
      'Account Number',
      'Provider',
      'Link Role',
      'Bandwidth (Mbps)',
      'Current Status',
      '30-Day SLA Uptime %',
      'Provider Hotline',
      'Provider NOC Email',
    ];

    const rows = campuses.map((link) => [
      `"${link.campusName}"`,
      `"${link.region}"`,
      `"${link.linkName}"`,
      `"${link.circuitId}"`,
      `"${link.accountNumber}"`,
      `"${link.provider}"`,
      `"${link.linkRole}"`,
      link.bandwidthMbps,
      `"${link.status}"`,
      link.uptime30dPct,
      `"${link.providerHotline}"`,
      `"${link.providerNocEmail}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Cathedral_of_Praise_Campus_Circuits_${dateFileStr}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportIncidentsCsv = () => {
    const headers = [
      'Ticket Number',
      'Telco Reference Number',
      'Campus',
      'Link Name',
      'Status',
      'Escalation Level',
      'Problem Summary',
      'Outage Created At',
      'Expected Resolution (ETR)',
      'Resolved At',
      'Reported By',
    ];

    const rows = incidents.map((inc) => [
      `"${inc.ticketNumber}"`,
      `"${inc.telcoTicketNumber}"`,
      `"${inc.campusName}"`,
      `"${inc.linkName}"`,
      `"${inc.status}"`,
      `"${inc.escalationLevel}"`,
      `"${inc.problemSummary.replace(/"/g, '""')}"`,
      `"${inc.createdAt}"`,
      `"${inc.expectedResolutionAt || ''}"`,
      `"${inc.resolvedAt || ''}"`,
      `"${inc.reportedBy || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Cathedral_of_Praise_NOC_Incidents_${dateFileStr}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm p-4 overflow-y-auto flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <CopLogo size={32} />
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                NOC Report &amp; SLA Export Center
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  OFFICIAL AUDIT
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Generate executive-grade SLA reports, PDF status briefs, and CSV
                data sheets.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 text-xs font-semibold px-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setReportType('EXECUTIVE_PDF')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
              reportType === 'EXECUTIVE_PDF'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Executive SLA &amp; Status Brief (Print / PDF)
          </button>
          <button
            type="button"
            onClick={() => setReportType('CIRCUITS_CSV')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
              reportType === 'CIRCUITS_CSV'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Circuit Directory (.CSV)
          </button>
          <button
            type="button"
            onClick={() => setReportType('INCIDENTS_CSV')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
              reportType === 'INCIDENTS_CSV'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            Incident History Log (.CSV)
          </button>
          <button
            type="button"
            onClick={() => setReportType('GITHUB_ZIP')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
              reportType === 'GITHUB_ZIP'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            Download Codebase (.ZIP) &amp; GitHub
          </button>
        </div>

        {/* Modal Body / Report Preview */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {reportType === 'EXECUTIVE_PDF' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono text-[11px]">
                  Generated on: {timestampStr} · Prepared by: {dutyOperatorName}
                </span>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-cyan-600/30"
                >
                  <Printer className="w-4 h-4" />
                  Print / Save as PDF
                </button>
              </div>

              {/* Printable Document Canvas */}
              <div
                id="printableReportArea"
                className="bg-white text-slate-900 rounded-xl p-8 shadow-inner border border-slate-200 space-y-6 print:p-0 print:border-none print:shadow-none"
              >
                {/* Header Letterhead */}
                <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CopLogo size={48} />
                    <div>
                      <h1 className="text-lg font-black uppercase tracking-tight text-slate-900 leading-tight">
                        Cathedral of Praise
                      </h1>
                      <div className="text-xs font-bold text-indigo-700 tracking-wider">
                        NETWORK OPERATIONS CENTER — MULTI-CAMPUS SLA REPORT
                      </div>
                      <div className="text-[11px] text-slate-500">
                        350 Taft Avenue, Ermita, Manila, Philippines
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-bold text-slate-900">
                      EXECUTIVE NETWORK AUDIT
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {timestampStr}
                    </div>
                    <div className="text-[11px] font-mono text-emerald-700 font-bold">
                      SYSTEM STATUS: {downLinks.length === 0 ? 'ALL GREEN' : `${downLinks.length} LINK(S) OUTAGE`}
                    </div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">
                      Total Campuses
                    </div>
                    <div className="text-xl font-black text-slate-900">
                      {Object.keys(campusGroups).length}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">
                      Monitored Links
                    </div>
                    <div className="text-xl font-black text-slate-900">
                      {campuses.length}
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="text-[10px] font-bold text-emerald-800 uppercase">
                      Operational (Green)
                    </div>
                    <div className="text-xl font-black text-emerald-700">
                      {operationalLinks.length}
                    </div>
                  </div>
                  <div
                    className={`p-3 rounded-lg border ${
                      downLinks.length > 0
                        ? 'bg-rose-50 border-rose-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div
                      className={`text-[10px] font-bold uppercase ${
                        downLinks.length > 0
                          ? 'text-rose-800'
                          : 'text-slate-500'
                      }`}
                    >
                      Active Outages (Red)
                    </div>
                    <div
                      className={`text-xl font-black ${
                        downLinks.length > 0 ? 'text-rose-700' : 'text-slate-400'
                      }`}
                    >
                      {downLinks.length}
                    </div>
                  </div>
                </div>

                {/* Active Outage Incidents */}
                {activeIncidents.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Active Outages &amp; Trouble Tickets ({activeIncidents.length})
                    </h3>
                    <table className="w-full text-left text-xs border border-rose-200 rounded overflow-hidden">
                      <thead className="bg-rose-100 text-rose-900 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2">Ticket #</th>
                          <th className="p-2">Campus</th>
                          <th className="p-2">Link Name</th>
                          <th className="p-2">Telco Ref #</th>
                          <th className="p-2">Problem Summary</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 text-[11px]">
                        {activeIncidents.map((inc) => (
                          <tr key={inc.id} className="bg-rose-50/50">
                            <td className="p-2 font-mono font-bold text-rose-950">
                              {inc.ticketNumber}
                            </td>
                            <td className="p-2 font-semibold">
                              {inc.campusName}
                            </td>
                            <td className="p-2">{inc.linkName}</td>
                            <td className="p-2 font-mono text-slate-700">
                              {inc.telcoTicketNumber}
                            </td>
                            <td className="p-2 text-rose-900">
                              {inc.problemSummary}
                            </td>
                            <td className="p-2 font-bold text-rose-700">
                              {inc.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* All 17 Campuses Overview */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                    Campus Circuit Health Matrix (All 17 Campuses)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(campusGroups).map(([name, links]) => {
                      const hasDown = links.some((l) => l.status !== 'Operational');
                      return (
                        <div
                          key={name}
                          className={`p-2.5 rounded border text-xs ${
                            hasDown
                              ? 'bg-rose-50 border-rose-300'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold mb-1">
                            <span>{name}</span>
                            <span
                              className={`text-[10px] font-mono px-1 rounded ${
                                hasDown
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {hasDown ? 'OUTAGE' : 'GOOD'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono space-y-0.5">
                            {links.map((l) => (
                              <div
                                key={l.id}
                                className="flex items-center justify-between truncate"
                              >
                                <span className="truncate">{l.linkName}</span>
                                <span
                                  className={
                                    l.status === 'Operational'
                                      ? 'text-emerald-700 font-bold'
                                      : 'text-rose-700 font-bold'
                                  }
                                >
                                  {l.status === 'Operational' ? 'OK' : 'DOWN'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Signatures & Certification */}
                <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-[11px] text-slate-600">
                  <div>
                    <div className="font-bold text-slate-800">
                      Prepared &amp; Verified By:
                    </div>
                    <div className="mt-4 border-b border-slate-400 w-48"></div>
                    <div className="mt-1 font-semibold text-slate-900">
                      {dutyOperatorName}
                    </div>
                    <div className="text-slate-500">
                      Duty NOC Administrator / Engineer
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">
                      Approved for Cathedral of Praise:
                    </div>
                    <div className="mt-4 border-b border-slate-400 w-48"></div>
                    <div className="mt-1 font-semibold text-slate-900">
                      Jeffrey Nadado
                    </div>
                    <div className="text-slate-500">
                      Cathedral of Praise Network Operations Lead
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {reportType === 'CIRCUITS_CSV' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                  Campus Circuits &amp; Providers Export
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Downloads a structured spreadsheet (.CSV) containing all 47
                  links across all 17 Cathedral of Praise campuses. Includes
                  confidential Circuit IDs, PLDT account numbers, telco
                  providers, bandwidth, assigned IP blocks, SLA targets, and
                  hotlines.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleExportCircuitsCsv}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                  >
                    <Download className="w-4 h-4" />
                    Download Circuits CSV ({campuses.length} Links)
                  </button>
                </div>
              </div>
            </div>
          )}

          {reportType === 'INCIDENTS_CSV' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-cyan-400" />
                  Incident History &amp; Downtime Audit Export
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Downloads all logged tickets, outages, telco reference
                  numbers, downtime minutes, expected resolution timelines
                  (ETR), and resolution notes for carrier billing disputes and
                  SLA claims.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleExportIncidentsCsv}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/30"
                  >
                    <Download className="w-4 h-4" />
                    Download Incident Log CSV ({incidents.length} Tickets)
                  </button>
                </div>
              </div>
            </div>
          )}

          {reportType === 'GITHUB_ZIP' && (
            <div className="space-y-4">
              {/* Option A: Direct 1-Click ZIP Download */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FolderArchive className="w-4 h-4 text-cyan-400" />
                    Method 1: 1-Click Full Project Download (.ZIP)
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    COMPLETE CODEBASE
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed text-xs">
                  Download the entire application package containing all source code (<code>src/</code>, <code>server.ts</code>, <code>package.json</code>, Tailwind styling, and assets). You can extract it or upload all files directly to your GitHub repository.
                </p>
                <div>
                  <a
                    href="/cathedral-of-praise-noc.zip"
                    download="Cathedral_of_Praise_NOC_Full_Codebase.zip"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-emerald-600/30"
                  >
                    <Download className="w-4 h-4" />
                    Download Full Project (.ZIP)
                  </a>
                </div>
              </div>

              {/* Option B: Git Terminal Commands */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>💻</span> Method 2: Push All Files Using Git Terminal
                </h3>
                <p className="text-slate-400 text-xs">
                  To push the entire repository to your GitHub account from your terminal or command prompt:
                </p>
                <div className="bg-[#070d1a] border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-cyan-300 space-y-1 overflow-x-auto selection:bg-cyan-500 selection:text-black">
                  <div className="text-slate-500"># 1. Initialize git in your local project folder</div>
                  <div>git init</div>
                  <div className="text-slate-500"># 2. Stage all files (full source, server, configs)</div>
                  <div>git add .</div>
                  <div className="text-slate-500"># 3. Commit all project files</div>
                  <div>git commit -m &quot;Cathedral of Praise Multi-Campus NOC Full Codebase&quot;</div>
                  <div className="text-slate-500"># 4. Set default main branch</div>
                  <div>git branch -M main</div>
                  <div className="text-slate-500"># 5. Link to your GitHub repository (replace with your repo URL)</div>
                  <div>git remote add origin https://github.com/&lt;your-username&gt;/&lt;your-repo-name&gt;.git</div>
                  <div className="text-slate-500"># 6. Push all files to GitHub</div>
                  <div>git push -u origin main</div>
                </div>
              </div>

              {/* Option C: GitHub Desktop */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 text-[11px] leading-relaxed">
                <strong>Prefer a graphical tool?</strong> Install <span className="text-white font-bold">GitHub Desktop</span> (<a href="https://desktop.github.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">desktop.github.com</a>), extract the downloaded ZIP into a folder, choose <em>File &gt; Add Local Repository</em>, and click <em>Publish Repository</em>.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
