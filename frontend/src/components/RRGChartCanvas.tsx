import React, { useRef, useEffect, useState } from "react";
import { RrgResponseData, QuadrantName } from "../types";

export interface RRGChartProps {
  data: RrgResponseData;
  selectedDateIndex: number;
  tailLength: number;
  visibleSectors: Set<string>;
  onSelectSector?: (sector: string) => void;
  hoveredSector?: string | null;
  onHoverSector?: (sector: string | null) => void;
}

const SECTOR_COLORS: Record<string, string> = {
  "^NSEBANK": "#3B82F6", // Blue
  "^CNXIT": "#10B981", // Emerald
  "^CNXAUTO": "#F59E0B", // Amber
  "^CNXFMCG": "#EC4899", // Pink
  "^CNXPHARMA": "#8B5CF6", // Purple
  "^CNXMETAL": "#06B6D4", // Cyan
  "NIFTY_FIN_SERVICE.NS": "#6366F1", // Indigo
  "^CNXMEDIA": "#F97316", // Orange
  "^CNXPSUBANK": "#14B8A6", // Teal
  "NIFTY_PVT_BANK.NS": "#3A82F6", // Sapphire
  "^CNXCONSUM": "#EAB308", // Yellow
  "^CNXENERGY": "#EF4444", // Red
  "^CNXREALTY": "#84CC16", // Lime
  "^CNXINFRA": "#A855F7", // Violet
  "^CNXSERVICE": "#F43F5E", // Rose
};

export function getSectorColor(ticker: string, idx: number): string {
  if (SECTOR_COLORS[ticker]) return SECTOR_COLORS[ticker];
  const fallbackColors = [
    "#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6",
    "#06B6D4", "#6366F1", "#F97316", "#14B8A6", "#84CC16"
  ];
  return fallbackColors[idx % fallbackColors.length];
}

export function getQuadrant(ratio: number, mom: number): QuadrantName {
  if (ratio >= 100 && mom >= 100) return "Leading";
  if (ratio >= 100 && mom < 100) return "Weakening";
  if (ratio < 100 && mom < 100) return "Lagging";
  return "Improving";
}

