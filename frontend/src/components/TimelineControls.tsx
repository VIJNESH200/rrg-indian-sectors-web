import React, { useState, useEffect } from "react";
import {
  RotateCcw, SkipBack, Play, Pause, SkipForward, ChevronLast
} from "lucide-react";
import { getSectorName } from "../sectors";
import { getSectorColor } from "./RRGChartCanvas";

export interface TimelineControlsProps {
  dates: string[];
  selectedIndex: number;
  onIndexChange: React.Dispatch<React.SetStateAction<number>>;
  tailLength: number;
  onTailLengthChange: (n: number) => void;
  sectors: string[];
  visibleSectors: Set<string>;
  onToggleSector: (s: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const TRAIL_OPTIONS = [4, 8, 12, 20];
const SPEED_OPTIONS = [1, 2, 3]; // ×

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  dates, selectedIndex, onIndexChange,
  tailLength, onTailLengthChange,
  sectors, visibleSectors, onToggleSector, onSelectAll,
}) => {
  const [playing, setPlaying]   = useState(false);
  const [speed, setSpeed]       = useState(1);          // 1× 2× 3×
  const [showTrail, setTrail]   = useState(true);
  const maxIdx = dates.length - 1;

  /* Playback */
  useEffect(() => {
    if (!playing) return;
    const ms = [350, 180, 80][speed - 1];
    const id = setInterval(() => {
      onIndexChange(prev => {
        if (prev >= maxIdx) { setPlaying(false); return prev; }
        return prev + 1;
      });
    }, ms);
    return () => clearInterval(id);
  }, [playing, speed, maxIdx, onIndexChange]);

  const goFirst = () => onIndexChange(0);
  const goLast  = () => onIndexChange(maxIdx);
  const stepBack  = () => onIndexChange(i => Math.max(0, i - 1));
  const stepFwd   = () => onIndexChange(i => Math.min(maxIdx, i + 1));

  return (
    <div className="card flex flex-col gap-0 overflow-hidden">
      {/* ── Row 1: transport controls + scrubber + date + trail pills ── */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {/* Transport */}
        <div className="flex items-center gap-0.5">
          <button className="btn-icon" onClick={() => { setPlaying(false); onIndexChange(0); }} title="Reset">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button className="btn-icon" onClick={stepBack} title="Step back">
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button className={`btn-icon ${playing ? "active" : ""}`} onClick={() => setPlaying(p => !p)}>
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button className="btn-icon" onClick={stepFwd} title="Step forward">
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button className="btn-icon" onClick={goLast} title="Go to latest">
            <ChevronLast className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrubber */}
        <input
          type="range" min={0} max={maxIdx} value={selectedIndex}
          onChange={e => onIndexChange(Number(e.target.value))}
          className="flex-1 min-w-0"
        />

        {/* Date badge */}
        <span
          className="font-mono text-[11px] text-slate-300 rounded px-2 py-0.5 shrink-0"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}
        >
          {dates[selectedIndex] ?? "—"}
        </span>
        <span className="text-[10px] text-slate-600 font-mono shrink-0">
          {selectedIndex + 1}/{dates.length}
        </span>

        {/* Speed pills */}
        <div className="flex items-center gap-0.5 shrink-0 ml-1">
          {SPEED_OPTIONS.map(s => (
            <button key={s} className={`pill px-1.5 ${speed === s ? "active" : ""}`}
              onClick={() => setSpeed(s)}>
              {s}×
            </button>
          ))}
        </div>

        {/* Trail length pills */}
        <div className="flex items-center gap-0.5 shrink-0 ml-2">
          <span className="stat-label mr-1">Trail</span>
          {TRAIL_OPTIONS.map(t => (
            <button key={t} className={`pill ${tailLength === t && showTrail ? "active" : ""}`}
              onClick={() => { setTrail(true); onTailLengthChange(t); }}>
              {t}W
            </button>
          ))}
        </div>
      </div>

      {/* ── Row 2: sector filter pills ── */}
      <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto">
        <span className="stat-label shrink-0">Sectors</span>
        <button
          onClick={onSelectAll}
          className={`pill ml-1 ${visibleSectors.size === sectors.length ? "active" : ""}`}
        >
          All
        </button>
        {sectors.map((sec, idx) => {
          const on = visibleSectors.has(sec);
          const color = getSectorColor(sec, idx);
          return (
            <button
              key={sec}
              onClick={() => onToggleSector(sec)}
              className="pill"
              style={on ? {
                background: `${color}1A`,
                borderColor: `${color}55`,
                color,
              } : { opacity: 0.4 }}
            >
              {getSectorName(sec)}
            </button>
          );
        })}
      </div>
    </div>
  );
};
