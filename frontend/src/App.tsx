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
      if (!res.ok) {
        throw new Error(`API returned HTTP ${res.status}`);
      }
      const json: RrgResponseData = await res.json();
      setData(json);

      if (json.dates && json.dates.length > 0) {
        setSelectedDateIndex(json.dates.length - 1);
      }

      if (json.sectors && json.sectors.length > 0) {
        setVisibleSectors(new Set(json.sectors));
      }
    } catch (err: any) {
      console.error("Failed to fetch RRG data:", err);
      setError(err.message || "Unable to load RRG data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectAll = () => {
    if (data) setVisibleSectors(new Set(data.sectors));
  };

  const handleDeselectAll = () => {
    setVisibleSectors(new Set());
  };

  const handleToggleSector = (sec: string) => {
    setVisibleSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sec)) {
        next.delete(sec);
      } else {
        next.add(sec);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0D14] flex flex-col items-center justify-center text-slate-300 gap-3">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <div className="text-sm font-semibold tracking-wide text-slate-200">
          Loading RRG data...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0A0D14] flex flex-col items-center justify-center p-6">
        <div className="panel p-6 max-w-sm w-full flex flex-col items-center text-center gap-3 bg-[#121721]">
          <AlertTriangle className="w-10 h-10 text-rose-500" />
          <h2 className="text-base font-bold text-slate-100">Unable to load RRG data</h2>
          <p className="text-xs text-slate-400">Please try again.</p>
          <button onClick={() => fetchData(true)} className="btn-control active mt-2 py-1.5 px-4">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const latestDate = data.dates[selectedDateIndex] || data.dates[data.dates.length - 1];

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col justify-between">
      <div>
        {/* 1. Header */}
        <Header latestDate={latestDate} isCached={data.cached} />

        {/* 2. Main Centerpiece RRG Application Layout */}
        <main className="max-w-[1440px] mx-auto p-3 lg:p-5 flex flex-col gap-3">
          {/* LARGE RRG CHART */}
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

          {/* Timeline & Controls Bar */}
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

          {/* Compact Selected Sector Horizontal Strip */}
          <SelectedSectorBar
            data={data}
            selectedDateIndex={selectedDateIndex}
            selectedSector={selectedSector}
            onClearSelection={() => setSelectedSector(null)}
          />

          {/* Compact Sector Table */}
          <SectorTable
            data={data}
            selectedDateIndex={selectedDateIndex}
            visibleSectors={visibleSectors}
            selectedSector={selectedSector}
            onSelectSector={setSelectedSector}
          />
        </main>
      </div>

      {/* 3. Minimal Discrete Footer */}
      <footer className="py-3 px-4 border-t border-[rgba(255,255,255,0.06)] text-[11px] text-slate-500 flex justify-between items-center max-w-[1440px] mx-auto w-full">
        <span>RRG India Sector Rotation Engine</span>
        <span className="italic">
          Historical 4-week forward returns are descriptive of past performance, not predictive forecasts.
        </span>
      </footer>
    </div>
  );
}
