import React from "react";
import { RrgResponseData, QuadrantName } from "../types";
import { getSectorName, ALL_SECTORS } from "../sectors";
import { getSectorColor, getQuadrant } from "./RRGChartCanvas";
import { Info, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Clock } from "lucide-react";

export interface SectorDetailPanelProps {
  data: RrgResponseData;
  selectedDateIndex: number;
  selectedSector: string;
  onSelectSector: (sector: string) => void;
  visibleSectors: Set<string>;
  onToggleVisibleSector: (sector: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const SectorDetailPanel: React.FC<SectorDetailPanelProps> = ({
  data,
  selectedDateIndex,
  selectedSector,
  onSelectSector,
  visibleSectors,
  onToggleVisibleSector,
  onSelectAll,
  onDeselectAll,
}) => {
  const dateStr = data.dates[selectedDateIndex] || "N/A";
  const metrics = data.metrics[selectedSector];

  const ratio = metrics?.rsRatio[selectedDateIndex];
  const mom = metrics?.rsMomentum[selectedDateIndex];
  const fwdReturn = metrics?.forward4wReturn[selectedDateIndex];

  const currentPrice = data.prices[selectedSector]?.[selectedDateIndex];
  const benchmarkPrice = data.prices[data.benchmark]?.[selectedDateIndex];

  const quadrant: QuadrantName | "N/A" =
    ratio !== null && ratio !== undefined && mom !== null && mom !== undefined
      ? getQuadrant(ratio, mom)
      : "N/A";

  const isPendingFwd = fwdReturn === null || fwdReturn === undefined;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 1. Sector Selector Toggles */}
      <div className="glass-panel p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            Sector Filter ({visibleSectors.size}/{data.sectors.length})
          </h3>
          <div className="flex gap-2">
            <button onClick={onSelectAll} className="btn-secondary text-[11px] py-1 px-2">
              Select All
            </button>
            <button onClick={onDeselectAll} className="btn-secondary text-[11px] py-1 px-2">
              Deselect All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
          {data.sectors.map((sec, idx) => {
            const isVisible = visibleSectors.has(sec);
            const isSelected = selectedSector === sec;
            const color = getSectorColor(sec, idx);
            const name = getSectorName(sec);

            return (
              <div
                key={sec}
                onClick={() => {
                  onSelectSector(sec);
                }}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-all border ${
                  isSelected
                    ? "bg-slate-800/90 border-blue-500/60 shadow-sm"
                    : "bg-slate-900/50 border-slate-800 hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleVisibleSector(sec);
                    }}
                    className="rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-0 cursor-pointer"
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate text-slate-200 font-medium">{name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Active Sector Metrics Detail Box */}
      <div className="glass-panel p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="text-xs text-slate-400 font-mono">SELECTED SECTOR</div>
            <h2 className="text-lg font-bold text-slate-100">{getSectorName(selectedSector)}</h2>
          </div>
          {quadrant !== "N/A" && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                quadrant === "Leading"
                  ? "badge-leading"
                  : quadrant === "Weakening"
                  ? "badge-weakening"
                  : quadrant === "Lagging"
                  ? "badge-lagging"
                  : "badge-improving"
              }`}
            >
              {quadrant}
            </span>
          )}
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium">JdK RS-Ratio</div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-1">
              {ratio !== null && ratio !== undefined ? ratio.toFixed(2) : "N/A"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Baseline: 100</div>
          </div>

          <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium">JdK RS-Momentum</div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-1">
              {mom !== null && mom !== undefined ? mom.toFixed(2) : "N/A"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Baseline: 100</div>
          </div>
        </div>

        {/* 3. Decision #1 Forward 1-Month Return Feature */}
        <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700/60 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              Next 1-Month Sector Return (4-Wk)
            </span>
            {isPendingFwd ? (
              <span className="badge-pending px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> PENDING
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono">Historical Verified</span>
            )}
          </div>

          {isPendingFwd ? (
            <div className="text-xs text-slate-400 py-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              Future price data not yet available for dates within 4 weeks of latest available market snapshot.
            </div>
          ) : (
            <div className="flex items-baseline justify-between pt-1">
              <div className="flex items-center gap-2">
                {fwdReturn >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-rose-400" />
                )}
                <span
                  className={`text-2xl font-extrabold font-mono ${
                    fwdReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {(fwdReturn * 100).toFixed(2)}%
                </span>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                Sector own price 4 weeks ahead
              </div>
            </div>
          )}
        </div>

        {/* 4. Data Freshness Status */}
        <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/80">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Data Fresh (Weekly)
          </span>
          <span className="font-mono text-[11px] text-slate-500">As of {dateStr}</span>
        </div>
      </div>
    </div>
  );
};
