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

export const SelectedSectorBar: React.FC<Props> = ({
  data, selectedDateIndex, selectedSector, onClearSelection,
}) => {
  if (!selectedSector) {
    return (
      <div
        className="flex items-center h-9 px-4 rounded-lg text-[11px] font-mono text-slate-600 gap-2"
        style={{ border: "1px dashed rgba(255,255,255,0.07)", background: "var(--bg-surface)" }}
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

  return (
    <div
      className="card flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5"
      style={{ borderColor: "rgba(59,139,255,0.3)", background: "rgba(59,139,255,0.06)" }}
    >
      <span className="font-extrabold text-[13px] text-white font-mono tracking-wide">
        {getSectorName(selectedSector).toUpperCase()}
      </span>

      {quadrant && <span className={`qbadge ${qClass}`}>{quadrant}</span>}

      <span className="text-white/10 hidden sm:inline">│</span>

      <div className="flex items-center gap-5 font-mono text-[12px]">
        <div className="flex items-center gap-2">
          <span className="stat-label">RS-Ratio</span>
          <span className="text-slate-100 font-semibold">{ratio?.toFixed(2) ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="stat-label">RS-Mom</span>
          <span className="text-slate-100 font-semibold">{mom?.toFixed(2) ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="stat-label">4W Fwd</span>
          <span className={`font-semibold ${fwd == null ? "text-slate-600" : fwd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {fwd == null ? "Pending" : `${fwd >= 0 ? "+" : ""}${(fwd * 100).toFixed(2)}%`}
          </span>
        </div>
      </div>

      <button
        onClick={onClearSelection}
        className="ml-auto flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-300 transition-colors"
      >
        <X className="w-3 h-3" /> Clear
      </button>
    </div>
  );
};
