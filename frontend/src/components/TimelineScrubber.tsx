import React, { useState, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, Calendar } from "lucide-react";

export interface TimelineScrubberProps {
  dates: string[];
  selectedIndex: number;
  onIndexChange: React.Dispatch<React.SetStateAction<number>>;
  tailLength: number;
  onTailLengthChange: (length: number) => void;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  dates,
  selectedIndex,
  onIndexChange,
  tailLength,
  onTailLengthChange,
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
      }, 400); // 400ms tick for smooth animation
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, dates.length, onIndexChange]);

  const currentDate = dates[selectedIndex] || "N/A";
  const maxIdx = Math.max(0, dates.length - 1);

  return (
    <div className="glass-panel p-4 flex flex-col md:flex-row items-center justify-between gap-4 w-full">
      {/* 1. Play / Pause & Navigation Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onIndexChange(0)}
          className="btn-secondary p-2 flex items-center justify-center rounded-lg"
          title="Jump to Start"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="btn-primary px-3 py-2 flex items-center gap-1.5 rounded-lg text-xs"
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4" /> Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> Play Rotation
            </>
          )}
        </button>

        <button
          onClick={() => onIndexChange(maxIdx)}
          className="btn-secondary p-2 flex items-center justify-center rounded-lg"
          title="Jump to Latest Date"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Timeline Scrubber Range Slider */}
      <div className="flex-1 flex flex-col gap-1 w-full max-w-xl">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            Date: <strong className="text-slate-100">{currentDate}</strong>
          </span>
          <span className="text-slate-500">
            {selectedIndex + 1} / {dates.length} weeks
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={maxIdx}
          value={selectedIndex}
          onChange={(e) => onIndexChange(Number(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* 3. Tail Length Selector */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400 font-medium">Trail Length:</span>
        <select
          value={tailLength}
          onChange={(e) => onTailLengthChange(Number(e.target.value))}
          className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500"
        >
          <option value={4}>4 Weeks</option>
          <option value={8}>8 Weeks</option>
          <option value={12}>12 Weeks (Default)</option>
          <option value={16}>16 Weeks</option>
          <option value={24}>24 Weeks</option>
        </select>
      </div>
    </div>
  );
};
