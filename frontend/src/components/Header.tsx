import React from "react";
import { Activity, Download, Calendar } from "lucide-react";

interface HeaderProps {
  latestDate?: string;
  timeframe: "1wk" | "1d";
  onTimeframeChange: (tf: "1wk" | "1d") => void;
  onExportCSV?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  latestDate,
  timeframe,
  onTimeframeChange,
  onExportCSV,
}) => (
  <header
    className="header-glow flex items-center justify-between h-11 px-5 shrink-0"
    style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
  >
    <div className="flex items-center gap-2 text-[13px]">
      <Activity className="w-3.5 h-3.5 text-[#3B8BFF]" strokeWidth={2.5} />
      <span className="font-bold text-white tracking-tight">RRG India</span>
      <span className="text-white/15">·</span>
      <span className="text-slate-400 font-medium">NSE Sector Rotation</span>
      <span className="text-white/15">·</span>
      <span className="text-slate-400 font-medium">
        {timeframe === "1d" ? "Daily (1Y)" : "Weekly"}
      </span>
      {latestDate && (
        <>
          <span className="text-white/15">·</span>
          <span className="font-mono text-[12px] text-slate-300 font-semibold">{latestDate}</span>
        </>
      )}
    </div>

    <div className="flex items-center gap-3">
      {/* Timeframe Switcher */}
      <div className="flex items-center rounded bg-[#14161B] p-0.5 border border-white/15 shadow-inner">
        <button
          onClick={() => onTimeframeChange("1wk")}
          className={`px-2.5 py-0.5 text-[11px] font-semibold rounded transition-all cursor-pointer ${
            timeframe === "1wk"
              ? "bg-[#3B8BFF] text-white font-bold shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
          title="Switch to Weekly RRG sector rotation"
        >
          Weekly
        </button>
        <button
          onClick={() => onTimeframeChange("1d")}
          className={`px-2.5 py-0.5 text-[11px] font-semibold rounded transition-all cursor-pointer ${
            timeframe === "1d"
              ? "bg-[#3B8BFF] text-white font-bold shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
          title="Switch to Daily (1 Year) RRG sector rotation"
        >
          Daily (1Y)
        </button>
      </div>

      {onExportCSV && (
        <button
          onClick={onExportCSV}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50 transition-all cursor-pointer shadow-sm"
          title="Download RRG sector dataset as CSV/Excel"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV / Excel
        </button>
      )}

      <div className="flex items-center gap-1.5">
        <span className="live-dot w-[6px] h-[6px] rounded-full bg-emerald-500" />
        <span className="text-[11px] font-bold text-emerald-400 font-mono tracking-widest">LIVE</span>
      </div>

      <a
        href="https://github.com/VIJNESH200/rrg-indian-sectors-web"
        target="_blank"
        rel="noreferrer"
        className="text-[11px] text-slate-400 hover:text-white transition-colors ml-1 font-medium"
      >
        GitHub ↗
      </a>
    </div>
  </header>
);
