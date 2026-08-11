import React, { useRef, useEffect, useState } from "react";
import { RrgResponseData, QuadrantName } from "../types";
import { getSectorName } from "../sectors";

export interface RRGChartProps {
  data: RrgResponseData;
  selectedDateIndex: number;
  tailLength: number;
  visibleSectors: Set<string>;
  selectedSector: string | null;
  onSelectSector: (sector: string | null) => void;
  hoveredSector: string | null;
  onHoverSector: (sector: string | null) => void;
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
  "NIFTY_PVT_BANK.NS": "#3B82F6", // Sapphire
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

interface LabelBox {
  sector: string;
  x: number;
  y: number;
  w: number;
  h: number;
  headX: number;
  headY: number;
  color: string;
  labelText: string;
}

export const RRGChartCanvas: React.FC<RRGChartProps> = ({
  data,
  selectedDateIndex,
  tailLength,
  visibleSectors,
  selectedSector,
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
    fwdReturn: number | null;
    date: string;
    quadrant: QuadrantName;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI crisp canvas rendering
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    // Padding for axes & labels
    const padLeft = 65;
    const padRight = 50;
    const padTop = 45;
    const padBottom = 55;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Compute dynamic chart axis bounds across visible sectors up to selectedDateIndex
    let minX = 97;
    let maxX = 103;
    let minY = 97;
    let maxY = 103;

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

    // Add padding margins to bounds
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

    // 1. QUADRANT BACKGROUNDS (Restrained, professional dark palette)
    // Top-Right: LEADING (Subtle Green)
    ctx.fillStyle = "rgba(34, 197, 94, 0.04)";
    ctx.fillRect(cx100, padTop, padLeft + plotW - cx100, cy100 - padTop);

    // Bottom-Right: WEAKENING (Subtle Amber)
    ctx.fillStyle = "rgba(245, 158, 11, 0.04)";
    ctx.fillRect(cx100, cy100, padLeft + plotW - cx100, padTop + plotH - cy100);

    // Bottom-Left: LAGGING (Subtle Red)
    ctx.fillStyle = "rgba(239, 68, 68, 0.04)";
    ctx.fillRect(padLeft, cy100, cx100 - padLeft, padTop + plotH - cy100);

    // Top-Left: IMPROVING (Subtle Blue)
    ctx.fillStyle = "rgba(59, 130, 246, 0.04)";
    ctx.fillRect(padLeft, padTop, cx100 - padLeft, cy100 - padTop);

    // 2. QUADRANT WATERMARKS
    ctx.font = "700 14px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";

    ctx.fillStyle = "rgba(34, 197, 94, 0.25)";
    ctx.fillText("LEADING", padLeft + plotW - 15, padTop + 15);

    ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(245, 158, 11, 0.25)";
    ctx.fillText("WEAKENING", padLeft + plotW - 15, padTop + plotH - 15);

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
    ctx.fillText("LAGGING", padLeft + 15, padTop + plotH - 15);

    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(59, 130, 246, 0.25)";
    ctx.fillText("IMPROVING", padLeft + 15, padTop + 15);

    // 3. 100 BASELINE CROSS & GRID
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";

    // Vertical 100 Baseline
    ctx.beginPath();
    ctx.moveTo(cx100, padTop);
    ctx.lineTo(cx100, padTop + plotH);
    ctx.stroke();

    // Horizontal 100 Baseline
    ctx.beginPath();
    ctx.moveTo(padLeft, cy100);
    ctx.lineTo(padLeft + plotW, cy100);
    ctx.stroke();

    ctx.setLineDash([]); // Reset line dash

    // Outer plot frame
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.strokeRect(padLeft, padTop, plotW, plotH);

    // Axis Ticks & Numbers
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#6B7280";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const stepX = (x1 - x0) / 6;
    for (let i = 0; i <= 6; i++) {
      const val = x0 + i * stepX;
      const x = toCanvasX(val);
      ctx.fillText(val.toFixed(1), x, padTop + plotH + 12);
    }

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const stepY = (y1 - y0) / 6;
    for (let i = 0; i <= 6; i++) {
      const val = y0 + i * stepY;
      const y = toCanvasY(val);
      ctx.fillText(val.toFixed(1), padLeft - 10, y);
    }

    // Axis Labels
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "600 12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("RS-Ratio", padLeft + plotW / 2, height - 8);

    ctx.save();
    ctx.translate(18, padTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("RS-Momentum", 0, 0);
    ctx.restore();

    // 4. DRAW SECTOR TRAILS AND POINTS
    const labelBoxes: LabelBox[] = [];

    data.sectors.forEach((sec, sIdx) => {
      if (!visibleSectors.has(sec)) return;
      const metrics = data.metrics[sec];
      if (!metrics) return;

      const baseColor = getSectorColor(sec, sIdx);
      const isSelected = selectedSector === sec;
      const isHovered = hoveredSector === sec;
      const isDimmed = (selectedSector !== null && !isSelected) || (hoveredSector !== null && !isHovered && !isSelected);

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

      // Draw trail line
      if (nPts >= 2) {
        for (let i = 0; i < nPts - 1; i++) {
          const progress = (i + 1) / nPts;
          let alpha = 0.12 + 0.88 * progress;
          if (isDimmed) alpha *= 0.2;

          ctx.strokeStyle = baseColor;
          ctx.globalAlpha = isSelected || isHovered ? Math.min(1, alpha * 1.4) : alpha;
          ctx.lineWidth = isSelected || isHovered ? 3.5 : 2;

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
        let alpha = isHead ? 1.0 : 0.15 + 0.7 * progress;
        if (isDimmed && !isHead) alpha *= 0.2;

        const radius = isHead ? (isSelected || isHovered ? 8 : 6) : 2.5;

        ctx.globalAlpha = isDimmed ? 0.3 : alpha;
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(points[i].x, points[i].y, radius, 0, Math.PI * 2);
        ctx.fill();

        if (isHead) {
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = isSelected ? 2.5 : 1.5;
          ctx.stroke();

          // Prepare label for smart collision layout
          const labelText = getSectorName(sec);
          ctx.font = "600 11px Inter, sans-serif";
          const textW = ctx.measureText(labelText).width;
          const textH = 14;

          labelBoxes.push({
            sector: sec,
            x: points[i].x + 10,
            y: points[i].y - textH / 2,
            w: textW + 8,
            h: textH + 4,
            headX: points[i].x,
            headY: points[i].y,
            color: baseColor,
            labelText,
          });
        }
      }

      ctx.globalAlpha = 1.0;
    });

    // 5. SMART LABEL COLLISION AVOIDANCE ALGORITHM (Requirement #9)
    // Adjust label positions to prevent overlapping
    for (let i = 0; i < labelBoxes.length; i++) {
      const boxA = labelBoxes[i];
      for (let j = i + 1; j < labelBoxes.length; j++) {
        const boxB = labelBoxes[j];

        // Check AABB collision
        const collide =
          boxA.x < boxB.x + boxB.w &&
          boxA.x + boxA.w > boxB.x &&
          boxA.y < boxB.y + boxB.h &&
          boxA.y + boxA.h > boxB.y;

        if (collide) {
          // Reposition boxB vertically or left
          if (boxB.headY >= boxA.headY) {
            boxB.y = boxA.y + boxA.h + 4;
          } else {
            boxB.y = boxA.y - boxB.h - 4;
          }
        }
      }
    }

    // Render resolved labels & leader lines
    ctx.font = "600 11px Inter, sans-serif";
    labelBoxes.forEach((box) => {
      const isSelected = selectedSector === box.sector;
      const isHovered = hoveredSector === box.sector;
      const isDimmed = (selectedSector !== null && !isSelected) || (hoveredSector !== null && !isHovered && !isSelected);

      ctx.globalAlpha = isDimmed ? 0.3 : 1.0;

      // Draw leader line if offset is significant
      const dist = Math.hypot(box.x - box.headX, box.y + box.h / 2 - box.headY);
      if (dist > 16) {
        ctx.strokeStyle = box.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(box.headX, box.headY);
        ctx.lineTo(box.x, box.y + box.h / 2);
        ctx.stroke();
      }

      // Draw label background pill for max contrast
      ctx.fillStyle = isSelected ? "rgba(18, 23, 33, 0.95)" : "rgba(10, 13, 20, 0.85)";
      ctx.fillRect(box.x - 2, box.y - 2, box.w, box.h);
      ctx.strokeStyle = isSelected ? box.color : "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(box.x - 2, box.y - 2, box.w, box.h);

      // Draw label text
      ctx.fillStyle = isSelected ? "#FFFFFF" : box.color;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(box.labelText, box.x + 2, box.y + box.h / 2 - 1);
    });

    ctx.globalAlpha = 1.0;
  }, [data, selectedDateIndex, tailLength, visibleSectors, selectedSector, hoveredSector]);

  // Canvas Click & Mousemove handlers
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const padLeft = 65;
    const padRight = 50;
    const padTop = 45;
    const padBottom = 55;

    const plotW = rect.width - padLeft - padRight;
    const plotH = rect.height - padTop - padBottom;

    let minX = 97, maxX = 103, minY = 97, maxY = 103;
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

    let hitSector: string | null = null;
    let minDist = 22;

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
          hitSector = sec;
        }
      }
    }

    // REQUIREMENT #15: Clicking empty space clears selected sector
    onSelectSector(hitSector);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const padLeft = 65;
    const padRight = 50;
    const padTop = 45;
    const padBottom = 55;

    const plotW = rect.width - padLeft - padRight;
    const plotH = rect.height - padTop - padBottom;

    let minX = 97, maxX = 103, minY = 97, maxY = 103;
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
    let minDist = 22;

    for (const sec of data.sectors) {
      if (!visibleSectors.has(sec)) continue;
      const metrics = data.metrics[sec];
      if (!metrics) continue;

      const r = metrics.rsRatio[selectedDateIndex];
      const m = metrics.rsMomentum[selectedDateIndex];
      const fwd = metrics.forward4wReturn[selectedDateIndex];

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
            fwdReturn: fwd,
            date: data.dates[selectedDateIndex],
            quadrant: getQuadrant(r, m),
          };
        }
      }
    }

    if (closest) {
      setTooltip(closest);
      onHoverSector(closest.sector);
    } else {
      setTooltip(null);
      onHoverSector(null);
    }
  };

  return (
    <div className="relative w-full h-[620px] lg:h-[680px] panel p-2 flex flex-col items-center justify-center bg-[#121721] overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setTooltip(null);
          onHoverSector(null);
        }}
      />

      {/* REQUIREMENT #11: Compact Polished Hover Tooltip */}
      {tooltip && (
        <div
          className="absolute z-30 pointer-events-none bg-[#0D1117]/95 border border-slate-700/80 rounded-md p-2.5 shadow-2xl backdrop-blur-md text-xs font-sans text-slate-100 min-w-[170px]"
          style={{
            left: `${Math.min(tooltip.x + 12, 620)}px`,
            top: `${Math.max(tooltip.y - 45, 15)}px`,
          }}
        >
          <div className="font-bold text-sm text-blue-400 mb-1">
            {getSectorName(tooltip.sector)}
          </div>
          <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-slate-800">
            <span className="text-[10px] text-slate-400">Quadrant</span>
            <span
              className={`badge ${
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
          <div className="flex justify-between font-mono text-[11px] my-0.5">
            <span className="text-slate-400">RS-Ratio:</span>
            <span className="font-semibold text-slate-200">{tooltip.ratio.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-mono text-[11px] my-0.5">
            <span className="text-slate-400">RS-Momentum:</span>
            <span className="font-semibold text-slate-200">{tooltip.mom.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-mono text-[11px] mt-1 pt-1 border-t border-slate-800/80">
            <span className="text-slate-400">4W Return:</span>
            <span
              className={`font-semibold ${
                tooltip.fwdReturn === null || tooltip.fwdReturn === undefined
                  ? "text-slate-500"
                  : tooltip.fwdReturn >= 0
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              {tooltip.fwdReturn === null || tooltip.fwdReturn === undefined
                ? "Pending"
                : `${(tooltip.fwdReturn * 100).toFixed(2)}%`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
