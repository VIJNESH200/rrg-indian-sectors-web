import React from "react";
import { RrgResponseData, QuadrantName } from "../types";
import { getSectorName } from "../sectors";
import { getQuadrant } from "./RRGChartCanvas";
import { X } from "lucide-react";

export interface SelectedSectorBarProps {
  data: RrgResponseData;
  selectedDateIndex: number;
  selectedSector: string | null;
  onClearSelection: () => void;
}

export const SelectedSectorBar: React.FC<SelectedSectorBarProps> = ({
  data,
  selectedDateIndex,
  selectedSector,
  onClearSelection,
}) => {
  if (!selectedSector) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-[11px] text-slate-600 font-mono border border-dashed border-white/[0.06] rounded-lg">
        <span>↑ Click any sector point on the chart or row in the table below to pin metrics</span>
      </div>
    );
  }

  const metrics = data.metrics[selectedSector];
  const ratio = metrics?.rsRatio[selectedDateIndex];
  const mom = metrics?.rsMomentum[selectedDateIndex];
  const fwdReturn = metrics?.forward4wReturn[selectedDateIndex];

  const quadrant: QuadrantName | "N/A" =
    ratio != null && mom != null ? getQuadrant(ratio, mom) : "N/A";

  const isPending = fwdReturn == null;

  const quadrantClass = quadrant === "Leading" ? "badge-leading"
    : quadrant === "Weakening" ? "badge-weakening"
    : quadrant === "Lagging" ? "badge-lagging"
    : quadrant === "Improving" ? "badge-improving"
    : "badge-pending";

  return (
    <div className="panel flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5 border-blue-500/25 bg-blue-950/20">
      {/* Sector name */}
      <span className="font-extrabold text-sm text-white font-mono tracking-wide">
        {getSectorName(selectedSector).toUpperCase()}
      </span>

      {/* Quadrant badge */}
      {quadrant !== "N/A" && (
        <span className={`badge ${quadrantClass}`}>{quadrant}</span>
      )}

      {/* Divider */}
      <span className="text-white/10 text-lg hidden sm:inline">|</span>

      {/* Metrics */}
      <div className="flex items-center gap-5 font-mono text-xs text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-[10px] uppercase tracking-wider">RS-Ratio</span>
          <span className="font-semibold text-slate-100">{ratio != null ? ratio.toFixed(2) : "—"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-[10px] uppercase tracking-wider">RS-Mom</span>
          <span className="font-semibold text-slate-100">{mom != null ? mom.toFixed(2) : "—"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-[10px] uppercase tracking-wider">4W Fwd</span>
          <span className={`font-semibold ${isPending ? "text-slate-500" : fwdReturn! >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {isPending ? "Pending" : `${fwdReturn! >= 0 ? "+" : ""}${(fwdReturn! * 100).toFixed(2)}%`}
          </span>
        </div>
      </div>

      {/* Clear button */}
      <button
        onClick={onClearSelection}
        className="ml-auto flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
      >
        <X className="w-3 h-3" /> Clear
      </button>
    </div>
  );
};
