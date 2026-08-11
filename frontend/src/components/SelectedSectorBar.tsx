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

/** Horizontal gauge meter — like the HEALTH / MOMENTUM bars in the reference */
const Gauge: React.FC<{ value: number; color: string; label: string; display: string }> = ({ value, color, label, display }) => {
  // value is RS-Ratio or RS-Momentum centered around 100.  Map 95..105 → 0%..100%
  const pct = Math.max(0, Math.min(100, ((value - 95) / 10) * 100));
  return (
    <div className="flex items-center gap-3 min-w-[160px]">
      <span className="stat-label w-16">{label}</span>
      <div className="flex-1 flex items-center gap-2">
        <div className="gauge-bar flex-1">
          <div className="gauge-bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="font-mono text-[13px] font-bold w-14 text-right" style={{ color }}>{display}</span>
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
        className="flex items-center h-9 px-4 rounded-lg text-[11px] font-mono text-slate-400 gap-2"
        style={{ border: "1px dashed rgba(255,255,255,0.05)", background: "var(--bg-surface)" }}
      >
        ↑ Click any sector on the chart or table to pin its metrics
      </div>
    );
  }

  const m = data.metrics[selectedSector];
  const ratio = m?.rsRatio[selectedDateIndex];
  const mom   = m?.rsMomentum[selectedDateIndex];
  const fwd   = m?.forward4wReturn[selectedDateIndex];
  const quadrant: QuadrantName | null = ratio != null && mom != null ? getQuadrant(ratio, mom) : null;

  const qClass = quadrant === "Leading" ? "qbadge-leading"
    : quadrant === "Weakening" ? "qbadge-weakening"
    : quadrant === "Lagging" ? "qbadge-lagging"
    : quadrant === "Improving" ? "qbadge-improving" : "";

  const ratioColor = ratio != null ? (ratio >= 100 ? "#4ADE80" : "#F87171") : "#4B5568";
  const momColor   = mom   != null ? (mom   >= 100 ? "#4ADE80" : "#F87171") : "#4B5568";
  const fwdColor   = fwd   == null ? "#4B5568" : fwd >= 0 ? "#4ADE80" : "#F87171";

  return (
    <div
      className="card flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3"
      style={{ borderColor: "rgba(59,139,255,0.2)", background: "rgba(59,139,255,0.04)" }}
    >
      {/* Name + quadrant */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="font-extrabold text-[14px] text-white font-mono tracking-wide">
          {getSectorName(selectedSector).toUpperCase()}
        </span>
        {quadrant && <span className={`qbadge ${qClass}`}>{quadrant}</span>}
      </div>

      <span className="text-white/8 text-lg hidden sm:inline">│</span>

      {/* Gauge bars — the "alive" visual element */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-[350px]">
        {ratio != null && (
          <Gauge label="RS-Ratio" value={ratio} color={ratioColor} display={ratio.toFixed(2)} />
        )}
        {mom != null && (
          <Gauge label="RS-Mom" value={mom} color={momColor} display={mom.toFixed(2)} />
        )}
      </div>

      {/* 4W Forward return */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="stat-label">4W Fwd</span>
        <span className="font-mono text-[14px] font-bold" style={{ color: fwdColor }}>
          {fwd == null ? "Pending" : `${fwd >= 0 ? "+" : ""}${(fwd * 100).toFixed(2)}%`}
        </span>
      </div>

      {/* Clear */}
      <button
        onClick={onClearSelection}
        className="ml-auto flex items-center gap-1 text-[10px] text-slate-600 hover:text-white transition-colors"
      >
        <X className="w-3 h-3" /> Clear
      </button>
    </div>
  );
};
