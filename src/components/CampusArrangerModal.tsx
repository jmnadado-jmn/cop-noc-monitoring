import React from 'react';
import {
  X,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sliders,
  Check,
  Grid,
  Columns,
  LayoutGrid,
  Layers,
  Sparkles,
  AlertTriangle,
  MoveUp,
  MoveDown,
} from 'lucide-react';

export type TemplateDensityMode =
  | 'ultra-compact'
  | 'compact'
  | 'comfortable'
  | 'executive';

export type GridColumnsMode = 'auto' | '2' | '3' | '4' | '5';
export type CardZoomScale = 'sm' | 'md' | 'lg';

interface CampusArrangerModalProps {
  isOpen: boolean;
  onClose: () => void;
  campusOrder: string[];
  onUpdateOrder: (newOrder: string[]) => void;
  onResetOrder: () => void;
  templateMode: TemplateDensityMode;
  onSelectTemplateMode: (mode: TemplateDensityMode) => void;
  gridColumns: GridColumnsMode;
  onSelectGridColumns: (cols: GridColumnsMode) => void;
  cardZoom: CardZoomScale;
  onSelectCardZoom: (zoom: CardZoomScale) => void;
  campusesWithStats: Array<{
    campusName: string;
    region: string;
    linkCount: number;
    hasOutage: boolean;
  }>;
}

export const TEMPLATE_OPTIONS: Array<{
  id: TemplateDensityMode;
  title: string;
  badge: string;
  desc: string;
  icon: string;
}> = [
  {
    id: 'ultra-compact',
    title: 'Ultra-Compact (NOC Matrix)',
    badge: 'Video Wall',
    desc: 'Dense single-line status pills without scrolling. Ideal for wall-mounted TV monitors.',
    icon: '⚡',
  },
  {
    id: 'compact',
    title: 'Compact (Standard Ops)',
    badge: 'Default',
    desc: 'Clean 2/3-row cards with quick toggle buttons, masked CID/Acct badges, and outage banners.',
    icon: '📊',
  },
  {
    id: 'comfortable',
    title: 'Comfortable (Telemetry)',
    badge: 'Network Tech',
    desc: 'Expanded view displaying optical Rx dBm, latency ms, packet loss %, interface names, & BGP IP.',
    icon: '📡',
  },
  {
    id: 'executive',
    title: 'Executive (SLA Analytics)',
    badge: 'Executive Desk',
    desc: 'Spacious cards with 30-day uptime sparkline charts, SLA compliance badges, & provider contacts.',
    icon: '📈',
  },
];

