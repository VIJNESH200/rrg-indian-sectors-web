import React, { useState, useEffect } from "react";
import { RrgResponseData } from "./types";
import { Header } from "./components/Header";
import { RRGChartCanvas } from "./components/RRGChartCanvas";
import { TimelineControls } from "./components/TimelineControls";
import { SelectedSectorBar } from "./components/SelectedSectorBar";
import { SectorTable } from "./components/SectorTable";
import { RefreshCw, AlertTriangle } from "lucide-react";

export function App() {
  const [data, setData] = useState<RrgResponseData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [tailLength, setTailLength] = useState<number>(12);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [visibleSectors, setVisibleSectors] = useState<Set<string>>(new Set());

  const fetchData = async (refresh: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const DEFAULT_API_URL = "https://rrg-indian-sectors-api.rrg-indian-sectors.workers.dev/api/rrg-data";
      const apiBase = import.meta.env.VITE_API_URL || DEFAULT_API_URL;
      const url = refresh ? `${apiBase}${apiBase.includes("?") ? "&" : "?"}refresh=true` : apiBase;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API returned HTTP ${res.status}`);
      const json: RrgResponseData = await res.json();
      setData(json);
      if (json.dates?.length > 0) setSelectedDateIndex(json.dates.length - 1);
      if (json.sectors?.length > 0) setVisibleSectors(new Set(json.sectors));
    } catch (err: any) {
      setError(err.message || "Unable to load RRG data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSelectAll = () => { if (data) setVisibleSectors(new Set(data.sectors)); };
  const handleDeselectAll = () => setVisibleSectors(new Set());
  const handleToggleSector = (sec: string) => {
    setVisibleSectors((prev) => {
      const next = new Set(prev);
      next.has(sec) ? next.delete(sec) : next.add(sec);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0D14] flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-400 tracking-wide font-mono">
          Loading RRG data from Cloudflare...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center p-6">
        <div className="panel p-8 max-w-sm w-full flex flex-col items-center text-center gap-4">
          <AlertTriangle className="w-10 h-10 text-rose-500" />
          <div>
            <h2 className="text-base font-bold text-slate-100 mb-1">Failed to load</h2>
            <p className="text-xs text-slate-500">{error}</p>
          </div>
          <button onClick={() => fetchData(true)} className="btn-control active mt-1">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const latestDate = data.dates[selectedDateIndex] ?? data.dates[data.dates.length - 1];

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col">
      {/* ── Header ── */}
      <Header latestDate={latestDate} isCached={data.cached} />

      {/* ── Main scrollable content ── */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-3 lg:px-6 py-3 flex flex-col gap-3">

        {/* Large centerpiece RRG chart */}
        <RRGChartCanvas
          data={data}
          selectedDateIndex={selectedDateIndex}
          tailLength={tailLength}
          visibleSectors={visibleSectors}
          selectedSector={selectedSector}
          onSelectSector={setSelectedSector}
          hoveredSector={hoveredSector}
          onHoverSector={setHoveredSector}
        />

        {/* Timeline scrubber + sector filters */}
        <TimelineControls
          dates={data.dates}
          selectedIndex={selectedDateIndex}
          onIndexChange={setSelectedDateIndex}
          tailLength={tailLength}
          onTailLengthChange={setTailLength}
          sectors={data.sectors}
          visibleSectors={visibleSectors}
          onToggleSector={handleToggleSector}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
        />

        {/* Selected sector info bar */}
        <SelectedSectorBar
          data={data}
          selectedDateIndex={selectedDateIndex}
          selectedSector={selectedSector}
          onClearSelection={() => setSelectedSector(null)}
        />

        {/* Sector metrics table */}
        <SectorTable
          data={data}
          selectedDateIndex={selectedDateIndex}
          visibleSectors={visibleSectors}
          selectedSector={selectedSector}
          onSelectSector={setSelectedSector}
        />
      </main>

      {/* ── Footer ── */}
      <footer className="shrink-0 w-full max-w-[1440px] mx-auto px-5 py-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-slate-600">
        <span className="font-mono">RRG India · Nifty 50 benchmark · Weekly</span>
        <span className="italic hidden sm:block">
          Historical forward returns are descriptive, not predictive.
        </span>
      </footer>
    </div>
  );
}
