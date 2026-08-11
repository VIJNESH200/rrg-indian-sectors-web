import React from "react";
import { Activity } from "lucide-react";

interface HeaderProps { latestDate?: string; }

export const Header: React.FC<HeaderProps> = ({ latestDate }) => (
  <header
    className="header-glow flex items-center justify-between h-11 px-5 shrink-0"
    style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
  >
    <div className="flex items-center gap-2 text-[13px]">
      <Activity className="w-3.5 h-3.5 text-[#3B8BFF]" strokeWidth={2.5} />
      <span className="font-bold text-white tracking-tight">RRG India</span>
      <span className="text-white/15">·</span>
      <span className="text-slate-500">NSE Sector Rotation</span>
      <span className="text-white/15">·</span>
      <span className="text-slate-500">Nifty 50</span>
      {latestDate && (
        <>
          <span className="text-white/15">·</span>
          <span className="font-mono text-[12px] text-slate-400">{latestDate}</span>
        </>
      )}
    </div>
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="live-dot w-[6px] h-[6px] rounded-full bg-emerald-500" />
        <span className="text-[11px] font-bold text-emerald-400 font-mono tracking-widest">LIVE</span>
      </div>
      <a href="https://github.com/VIJNESH200/rrg-indian-sectors-web"
        target="_blank" rel="noreferrer"
        className="text-[11px] text-slate-700 hover:text-slate-400 transition-colors ml-1">
        GitHub ↗
      </a>
    </div>
  </header>
);
