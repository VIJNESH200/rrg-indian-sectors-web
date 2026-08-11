import React from "react";
import { RrgResponseData, QuadrantName } from "../types";
import { getSectorName } from "../sectors";
import { getQuadrant, getSectorColor } from "./RRGChartCanvas";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  data: RrgResponseData;
  selectedDateIndex: number;
  visibleSectors: Set<string>;
  selectedSector: string | null;
  onSelectSector: (s: string | null) => void;
}

export const SectorTable: React.FC<Props> = ({
  data, selectedDateIndex, visibleSectors, selectedSector, onSelectSector,
}) => {
  const rows = data.sectors
    .filter(s => visibleSectors.has(s))
    .map((sec, idx) => {
      const m = data.metrics[sec];
      const ratio = m?.rsRatio[selectedDateIndex];
      const mom   = m?.rsMomentum[selectedDateIndex];
      const fwd   = m?.forward4wReturn[selectedDateIndex];
      const quadrant: QuadrantName | null =
        ratio != null && mom != null ? getQuadrant(ratio, mom) : null;
      return { sec, idx, ratio, mom, fwd, quadrant, color: getSectorColor(sec, idx) };
    });

  const qClass = (q: QuadrantName | null) =>
    q === "Leading" ? "qbadge-leading"
    : q === "Weakening" ? "qbadge-weakening"
    : q === "Lagging" ? "qbadge-lagging"
    : q === "Improving" ? "qbadge-improving" : "";

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="sec-table">
          <thead>
            <tr style={{ background: "var(--bg-raised)" }}>
              <th>Sector</th>
              <th>Quadrant</th>
              <th className="text-right">RS-Ratio</th>
              <th className="text-right">RS-Mom</th>
              <th className="text-right">4W Fwd Return</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ sec, idx, ratio, mom, fwd, quadrant, color }) => {
              const isSel = selectedSector === sec;
              const isPending = fwd == null;
              const Icon = isPending ? Minus : fwd! >= 0 ? TrendingUp : TrendingDown;

              return (
                <tr
                  key={sec}
                  onClick={() => onSelectSector(isSel ? null : sec)}
                  className={isSel ? "row-selected" : ""}
                >
                  {/* Sector name + colour dot */}
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-slate-200 font-medium text-[12px]">
                        {getSectorName(sec)}
                      </span>
                    </div>
                  </td>

                  {/* Quadrant badge */}
                  <td>
                    {quadrant && (
                      <span className={`qbadge ${qClass(quadrant)}`}>{quadrant}</span>
                    )}
                  </td>

                  {/* RS-Ratio */}
                  <td className="text-right font-mono text-[12px]">
                    <span className={ratio != null ? (ratio >= 100 ? "text-emerald-400" : "text-rose-400") : "text-slate-600"}>
                      {ratio?.toFixed(2) ?? "—"}
                    </span>
                  </td>

                  {/* RS-Momentum */}
                  <td className="text-right font-mono text-[12px]">
                    <span className={mom != null ? (mom >= 100 ? "text-emerald-400" : "text-rose-400") : "text-slate-600"}>
                      {mom?.toFixed(2) ?? "—"}
                    </span>
                  </td>

                  {/* 4W Forward Return */}
                  <td className="text-right font-mono text-[12px]">
                    <div className="flex items-center justify-end gap-1.5">
                      <Icon className={`w-3 h-3 ${isPending ? "text-slate-600" : fwd! >= 0 ? "text-emerald-400" : "text-rose-400"}`} />
                      <span className={isPending ? "text-slate-600 text-[11px]" : fwd! >= 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                        {isPending ? "Pending" : `${fwd! >= 0 ? "+" : ""}${(fwd! * 100).toFixed(2)}%`}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
