import React from "react";
import { Activity } from "lucide-react";

export interface HeaderProps {
  latestDate?: string;
  isCached?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ latestDate }) => {
  return (
    <header className="flex items-center justify-between h-12 px-5 border-b border-white/[0.07] bg-[#0D1117] shrink-0">
      {/* Left: Brand */}
      <div className="flex items-center gap-3">
        <Activity className="w-4 h-4 text-blue-500" strokeWidth={2.5} />
        <span className="text-sm font-extrabold tracking-widest text-white font-mono uppercase">
          RRG INDIA
        </span>
        <span className="hidden sm:block text-white/20 text-xs">|</span>
        <span className="hidden sm:block text-xs text-slate-500 font-medium">
          NSE Sector Rotation
        </span>
      </div>

      {/* Right: Status & Date */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-400 font-semibold font-mono">LIVE</span>
        </div>
        {latestDate && (
          <span className="font-mono text-slate-400 text-[11px] border-l border-white/[0.08] pl-4">
            {latestDate}
          </span>
        )}
        <a
          href="https://github.com/VIJNESH200/rrg-indian-sectors-web"
          target="_blank"
          rel="noreferrer"
          className="text-slate-600 hover:text-slate-400 transition-colors text-[11px]"
        >
          GitHub
        </a>
      </div>
    </header>
  );
};