export const CampusArrangerModal: React.FC<CampusArrangerModalProps> = ({
  isOpen,
  onClose,
  campusOrder,
  onUpdateOrder,
  onResetOrder,
  templateMode,
  onSelectTemplateMode,
  gridColumns,
  onSelectGridColumns,
  cardZoom,
  onSelectCardZoom,
  campusesWithStats,
}) => {
  if (!isOpen) return null;

  const moveCampus = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= campusOrder.length) return;

    const newOrder = [...campusOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    onUpdateOrder(newOrder);
  };

  const moveToExtreme = (index: number, position: 'top' | 'bottom') => {
    const newOrder = [...campusOrder];
    const [item] = newOrder.splice(index, 1);
    if (position === 'top') {
      newOrder.unshift(item);
    } else {
      newOrder.push(item);
    }
    onUpdateOrder(newOrder);
  };

  // Sort Presets
  const applyPreset = (
    type: 'outages-first' | 'alphabetical' | 'by-region' | 'by-links'
  ) => {
    const list = [...campusOrder];
    const statsMap = new Map(campusesWithStats.map((c) => [c.campusName, c]));

    if (type === 'outages-first') {
      list.sort((a, b) => {
        const aStats = statsMap.get(a);
        const bStats = statsMap.get(b);
        const aOutage = aStats?.hasOutage ? 1 : 0;
        const bOutage = bStats?.hasOutage ? 1 : 0;
        return bOutage - aOutage;
      });
    } else if (type === 'alphabetical') {
      list.sort((a, b) => a.localeCompare(b));
    } else if (type === 'by-region') {
      list.sort((a, b) => {
        const aReg = statsMap.get(a)?.region || '';
        const bReg = statsMap.get(b)?.region || '';
        return aReg.localeCompare(bReg) || a.localeCompare(b);
      });
    } else if (type === 'by-links') {
      list.sort((a, b) => {
        const aCount = statsMap.get(a)?.linkCount || 0;
        const bCount = statsMap.get(b)?.linkCount || 0;
        return bCount - aCount;
      });
    }

    onUpdateOrder(list);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Wallboard Layout, Templates &amp; Campus Arrangement
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  CUSTOM VIEW
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Choose template density (4 modes), resize grid columns, or rearrange the order of campuses.
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Template Density (4 Options) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
                <Layers className="w-4 h-4" />
                1. Template Layout &amp; Density (4 Options)
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Current: <strong className="text-white uppercase">{templateMode}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {TEMPLATE_OPTIONS.map((opt) => {
                const isSelected = templateMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectTemplateMode(opt.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-400'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-lg">{opt.icon}</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            isSelected
                              ? 'bg-cyan-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white mb-1">
                        {opt.title}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="mt-3 pt-2 border-t border-cyan-500/30 flex items-center gap-1 text-[10px] text-cyan-300 font-bold">
                        <Check className="w-3.5 h-3.5" />
                        Active Template
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Grid Resizing & Zoom Scales */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
              <Grid className="w-4 h-4" />
              2. Grid Columns &amp; Card Scaling
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Columns Selector */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Grid Columns Across Screen:
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(
                    [
                      { id: 'auto', label: 'Auto' },
                      { id: '2', label: '2 Cols' },
                      { id: '3', label: '3 Cols' },
                      { id: '4', label: '4 Cols' },
                      { id: '5', label: '5 Cols' },
                    ] as const
                  ).map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => onSelectGridColumns(col.id)}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                        gridColumns === col.id
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  {gridColumns === 'auto'
                    ? 'Default dynamic layout (3 cols for 3-link hubs, 4 cols for 2-link regional).'
                    : `Forces uniform ${gridColumns} column grid across desktop screens.`}
                </p>
              </div>

              {/* Card Zoom / Spacing */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Card Padding &amp; Density Scale:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'sm', label: 'Small (Compact)' },
                      { id: 'md', label: 'Medium (Normal)' },
                      { id: 'lg', label: 'Large (Spacious)' },
                    ] as const
                  ).map((z) => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => onSelectCardZoom(z.id)}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                        cardZoom === z.id
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  Adjusts internal card padding, typography scale, and row gaps.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Arrange & Reorder Campus Cards */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
                  <Columns className="w-4 h-4" />
                  3. Campus Card Sequence &amp; Arrangement ({campusOrder.length} Campuses)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Use the arrows to shift campus positions, or apply one-click smart sort presets.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('outages-first')}
                  className="px-2.5 py-1 rounded bg-red-950/70 border border-red-700/60 text-red-300 text-[11px] font-semibold hover:bg-red-900/60 flex items-center gap-1 transition-colors"
                  title="Move all campuses with active RED link outages to the top"
                >
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  Red Outages First
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('alphabetical')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors"
                >
                  A → Z
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('by-region')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors"
                >
                  By Region
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('by-links')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors"
                >
                  By Circuits
                </button>
                <button
                  type="button"
                  onClick={onResetOrder}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  title="Restore default Cathedral of Praise hub order"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>
            </div>

            {/* Draggable / Reorderable Campus List */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl divide-y divide-slate-800/80 max-h-72 overflow-y-auto">
              {campusOrder.map((campusName, idx) => {
                const stats = campusesWithStats.find(
                  (c) => c.campusName === campusName
                );
                const isFirst = idx === 0;
                const isLast = idx === campusOrder.length - 1;

                return (
                  <div
                    key={campusName}
                    className="px-3.5 py-2 flex items-center justify-between gap-3 hover:bg-slate-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-bold text-slate-500 w-6">
                        #{idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">
                            {campusName}
                          </span>
                          {stats?.hasOutage ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-red-600 text-white animate-pulse">
                              OUTAGE
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              OPERATIONAL
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {stats?.region || 'COP Campus'} · {stats?.linkCount || 2} circuits
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveToExtreme(idx, 'top')}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Move to Very Top"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveCampus(idx, 'up')}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Move Up 1 Position"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveCampus(idx, 'down')}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Move Down 1 Position"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveToExtreme(idx, 'bottom')}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Move to Very Bottom"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={onResetOrder}
            className="text-xs text-slate-400 hover:text-cyan-400 font-semibold flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Default Settings
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Apply &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
