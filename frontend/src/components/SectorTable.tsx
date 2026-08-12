import React, { useState, useRef, useEffect } from "react";
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
  timeframe?: "1wk" | "1d";
}

export const SectorTable: React.FC<Props> = ({
  data, selectedDateIndex, visibleSectors, selectedSector, onSelectSector, timeframe = "1wk",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);

  const updateScrollState = () => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setScrollPos(scrollLeft);
    setMaxScroll(Math.max(0, scrollWidth - clientWidth));
  };

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [data, visibleSectors]);

  const handleScroll = () => {
    updateScrollState();
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setScrollPos(val);
    if (containerRef.current) {
      containerRef.current.scrollLeft = val;
    }
  };

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
    <div className="card overflow-hidden flex flex-col">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-x-auto scrollbar-none"
        style={{ touchAction: "pan-x", WebkitOverflowScrolling: "touch" }}
      >
        <table className="sec-table table-fixed w-full min-w-[540px]">
          <thead>
            <tr style={{ background: "var(--bg-raised)" }}>
              <th
                className="w-[30%] text-left text-slate-300 px-4 py-2.5 sticky left-0 z-20 border-b"
                style={{ background: "var(--bg-raised)", borderColor: "var(--border)" }}
              >
                SECTOR
              </th>
              <th className="w-[18%] text-left text-slate-300 px-4 py-2.5">QUADRANT</th>
              <th className="w-[17%] text-right text-slate-300 px-4 py-2.5">RS-RATIO</th>
              <th className="w-[17%] text-right text-slate-300 px-4 py-2.5">RS-MOM</th>
              <th className="w-[18%] text-right text-slate-300 px-4 py-2.5">
                {timeframe === "1d" ? "4D FWD RETURN" : "4W FWD RETURN"}
              </th>
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
                  {/* Sector name + colour dot (Sticky Column) */}
                  <td
                    className="w-[30%] text-left px-4 py-2.5 sticky left-0 z-10"
                    style={{ background: isSel ? "#131E30" : "var(--bg-surface)" }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ background: color }} />
                      <span className="text-slate-100 font-semibold text-[12px] truncate">
                        {getSectorName(sec)}
                      </span>
                    </div>
                  </td>

                  {/* Quadrant badge */}
                  <td className="w-[18%] text-left px-4 py-2.5">
                    {quadrant && (
                      <span className={`qbadge ${qClass(quadrant)}`}>{quadrant}</span>
                    )}
                  </td>

                  {/* RS-Ratio */}
                  <td className="w-[17%] text-right px-4 py-2.5 font-mono text-[12px]">
                    <span className={ratio != null ? (ratio >= 100 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold") : "text-slate-400"}>
                      {ratio?.toFixed(2) ?? "—"}
                    </span>
                  </td>

                  {/* RS-Momentum */}
                  <td className="w-[17%] text-right px-4 py-2.5 font-mono text-[12px]">
                    <span className={mom != null ? (mom >= 100 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold") : "text-slate-400"}>
                      {mom?.toFixed(2) ?? "—"}
                    </span>
                  </td>

                  {/* 4W Forward Return */}
                  <td className="w-[18%] text-right px-4 py-2.5 font-mono text-[12px]">
                    <div className="flex items-center justify-end gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${isPending ? "text-slate-400" : fwd! >= 0 ? "text-emerald-400" : "text-rose-400"}`} />
                      <span className={isPending ? "text-slate-400 text-[11px] font-medium" : fwd! >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
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

      {/* Synchronized horizontal scroll range slider for mobile */}
      {maxScroll > 1 && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-t border-white/10 sm:hidden bg-[#14161B]">
          <span className="stat-label text-[9px] shrink-0">Scroll</span>
          <input
            type="range"
            min={0}
            max={maxScroll}
            value={scrollPos}
            onChange={handleSliderChange}
            className="flex-1 min-w-0"
          />
        </div>
      )}
    </div>
  );
};
