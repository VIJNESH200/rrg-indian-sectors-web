import React from "react";
import { RrgResponseData, QuadrantName } from "../types";
import { getSectorName } from "../sectors";
import { getQuadrant } from "./RRGChartCanvas";
import { X } from "lucide-react";

interface Props {
  data: RrgResponseData;
  selectedDateIndex: number;
  selectedSector: string | null;
  onClearSelection: () => void;
}

/** Horizontal gauge meter — RS-Ratio & RS-Momentum */
const Gauge: React.FC<{ value: number; color: string; label: string; display: string }> = ({ value, color, label, display }) => {
  const pct = Math.max(0, Math.min(100, ((value - 95) / 10) * 100));
  return (
    <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto sm:min-w-[160px]">
      <span className="stat-label w-14 sm:w-16 shrink-0">{label}</span>
      <div className="flex-1 flex items-center gap-2">
        <div className="gauge-bar flex-1">
          <div className="gauge-bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="font-mono text-[12px] sm:text-[13px] font-bold w-12 sm:w-14 text-right shrink-0" style={{ color }}>{display}</span>
      </div>
    </div>
  );
};

export const SelectedSectorBar: React.FC<Props> = ({
  data, selectedDateIndex, selectedSector, onClearSelection,
}) => {
  if (!selectedSector) {
    return (
      <div
        className="flex items-center h-9 px-3.5 sm:px-4 rounded-lg text-[11px] font-mono text-slate-400 gap-2 overflow-hidden text-ellipsis whitespace-nowrap"
        style={{ border: "1px dashed rgba(255,255,255,0.05)", background: "var(--bg-surface)" }}
      >
        ↑ Click any sector on chart or table to pin metrics
      </div>
    );
  }

  const m = data.metrics[selectedSector];
  const ratio = m?.rsRatio[selectedDateIndex];
  const mom   = m?.rsMomentum[selectedDateIndex];
  const quadrant: QuadrantName | null = ratio != null && mom != null ? getQuadrant(ratio, mom) : null;

  const qClass = quadrant === "Leading" ? "qbadge-leading"
    : quadrant === "Weakening" ? "qbadge-weakening"
    : quadrant === "Lagging" ? "qbadge-lagging"
    : quadrant === "Improving" ? "qbadge-improving" : "";

  const ratioColor = ratio != null ? (ratio >= 100 ? "#4ADE80" : "#F87171") : "#4B5568";
  const momColor   = mom   != null ? (mom   >= 100 ? "#4ADE80" : "#F87171") : "#4B5568";

  return (
    <div
      className="card flex flex-wrap items-center justify-between sm:justify-start gap-x-4 sm:gap-x-6 gap-y-2.5 px-3.5 sm:px-5 py-2.5 sm:py-3"
      style={{ borderColor: "var(--border-md)", background: "var(--bg-surface)" }}
    >
      {/* Name + quadrant */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <span className="font-extrabold text-[13px] sm:text-[14px] text-white font-mono tracking-wide">
          {getSectorName(selectedSector).toUpperCase()}
        </span>
        {quadrant && <span className={`qbadge ${qClass}`}>{quadrant}</span>}
      </div>

      <span className="text-white/10 text-lg hidden sm:inline">│</span>

      {/* Clear button */}
      <button
        onClick={onClearSelection}
        className="sm:order-last flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border border-white/10 shrink-0"
      >
        <X className="w-3.5 h-3.5" /> Clear
      </button>

      {/* Gauge bars */}
      <div className="flex flex-col gap-1.5 w-full sm:w-auto sm:flex-1 sm:min-w-[320px]">
        {ratio != null && (
          <Gauge label="RS-Ratio" value={ratio} color={ratioColor} display={ratio.toFixed(2)} />
        )}
        {mom != null && (
          <Gauge label="RS-Mom" value={mom} color={momColor} display={mom.toFixed(2)} />
        )}
      </div>
    </div>
  );
};
