import React, { useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { getSectorName } from "../sectors";
import { getSectorColor } from "./RRGChartCanvas";

export interface TimelineControlsProps {
  dates: string[];
  selectedIndex: number;
  onIndexChange: React.Dispatch<React.SetStateAction<number>>;
  tailLength: number;
  onTailLengthChange: (length: number) => void;
  sectors: string[];
  visibleSectors: Set<string>;
  onToggleSector: (sector: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  dates,
  selectedIndex,
  onIndexChange,
  tailLength,
  onTailLengthChange,
  sectors,
  visibleSectors,
  onToggleSector,
  onSelectAll,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        onIndexChange((prev: number) => {
          if (prev >= dates.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 280);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isPlaying, dates.length, onIndexChange]);

  const currentDate = dates[selectedIndex] || "—";
  const maxIdx = Math.max(0, dates.length - 1);
  const trailOptions = [4, 8, 12, 20];

  return (
    <div className="panel flex flex-col gap-0 overflow-hidden">
      {/* Row 1: Timeline scrubber */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06]">
        {/* Play / Pause */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`btn-control shrink-0 ${isPlaying ? "active" : ""}`}
        >
          {isPlaying ? (
            <><Pause className="w-3 h-3" /> Pause</>
          ) : (
            <><Play className="w-3 h-3" /> Play</>
          )}
        </button>

        {/* Scrubber */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <input
            type="range"
            min={0}
            max={maxIdx}
            value={selectedIndex}
            onChange={(e) => onIndexChange(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Date badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[11px] text-slate-300 bg-white/[0.06] rounded px-2 py-0.5 border border-white/[0.08]">
            {currentDate}
          </span>
          <span className="text-[10px] text-slate-600 font-mono">
            {selectedIndex + 1}/{dates.length}
          </span>
        </div>

        {/* Trail selector */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mr-0.5">Trail</span>
          {trailOptions.map((t) => (
            <button
              key={t}
              onClick={() => onTailLengthChange(t)}
              className={`btn-control px-2 py-0.5 text-[11px] ${tailLength === t ? "active" : ""}`}
            >
              {t}W
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Sector filter pills */}
      <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto">
        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider shrink-0 mr-1">Sectors</span>
        <button
          onClick={onSelectAll}
          className={`btn-control text-[11px] px-2 py-0.5 ${visibleSectors.size === sectors.length ? "active" : ""}`}
        >
          All
        </button>
        {sectors.map((sec, idx) => {
          const isVisible = visibleSectors.has(sec);
          const name = getSectorName(sec);
          const color = getSectorColor(sec, idx);
          return (
            <button
              key={sec}
              onClick={() => onToggleSector(sec)}
              className="btn-control text-[11px] px-2 py-0.5"
              style={isVisible ? {
                backgroundColor: `${color}22`,
                borderColor: `${color}66`,
                color: color,
              } : {
                opacity: 0.45,
              }}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
};
