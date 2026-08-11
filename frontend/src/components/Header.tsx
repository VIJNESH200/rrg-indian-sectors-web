import React from "react";
import { Activity } from "lucide-react";

interface HeaderProps {
  latestDate?: string;
}

export const Header: React.FC<HeaderProps> = ({ latestDate }) => (
  <header
    className="flex items-center justify-between h-11 px-5 shrink-0"
    style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
  >
    {/* Left breadcrumb — mirrors "Macro Intelligence Platform · India CLI…" style */}
    <div className="flex items-center gap-2 text-[13px]">
      <Activity className="w-3.5 h-3.5 text-[#3B8BFF]" strokeWidth={2.5} />
      <span className="font-bold text-white tracking-tight">RRG India</span>
      <span className="text-white/20">·</span>
      <span className="text-slate-500">NSE Sector Rotation</span>
      <span className="text-white/20">·</span>
      <span className="text-slate-500">Nifty 50 benchmark</span>
      {latestDate && (
        <>
          <span className="text-white/20">·</span>
          <span className="font-mono text-[12px] text-slate-400">{latestDate}</span>
        </>
      )}
    </div>

    {/* Right — live pulse + link */}
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[11px] font-semibold text-emerald-400 font-mono tracking-wider">LIVE</span>
      </div>
      <a
        href="https://github.com/VIJNESH200/rrg-indian-sectors-web"
        target="_blank" rel="noreferrer"
        className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors ml-2"
      >
        GitHub ↗
      </a>
    </div>
  </header>
);
