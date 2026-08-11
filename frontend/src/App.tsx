import React, { useState, useEffect } from "react";
import { RrgResponseData } from "./types";
import { Header } from "./components/Header";
import { RRGChartCanvas } from "./components/RRGChartCanvas";
import { TimelineControls } from "./components/TimelineControls";
import { SelectedSectorBar } from "./components/SelectedSectorBar";
import { SectorTable } from "./components/SectorTable";
import { RefreshCw, AlertTriangle } from "lucide-react";

import { exportRrgDataToCSV } from "./utils/exportCsv";

export function App() {
  const [data, setData]       = useState<RrgResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [timeframe, setTimeframe]   = useState<"1wk" | "1d">("1wk");
  const [dateIdx, setDateIdx]       = useState(0);
  const [tailLength, setTailLength] = useState(8);
  const [selected, setSelected]     = useState<string | null>(null);
  const [hovered, setHovered]       = useState<string | null>(null);
  const [visible, setVisible]       = useState<Set<string>>(new Set());

  const load = async (refresh = false, tf = timeframe) => {
    setLoading(true); setError(null);
    try {
      const BASE = "https://rrg-indian-sectors-api.rrg-indian-sectors.workers.dev/api/rrg-data";
      const api  = import.meta.env.VITE_API_URL || BASE;
      const paramSep = api.includes("?") ? "&" : "?";
      let url = `${api}${paramSep}interval=${tf}`;
      if (refresh) url += "&refresh=true";

      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j: RrgResponseData = await r.json();
      setData(j);
      if (j.dates?.length) setDateIdx(j.dates.length - 1);
      if (j.sectors?.length && visible.size === 0) {
        const DEFAULT_OFF_SECTORS = new Set([
          "NIFTY_FIN_SERVICE.NS",
          "^CNXPSUBANK",
          "NIFTY_PVT_BANK.NS",
          "^CNXSERVICE",
          "^CNXINFRA",
          "^CNXENERGY",
        ]);
        setVisible(new Set(j.sectors.filter((s) => !DEFAULT_OFF_SECTORS.has(s))));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(false, timeframe); }, []);

  const handleTimeframeChange = (tf: "1wk" | "1d") => {
    if (tf === timeframe) return;
    setTimeframe(tf);
    setTailLength(tf === "1d" ? 20 : 8);
    load(false, tf);
  };

  const toggleSector = (s: string) =>
    setVisible(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });

  /* Loading */
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4"
         style={{ background: "var(--bg-root)" }}>
      <RefreshCw className="w-8 h-8 text-[#3B8BFF] animate-spin" />
      <p className="text-[13px] font-mono text-slate-400 font-medium">
        Loading {timeframe === "1d" ? "Daily (1Y)" : "Weekly"} RRG sector data…
      </p>
    </div>
  );

  /* Error */
  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: "var(--bg-root)" }}>
      <div className="card p-8 max-w-xs w-full flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="w-10 h-10 text-rose-500" />
        <div>
          <p className="font-bold text-white mb-1">Failed to load</p>
          <p className="text-[12px] text-slate-500">{error}</p>
        </div>
        <button
          onClick={() => load(true, timeframe)}
          className="pill active mt-1 px-4 py-1.5 text-[12px]"
          style={{ background: "var(--accent-dim)", borderColor: "rgba(59,139,255,0.4)", color: "var(--accent)" }}
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-root)" }}>
      {/* ── Header ── */}
      <Header
        latestDate={data.dates[dateIdx] ?? data.dates[data.dates.length - 1]}
        timeframe={timeframe}
        onTimeframeChange={handleTimeframeChange}
        onExportCSV={() => exportRrgDataToCSV(data)}
      />

      {/* ── Main ── */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-2.5 sm:px-4 lg:px-6 py-2.5 sm:py-4 flex flex-col gap-2.5 sm:gap-3">

        {/* Large RRG chart */}
        <RRGChartCanvas
          data={data}
          selectedDateIndex={dateIdx}
          tailLength={tailLength}
          visibleSectors={visible}
          selectedSector={selected}
          onSelectSector={setSelected}
          hoveredSector={hovered}
          onHoverSector={setHovered}
        />

        {/* Transport + sector filter bar */}
        <TimelineControls
          dates={data.dates}
          selectedIndex={dateIdx}
          onIndexChange={setDateIdx}
          tailLength={tailLength}
          onTailLengthChange={setTailLength}
          timeframe={timeframe}
          sectors={data.sectors}
          visibleSectors={visible}
          onToggleSector={toggleSector}
          onSelectAll={() => setVisible(new Set(data.sectors))}
          onDeselectAll={() => setVisible(new Set())}
        />

        {/* Selected sector strip */}
        <SelectedSectorBar
          data={data}
          selectedDateIndex={dateIdx}
          selectedSector={selected}
          onClearSelection={() => setSelected(null)}
        />

        {/* Sector metrics table */}
        <SectorTable
          data={data}
          selectedDateIndex={dateIdx}
          visibleSectors={visible}
          selectedSector={selected}
          onSelectSector={setSelected}
          timeframe={timeframe}
        />
      </main>

      {/* ── Footer ── */}
      <footer
        className="shrink-0 px-5 py-3 flex justify-between items-center text-[11px] text-slate-300 font-medium"
        style={{ borderTop: "1px solid var(--border)", maxWidth: 1440, margin: "0 auto", width: "100%" }}
      >
        <span className="font-mono text-slate-400 font-medium">
          RRG India · {timeframe === "1d" ? "Daily (1Y)" : "Weekly"} · Nifty 50 benchmark
        </span>
        <span className="italic text-slate-300 font-medium hidden sm:block">
          Historical forward returns are descriptive, not predictive.
        </span>
      </footer>
    </div>
  );
}
