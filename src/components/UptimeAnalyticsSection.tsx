import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { CampusLink, IncidentTicket } from '../types/noc';

interface UptimeAnalyticsSectionProps {
  campuses: CampusLink[];
  incidents: IncidentTicket[];
}

export const UptimeAnalyticsSection: React.FC<UptimeAnalyticsSectionProps> = ({
  campuses,
  incidents,
}) => {
  const [selectedProviderFilter, setSelectedProviderFilter] =
    useState<string>('All');
  const [hoveredDayInfo, setHoveredDayInfo] = useState<{
    campusName: string;
    linkName: string;
    date: string;
    uptimePct: number;
    downtimeMinutes: number;
  } | null>(null);

  const providers = useMemo(() => {
    const set = new Set(campuses.map((c) => c.provider));
    return ['All', ...Array.from(set)];
  }, [campuses]);

  const filteredCampuses = useMemo(() => {
    if (selectedProviderFilter === 'All') return campuses;
    return campuses.filter((c) => c.provider === selectedProviderFilter);
  }, [campuses, selectedProviderFilter]);

  const providerRollup = useMemo(() => {
    const map = new Map<
      string,
      {
        provider: string;
        circuitCount: number;
        avgUptime30d: number;
        totalDowntimeMins30d: number;
        slaBreaches: number;
        activeIncidents: number;
      }
    >();

    for (const c of campuses) {
      const current = map.get(c.provider) || {
        provider: c.provider,
        circuitCount: 0,
        avgUptime30d: 0,
        totalDowntimeMins30d: 0,
        slaBreaches: 0,
        activeIncidents: 0,
      };
      current.circuitCount += 1;
      current.avgUptime30d += c.uptime30dPct;
      const downMins = c.dailyUptimeHistory.reduce(
        (acc, d) => acc + d.downtimeMinutes,
        0
      );
      current.totalDowntimeMins30d += downMins;
      if (c.uptime30dPct < c.slaTargetPct) {
        current.slaBreaches += 1;
      }
      const openCount = incidents.filter(
        (i) => i.campusId === c.id && i.status !== 'Resolved'
      ).length;
      current.activeIncidents += openCount;
      map.set(c.provider, current);
    }

    return Array.from(map.values()).map((item) => ({
      ...item,
      avgUptime30d: Number((item.avgUptime30d / item.circuitCount).toFixed(2)),
    }));
  }, [campuses, incidents]);

  const handleExportSlaCsv = () => {
    const headers = [
      'Campus Name',
      'Link Name',
      'Circuit ID',
      'Telco Provider',
      'Account Number',
      'Current Status',
      '30-Day Uptime (%)',
      '90-Day Uptime (%)',
      'SLA Target (%)',
      '30-Day Downtime (Mins)',
      'SLA Compliance',
    ];
    const rows = campuses.map((c) => {
      const totalDown = c.dailyUptimeHistory.reduce(
        (sum, d) => sum + d.downtimeMinutes,
        0
      );
      const compliant =
        c.uptime30dPct >= c.slaTargetPct ? 'COMPLIANT' : 'SLA BREACH';
      return [
        `"${c.campusName}"`,
        `"${c.linkName}"`,
        c.circuitId,
        `"${c.provider}"`,
        c.accountNumber,
        c.status === 'Operational' ? 'GREEN (GOOD & RESTORED)' : 'RED (DOWN)',
        c.uptime30dPct,
        c.uptime90dPct,
        c.slaTargetPct,
        totalDown,
        compliant,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      'cathedral_of_praise_uptime_sla_report.csv'
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Section Header + Provider Filter + CSV Export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Cathedral of Praise — Historical Uptime Analytics & Provider SLA
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            30-day and 90-day availability across all 13 campuses and 35 transport/internet links (Eastern, Converge, PLDT, Starlink).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {providers.map((prov) => (
              <button
                key={prov}
                type="button"
                onClick={() => setSelectedProviderFilter(prov)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedProviderFilter === prov
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {prov}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportSlaCsv}
            className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Export SLA Report (CSV)
          </button>
        </div>
      </div>

      {/* Telco Provider Performance Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Service Provider Availability & SLA Summary (30-Day Window)
          </h3>
          <span className="text-xs text-slate-500">
            Evaluated across all 35 Cathedral of Praise links
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">Service Provider</th>
                <th className="py-3 px-4 text-right">Monitored Links</th>
                <th className="py-3 px-4 text-right">30-Day Avg Uptime</th>
                <th className="py-3 px-4 text-right">Cumulative Downtime</th>
                <th className="py-3 px-4 text-right">Active Incidents</th>
                <th className="py-3 px-6 text-right">SLA Contract Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {providerRollup.map((row) => (
                <tr key={row.provider} className="hover:bg-slate-50">
                  <td className="py-3 px-6 font-semibold text-slate-900">
                    {row.provider}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                    {row.circuitCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {row.avgUptime30d.toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                    {row.totalDowntimeMins30d} mins
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                    {row.activeIncidents}
                  </td>
                  <td className="py-3 px-6 text-right font-medium">
                    {row.slaBreaches > 0 ? (
                      <span className="text-red-700 font-semibold">
                        {row.slaBreaches} Circuit Breach · Rebate Eligible
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">
                        Within Contracted SLA
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 30-Day Daily Uptime Heatmap Bars per Campus Link */}
      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              30-Day Daily Uptime Timeline by Campus & Link
            </h3>
            <p className="text-xs text-slate-500">
              Each vertical bar represents 24 hours. Green indicates 100% Good/Restored; Red indicates outage downtime.
            </p>
          </div>
          {hoveredDayInfo ? (
            <div className="text-xs font-mono tabular-nums text-slate-800 bg-slate-100 px-3 py-1.5 rounded">
              {hoveredDayInfo.campusName} ({hoveredDayInfo.linkName}) ·{' '}
              {hoveredDayInfo.date} · <strong>{hoveredDayInfo.uptimePct}%</strong>{' '}
              ({hoveredDayInfo.downtimeMinutes}m downtime)
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-mono">
              Green: Good / Restored · Red: Outage Recorded
            </div>
          )}
        </div>

        {filteredCampuses.map((campus) => {
          const totalDownMins = campus.dailyUptimeHistory.reduce(
            (acc, d) => acc + d.downtimeMinutes,
            0
          );
          const isDown = campus.status !== 'Operational';

          return (
            <div key={campus.id} className="p-5 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isDown ? 'bg-red-600' : 'bg-emerald-600'
                    }`}
                  />
                  <span className="text-sm font-semibold text-slate-900">
                    {campus.campusName} — {campus.linkName}
                  </span>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-xs font-mono text-slate-600">
                    {campus.circuitId}
                  </span>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-xs text-slate-600">
                    {campus.provider}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                  <span
                    className={
                      isDown
                        ? 'text-red-700 font-bold'
                        : 'text-emerald-700 font-bold'
                    }
                  >
                    {isDown ? 'RED (DOWN)' : 'GREEN (GOOD)'}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    30d Uptime:{' '}
                    <strong className="text-slate-900">
                      {campus.uptime30dPct.toFixed(2)}%
                    </strong>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>Downtime: {totalDownMins}m</span>
                </div>
              </div>

              <div className="grid grid-cols-30 gap-1 pt-1">
                {campus.dailyUptimeHistory.map((day) => {
                  const barColor =
                    day.downtimeMinutes === 0
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-red-600 hover:bg-red-500';
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onMouseEnter={() =>
                        setHoveredDayInfo({
                          campusName: campus.campusName,
                          linkName: campus.linkName,
                          date: day.date,
                          uptimePct: day.uptimePct,
                          downtimeMinutes: day.downtimeMinutes,
                        })
                      }
                      onFocus={() =>
                        setHoveredDayInfo({
                          campusName: campus.campusName,
                          linkName: campus.linkName,
                          date: day.date,
                          uptimePct: day.uptimePct,
                          downtimeMinutes: day.downtimeMinutes,
                        })
                      }
                      className={`h-6 w-full rounded-xs transition-opacity ${barColor}`}
                      title={`${day.date}: ${day.uptimePct}% uptime (${day.downtimeMinutes}m down)`}
                      aria-label={`${campus.campusName} ${campus.linkName} ${day.date} uptime ${day.uptimePct}%`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