export const RRGChartCanvas: React.FC<RRGChartProps> = ({
  data,
  selectedDateIndex,
  tailLength,
  visibleSectors,
  onSelectSector,
  hoveredSector,
  onHoverSector,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    sector: string;
    ratio: number;
    mom: number;
    date: string;
    quadrant: QuadrantName;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas resolution setup
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    // Padding for axes and labels
    const padLeft = 60;
    const padRight = 40;
    const padTop = 40;
    const padBottom = 50;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Collect range min/max across all visible sectors up to selectedDateIndex
    let minX = 96;
    let maxX = 104;
    let minY = 96;
    let maxY = 104;

    const startIdx = Math.max(0, selectedDateIndex - tailLength + 1);

    for (const sec of data.sectors) {
      if (!visibleSectors.has(sec)) continue;
      const metrics = data.metrics[sec];
      if (!metrics) continue;

      for (let i = startIdx; i <= selectedDateIndex; i++) {
        const r = metrics.rsRatio[i];
        const m = metrics.rsMomentum[i];
        if (r !== null && r !== undefined) {
          if (r < minX) minX = r;
          if (r > maxX) maxX = r;
        }
        if (m !== null && m !== undefined) {
          if (m < minY) minY = m;
          if (m > maxY) maxY = m;
        }
      }
    }

    // Add padding around bounds
    const rangeX = Math.max(2, (maxX - minX) * 0.15);
    const rangeY = Math.max(2, (maxY - minY) * 0.15);

    const x0 = Math.min(95, minX - rangeX);
    const x1 = Math.max(105, maxX + rangeX);
    const y0 = Math.min(95, minY - rangeY);
    const y1 = Math.max(105, maxY + rangeY);

    const toCanvasX = (val: number) => padLeft + ((val - x0) / (x1 - x0)) * plotW;
    const toCanvasY = (val: number) => padTop + (1 - (val - y0) / (y1 - y0)) * plotH;

    const cx100 = toCanvasX(100);
    const cy100 = toCanvasY(100);

    // 1. Draw Quadrant Background Colors
    // Top-Right: LEADING (Green)
    ctx.fillStyle = "rgba(34, 197, 94, 0.07)";
    ctx.fillRect(cx100, padTop, padLeft + plotW - cx100, cy100 - padTop);

    // Bottom-Right: WEAKENING (Yellow)
    ctx.fillStyle = "rgba(234, 179, 8, 0.07)";
    ctx.fillRect(cx100, cy100, padLeft + plotW - cx100, padTop + plotH - cy100);

    // Bottom-Left: LAGGING (Red)
    ctx.fillStyle = "rgba(239, 68, 68, 0.07)";
    ctx.fillRect(padLeft, cy100, cx100 - padLeft, padTop + plotH - cy100);

    // Top-Left: IMPROVING (Blue)
    ctx.fillStyle = "rgba(59, 130, 246, 0.07)";
    ctx.fillRect(padLeft, padTop, cx100 - padLeft, cy100 - padTop);

    // 2. Draw Quadrant Watermark Titles
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";

    ctx.fillStyle = "rgba(34, 197, 94, 0.3)";
    ctx.fillText("LEADING", padLeft + plotW - 15, padTop + 15);

    ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(234, 179, 8, 0.35)";
    ctx.fillText("WEAKENING", padLeft + plotW - 15, padTop + plotH - 15);

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(239, 68, 68, 0.3)";
    ctx.fillText("LAGGING", padLeft + 15, padTop + plotH - 15);

    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(59, 130, 246, 0.3)";
    ctx.fillText("IMPROVING", padLeft + 15, padTop + 15);

    // 3. Draw Grid Lines & 100 Baselines
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";

    // Vertical 100 line
    ctx.beginPath();
    ctx.moveTo(cx100, padTop);
    ctx.lineTo(cx100, padTop + plotH);
    ctx.stroke();

    // Horizontal 100 line
    ctx.beginPath();
    ctx.moveTo(padLeft, cy100);
    ctx.lineTo(padLeft + plotW, cy100);
    ctx.stroke();

    ctx.setLineDash([]); // Reset dash

    // Axis Ticks & Labels
    ctx.font = "11px Inter, sans-serif";
    ctx.fillStyle = "#9CA3AF";
    ctx.textAlign = "center";

    const stepX = (x1 - x0) / 6;
    for (let i = 0; i <= 6; i++) {
      const val = x0 + i * stepX;
      const x = toCanvasX(val);
      ctx.fillText(val.toFixed(1), x, padTop + plotH + 18);
    }

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const stepY = (y1 - y0) / 6;
    for (let i = 0; i <= 6; i++) {
      const val = y0 + i * stepY;
      const y = toCanvasY(val);
      ctx.fillText(val.toFixed(1), padLeft - 10, y);
    }

    // Axis titles
    ctx.fillStyle = "#E5E7EB";
    ctx.font = "600 12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("JdK RS-Ratio (normalized, baseline 100)", padLeft + plotW / 2, height - 12);

    ctx.save();
    ctx.translate(16, padTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("JdK RS-Momentum (normalized, baseline 100)", 0, 0);
    ctx.restore();

    // 4. Draw Sector Trails & Dots
    data.sectors.forEach((sec, sIdx) => {
      if (!visibleSectors.has(sec)) return;
      const metrics = data.metrics[sec];
      if (!metrics) return;

      const baseColor = getSectorColor(sec, sIdx);
      const isHovered = hoveredSector === sec;

      const points: { x: number; y: number; ratio: number; mom: number; idx: number }[] = [];

      for (let i = startIdx; i <= selectedDateIndex; i++) {
        const r = metrics.rsRatio[i];
        const m = metrics.rsMomentum[i];
        if (r !== null && r !== undefined && m !== null && m !== undefined) {
          points.push({
            x: toCanvasX(r),
            y: toCanvasY(m),
            ratio: r,
            mom: m,
            idx: i,
          });
        }
      }

      if (points.length === 0) return;

      const nPts = points.length;

      // Draw fading trail lines
      if (nPts >= 2) {
        for (let i = 0; i < nPts - 1; i++) {
          const progress = (i + 1) / nPts;
          const alpha = 0.15 + 0.85 * progress;
          ctx.strokeStyle = baseColor;
          ctx.globalAlpha = isHovered ? Math.min(1, alpha * 1.3) : alpha;
          ctx.lineWidth = isHovered ? 3.5 : 2;

          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[i + 1].x, points[i + 1].y);
          ctx.stroke();
        }
      }

      // Draw trail dots
      for (let i = 0; i < nPts; i++) {
        const isHead = i === nPts - 1;
        const progress = (i + 1) / nPts;
        const alpha = isHead ? 1.0 : 0.2 + 0.7 * progress;
        const radius = isHead ? (isHovered ? 9 : 7) : 3;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(points[i].x, points[i].y, radius, 0, Math.PI * 2);
        ctx.fill();

        if (isHead) {
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Sector Label at Head
          ctx.font = "bold 12px Inter, sans-serif";
          ctx.fillStyle = baseColor;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";

          const labelText = sec.replace("^", "").replace(".NS", "");
          ctx.fillText(labelText, points[i].x + 12, points[i].y);
        }
      }

      ctx.globalAlpha = 1.0;
    });
  }, [data, selectedDateIndex, tailLength, visibleSectors, hoveredSector]);

  // Mouse hover event for interactive tooltips
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const padLeft = 60;
    const padRight = 40;
    const padTop = 40;
    const padBottom = 50;

    const plotW = rect.width - padLeft - padRight;
    const plotH = rect.height - padTop - padBottom;

    // Find nearest sector head point
    let minX = 96, maxX = 104, minY = 96, maxY = 104;
    const startIdx = Math.max(0, selectedDateIndex - tailLength + 1);

    for (const sec of data.sectors) {
      if (!visibleSectors.has(sec)) continue;
      const metrics = data.metrics[sec];
      if (!metrics) continue;

      for (let i = startIdx; i <= selectedDateIndex; i++) {
        const r = metrics.rsRatio[i];
        const m = metrics.rsMomentum[i];
        if (r !== null && r !== undefined) {
          if (r < minX) minX = r;
          if (r > maxX) maxX = r;
        }
        if (m !== null && m !== undefined) {
          if (m < minY) minY = m;
          if (m > maxY) maxY = m;
        }
      }
    }

    const rangeX = Math.max(2, (maxX - minX) * 0.15);
    const rangeY = Math.max(2, (maxY - minY) * 0.15);
    const x0 = Math.min(95, minX - rangeX);
    const x1 = Math.max(105, maxX + rangeX);
    const y0 = Math.min(95, minY - rangeY);
    const y1 = Math.max(105, maxY + rangeY);

    const toCanvasX = (val: number) => padLeft + ((val - x0) / (x1 - x0)) * plotW;
    const toCanvasY = (val: number) => padTop + (1 - (val - y0) / (y1 - y0)) * plotH;

    let closest: any = null;
    let minDist = 20; // 20px hit threshold

    for (const sec of data.sectors) {
      if (!visibleSectors.has(sec)) continue;
      const metrics = data.metrics[sec];
      if (!metrics) continue;

      const r = metrics.rsRatio[selectedDateIndex];
      const m = metrics.rsMomentum[selectedDateIndex];

      if (r !== null && r !== undefined && m !== null && m !== undefined) {
        const cx = toCanvasX(r);
        const cy = toCanvasY(m);
        const dist = Math.hypot(mouseX - cx, mouseY - cy);

        if (dist < minDist) {
          minDist = dist;
          closest = {
            x: cx,
            y: cy,
            sector: sec,
            ratio: r,
            mom: m,
            date: data.dates[selectedDateIndex],
            quadrant: getQuadrant(r, m),
          };
        }
      }
    }

    if (closest) {
      setTooltip(closest);
      onHoverSector?.(closest.sector);
    } else {
      setTooltip(null);
      onHoverSector?.(null);
    }
  };

  return (
    <div className="relative w-full h-[580px] glass-panel p-4 flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setTooltip(null);
          onHoverSector?.(null);
        }}
        onClick={() => {
          if (tooltip && onSelectSector) {
            onSelectSector(tooltip.sector);
          }
        }}
      />

      {/* Dynamic Hover Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none bg-slate-900/95 border border-slate-700/80 rounded-lg p-3 shadow-xl backdrop-blur-md text-xs font-sans text-slate-100"
          style={{
            left: `${Math.min(tooltip.x + 15, 600)}px`,
            top: `${Math.max(tooltip.y - 40, 20)}px`,
          }}
        >
          <div className="font-bold text-sm text-blue-400 mb-1">
            {tooltip.sector.replace("^", "").replace(".NS", "")}
          </div>
          <div className="text-slate-400 mb-1">Date: {tooltip.date}</div>
          <div className="flex items-center gap-2 font-mono my-0.5">
            <span>RS-Ratio:</span>
            <span className="font-semibold text-slate-200">{tooltip.ratio.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2 font-mono my-0.5">
            <span>RS-Momentum:</span>
            <span className="font-semibold text-slate-200">{tooltip.mom.toFixed(2)}</span>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex justify-between items-center gap-3">
            <span className="text-slate-400">Quadrant:</span>
            <span
              className={`font-semibold px-1.5 py-0.5 rounded text-[10px] uppercase ${
                tooltip.quadrant === "Leading"
                  ? "badge-leading"
                  : tooltip.quadrant === "Weakening"
                  ? "badge-weakening"
                  : tooltip.quadrant === "Lagging"
                  ? "badge-lagging"
                  : "badge-improving"
              }`}
            >
              {tooltip.quadrant}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
