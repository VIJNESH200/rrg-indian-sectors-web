import React, { useState, useEffect } from "react";
import { RrgResponseData } from "./types";
import { RRGChartCanvas } from "./components/RRGChartCanvas";
import { SectorDetailPanel } from "./components/SectorDetailPanel";
import { TimelineScrubber } from "./components/TimelineScrubber";
import { ALL_SECTORS } from "./sectors";
import { RefreshCw, ShieldAlert, Layers, BarChart3, Cloud, Compass } from "lucide-react";

export function App() {
  const [data, setData] = useState<RrgResponseData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [tailLength, setTailLength] = useState<number>(12);
  const [selectedSector, setSelectedSector] = useState<string>("^NSEBANK");
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [visibleSectors, setVisibleSectors] = useState<Set<string>>(new Set());

  const fetchData = async (refresh: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = refresh ? "/api/rrg-data?refresh=true" : "/api/rrg-data";
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
        if (!json.sectors.includes(selectedSector)) {
          setSelectedSector(json.sectors[0]);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch RRG data:", err);
      setError(err.message || "Failed to load sector metrics.");
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
      <div className="min-h-screen bg-[#090D16] flex flex-col items-center justify-center text-slate-300 gap-4">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
        <div className="text-lg font-semibold tracking-wide">
          Calculating Indian Sector RRG Metrics...
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Fetching 5y weekly price history for Nifty 50 & 15+ sector indices
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#090D16] flex flex-col items-center justify-center p-6">
        <div className="glass-panel p-8 max-w-md w-full flex flex-col items-center text-center gap-4 border-rose-500/30">
          <ShieldAlert className="w-12 h-12 text-rose-500" />
          <h2 className="text-xl font-bold text-slate-100">Failed to Load Dashboard</h2>
          <p className="text-xs text-slate-400">{error}</p>
          <button onClick={() => fetchData(true)} className="btn-primary mt-2">
            Retry Computation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 p-4 lg:p-8 flex flex-col gap-6 max-w-[1600px] mx-auto">
      {/* 1. Header & System Status Bar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" /> NSE Sector Rotation Intelligence
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Relative Rotation Graphs (RRG)
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Quantitative rotational analysis comparing Indian sector indices against benchmark{" "}
            <span className="font-semibold text-slate-200">Nifty 50 ({data.benchmark})</span> using rolling JdK RS-Ratio and RS-Momentum metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            className="btn-secondary flex items-center gap-2 text-xs py-2 px-3"
            title="Force refresh KV cache"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
          </button>
          <div className="glass-panel py-1.5 px-3 flex items-center gap-2 text-xs text-slate-300">
            <Cloud className="w-4 h-4 text-emerald-400" />
            <span>Cloudflare Workers API</span>
          </div>
        </div>
      </header>

      {/* Warnings Banner if any tickers failed */}
      {data.fetchWarnings && data.fetchWarnings.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs p-3 rounded-lg flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Sector Fetch Warnings:</span>
            {data.fetchWarnings.map((w, idx) => (
              <span key={idx} className="font-mono text-[11px] opacity-90">
                • {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 2. Main Dashboard Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start dashboard-grid">
        {/* Left Column (2 spans): Interactive Chart & Scrubber */}
        <section className="lg:col-span-2 flex flex-col gap-4 w-full">
          <RRGChartCanvas
            data={data}
            selectedDateIndex={selectedDateIndex}
            tailLength={tailLength}
            visibleSectors={visibleSectors}
            onSelectSector={(sec) => setSelectedSector(sec)}
            hoveredSector={hoveredSector}
            onHoverSector={(sec) => setHoveredSector(sec)}
          />

          <TimelineScrubber
            dates={data.dates}
            selectedIndex={selectedDateIndex}
            onIndexChange={setSelectedDateIndex}
            tailLength={tailLength}
            onTailLengthChange={setTailLength}
          />
        </section>

        {/* Right Column (1 span): Sector Detail Panel & Metrics */}
        <section className="flex flex-col gap-4 w-full">
          <SectorDetailPanel
            data={data}
            selectedDateIndex={selectedDateIndex}
            selectedSector={selectedSector}
            onSelectSector={setSelectedSector}
            visibleSectors={visibleSectors}
            onToggleVisibleSector={handleToggleSector}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />
        </section>
      </main>

      {/* 3. Methodology & Disclaimer Footer (Phase 7) */}
      <footer className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-400 flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-slate-200 font-semibold mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" /> Methodology (JdK RRG)
            </h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Relative Rotation Graphs (RRG) visualize the relative strength and momentum of multiple securities against a benchmark. 
              <strong> RS-Ratio</strong> measures relative price performance normalized around 100 via a 14-period rolling z-score. 
              <strong> RS-Momentum</strong> measures the rate of change of relative strength normalized around 100.
            </p>
          </div>
          <div>
            <h4 className="text-slate-200 font-semibold mb-1 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" /> Forward Return Feature
            </h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              The 4-week forward return metric displays the sector index's own standalone price return 4 weeks following the selected historical date point. Points within 4 weeks of the latest market date display as <em>Pending</em>.
            </p>
          </div>
        </div>

        {/* Mandated One-Sentence Disclaimer */}
        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400 italic">
          <strong>Disclaimer:</strong> The forward 1-month return metric is strictly historical and descriptive of past performance; it is not predictive nor intended as a financial forecast.
        </div>
      </footer>
    </div>
  );
}
