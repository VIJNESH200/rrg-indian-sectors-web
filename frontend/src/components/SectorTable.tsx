import React from "react";
import { RrgResponseData, QuadrantName } from "../types";
import { getSectorName } from "../sectors";
import { getQuadrant, getSectorColor } from "./RRGChartCanvas";

export interface SectorTableProps {
  data: RrgResponseData;
  selectedDateIndex: number;
  visibleSectors: Set<string>;
  selectedSector: string | null;
  onSelectSector: (sector: string | null) => void;
}

export const SectorTable: React.FC<SectorTableProps> = ({
  data,
  selectedDateIndex,
  visibleSectors,
  selectedSector,
  onSelectSector,
}) => {
  const rows = data.sectors
    .filter((sec) => visibleSectors.has(sec))
    .map((sec, idx) => {
      const metrics = data.metrics[sec];
      const ratio = metrics?.rsRatio[selectedDateIndex];
      const mom = metrics?.rsMomentum[selectedDateIndex];
      const fwd = metrics?.forward4wReturn[selectedDateIndex];

      const quadrant: QuadrantName | "N/A" =
        ratio !== null && ratio !== undefined && mom !== null && mom !== undefined
          ? getQuadrant(ratio, mom)
          : "N/A";

      return {
        ticker: sec,
        name: getSectorName(sec),
        color: getSectorColor(sec, idx),
        ratio,
        mom,
        fwd,
        quadrant,
      };
    });

  return (
    <div className="panel overflow-hidden bg-[#121721] w-full">
      <div className="overflow-x-auto">
        <table className="rrg-table">
          <thead>
            <tr>
              <th>Sector</th>
              <th>Quadrant</th>
              <th className="text-right">RS-Ratio</th>
              <th className="text-right">RS-Momentum</th>
              <th className="text-right">4W Return</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelected = selectedSector === row.ticker;
              const isPending = row.fwd === null || row.fwd === undefined;

              return (
                <tr
                  key={row.ticker}
                  onClick={() => onSelectSector(isSelected ? null : row.ticker)}
                  className={isSelected ? "selected" : ""}
                >
                  <td className="font-medium flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    <span>{row.name}</span>
                  </td>
                  <td>
                    {row.quadrant !== "N/A" && (
                      <span
                        className={`badge ${
                          row.quadrant === "Leading"
                            ? "badge-leading"
                            : row.quadrant === "Weakening"
                            ? "badge-weakening"
                            : row.quadrant === "Lagging"
                            ? "badge-lagging"
                            : "badge-improving"
                        }`}
                      >
                        {row.quadrant}
                      </span>
                    )}
                  </td>
                  <td className="text-right font-mono text-slate-200">
                    {row.ratio !== null && row.ratio !== undefined ? row.ratio.toFixed(2) : "N/A"}
                  </td>
                  <td className="text-right font-mono text-slate-200">
                    {row.mom !== null && row.mom !== undefined ? row.mom.toFixed(2) : "N/A"}
                  </td>
                  <td className="text-right font-mono">
                    <span
                      className={
                        isPending
                          ? "text-slate-500 text-[11px]"
                          : row.fwd! >= 0
                          ? "text-emerald-400 font-semibold"
                          : "text-rose-400 font-semibold"
                      }
                    >
                      {isPending ? "Pending" : `${row.fwd! >= 0 ? "+" : ""}${(row.fwd! * 100).toFixed(2)}%`}
                    </span>
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
