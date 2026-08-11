import React, { useRef, useEffect, useState, useCallback } from "react";
import { RrgResponseData, QuadrantName } from "../types";
import { getSectorName } from "../sectors";

/* ─── Colour map ─── */
const SECTOR_COLORS: Record<string, string> = {
  "^NSEBANK":           "#3B8BFF",
  "^CNXIT":             "#10B981",
  "^CNXAUTO":           "#F59E0B",
  "^CNXFMCG":           "#EC4899",
  "^CNXPHARMA":         "#A78BFA",
  "^CNXMETAL":          "#22D3EE",
  "NIFTY_FIN_SERVICE.NS":"#6366F1",
  "^CNXMEDIA":          "#F97316",
  "^CNXPSUBANK":        "#14B8A6",
  "NIFTY_PVT_BANK.NS":  "#60A5FA",
  "^CNXENERGY":         "#EF4444",
  "^CNXREALTY":         "#84CC16",
  "^CNXINFRA":          "#A855F7",
  "^CNXSERVICE":        "#F43F5E",
};
const FALLBACK = ["#3B8BFF","#10B981","#F59E0B","#EC4899","#A78BFA","#22D3EE","#6366F1","#F97316","#14B8A6","#84CC16"];

export function getSectorColor(ticker: string, idx: number): string {
  return SECTOR_COLORS[ticker] ?? FALLBACK[idx % FALLBACK.length];
}

export function getQuadrant(ratio: number, mom: number): QuadrantName {
  if (ratio >= 100 && mom >= 100) return "Leading";
  if (ratio >= 100 && mom <  100) return "Weakening";
  if (ratio <  100 && mom <  100) return "Lagging";
  return "Improving";
}

/* ─── helpers ─── */
interface Pt { x: number; y: number; ratio: number; mom: number; }
interface LabelBox {
  sector: string; x: number; y: number; w: number; h: number;
  headX: number; headY: number; color: string; text: string; dimmed: boolean; selected: boolean;
}

export interface RRGChartProps {
  data: RrgResponseData;
  selectedDateIndex: number;
  tailLength: number;
  visibleSectors: Set<string>;
  selectedSector: string | null;
  onSelectSector: (s: string | null) => void;
  hoveredSector: string | null;
  onHoverSector:  (s: string | null) => void;
}

/* ─── component ─── */
export const RRGChartCanvas: React.FC<RRGChartProps> = ({
  data, selectedDateIndex, tailLength,
  visibleSectors, selectedSector, onSelectSector, hoveredSector, onHoverSector,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* tooltip state */
  const [tooltip, setTooltip] = useState<{
    canvasX: number; canvasY: number; sector: string;
    ratio: number; mom: number; fwd: number | null; quadrant: QuadrantName;
  } | null>(null);

  /* ── axis bounds memoisation ── */
  const computeBounds = useCallback(() => {
    let minX = 97, maxX = 103, minY = 97, maxY = 103;
    const startIdx = Math.max(0, selectedDateIndex - tailLength + 1);
    for (const sec of data.sectors) {
      if (!visibleSectors.has(sec)) continue;
      const m = data.metrics[sec]; if (!m) continue;
      for (let i = startIdx; i <= selectedDateIndex; i++) {
        const r = m.rsRatio[i], mo = m.rsMomentum[i];
        if (r != null) { minX = Math.min(minX, r); maxX = Math.max(maxX, r); }
        if (mo != null){ minY = Math.min(minY, mo); maxY = Math.max(maxY, mo); }
      }
    }
    const rx = Math.max(1.5, (maxX - minX) * 0.14);
    const ry = Math.max(1.5, (maxY - minY) * 0.14);
    return {
      x0: Math.min(95.5, minX - rx), x1: Math.max(104.5, maxX + rx),
      y0: Math.min(95.5, minY - ry), y1: Math.max(104.5, maxY + ry),
    };
  }, [data, selectedDateIndex, tailLength, visibleSectors]);

  /* ── draw ── */
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width, H = rect.height;
    ctx.clearRect(0, 0, W, H);

    /* paddings */
    const PL = 56, PR = 20, PT = 24, PB = 44;
    const PW = W - PL - PR, PH = H - PT - PB;

    const { x0, x1, y0, y1 } = computeBounds();
    const toX = (v: number) => PL + ((v - x0) / (x1 - x0)) * PW;
    const toY = (v: number) => PT + (1 - (v - y0) / (y1 - y0)) * PH;

    const cx100 = toX(100), cy100 = toY(100);

    /* ── 1. Quadrant fills (very subtle — matches macro-intelligence charcoal glows) ── */
    const fills: [number, number, number, number, string][] = [
      // x, y, w, h, color — warmer, more visible zones
      [cx100, PT,      PL + PW - cx100, cy100 - PT,      "rgba(34,197,94,0.09)"],   // LEADING   top-right
      [cx100, cy100,   PL + PW - cx100, PT + PH - cy100, "rgba(251,146,60,0.09)"],  // WEAKENING bottom-right
      [PL,    cy100,   cx100 - PL,      PT + PH - cy100, "rgba(239,68,68,0.09)"],   // LAGGING   bottom-left
      [PL,    PT,      cx100 - PL,      cy100 - PT,      "rgba(59,139,255,0.09)"],  // IMPROVING top-left
    ];
    fills.forEach(([x, y, w, h, c]) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); });

    /* ── 2. Quadrant watermark labels (same style as EXPANSION / SLOWDOWN etc.) ── */
    const watermarks: [string, number, number, CanvasTextAlign, CanvasTextBaseline, string][] = [
      ["LEADING",   PL + PW - 12, PT + 12,      "right", "top",    "rgba(34,197,94,0.35)"],
      ["WEAKENING", PL + PW - 12, PT + PH - 12, "right", "bottom", "rgba(251,146,60,0.35)"],
      ["LAGGING",   PL + 12,      PT + PH - 12, "left",  "bottom", "rgba(239,68,68,0.35)"],
      ["IMPROVING", PL + 12,      PT + 12,      "left",  "top",    "rgba(59,139,255,0.35)"],
    ];
    ctx.font = "700 11px Inter, sans-serif";
    ctx.letterSpacing = "0.08em";
    watermarks.forEach(([txt, x, y, align, base, color]) => {
      ctx.textAlign = align as CanvasTextAlign;
      ctx.textBaseline = base as CanvasTextBaseline;
      ctx.fillStyle = color;
      ctx.fillText(txt, x, y);
    });
    ctx.letterSpacing = "0";

    /* ── 3. Grid + 100 baselines ── */
    /* Soft grid */
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    const gridStepsX = 6, gridStepsY = 6;
    for (let i = 0; i <= gridStepsX; i++) {
      const v = x0 + (i / gridStepsX) * (x1 - x0);
      const x = toX(v);
      ctx.beginPath(); ctx.moveTo(x, PT); ctx.lineTo(x, PT + PH); ctx.stroke();
    }
    for (let i = 0; i <= gridStepsY; i++) {
      const v = y0 + (i / gridStepsY) * (y1 - y0);
      const y = toY(v);
      ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(PL + PW, y); ctx.stroke();
    }

    /* 100 baselines — dashed, slightly brighter */
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(cx100, PT); ctx.lineTo(cx100, PT + PH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PL, cy100); ctx.lineTo(PL + PW, cy100); ctx.stroke();
    ctx.setLineDash([]);

    /* Plot frame */
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.strokeRect(PL, PT, PW, PH);

    /* ── 4. Axis ticks & labels ── */
    ctx.fillStyle = "#4B5568";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i <= gridStepsX; i++) {
      const v = x0 + (i / gridStepsX) * (x1 - x0);
      ctx.fillText(v.toFixed(1), toX(v), PT + PH + 8);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= gridStepsY; i++) {
      const v = y0 + (i / gridStepsY) * (y1 - y0);
      ctx.fillText(v.toFixed(1), PL - 8, toY(v));
    }

    /* Axis titles */
    ctx.fillStyle = "#6B7280";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("RS-Ratio (Relative Strength)", PL + PW / 2, H - 4);
    ctx.save();
    ctx.translate(14, PT + PH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = "top";
    ctx.fillText("RS-Momentum", 0, 0);
    ctx.restore();

    /* ── 5. Trails & sector heads ── */
    const startIdx = Math.max(0, selectedDateIndex - tailLength + 1);
    const labelBoxes: LabelBox[] = [];

    data.sectors.forEach((sec, sIdx) => {
      if (!visibleSectors.has(sec)) return;
      const m = data.metrics[sec]; if (!m) return;
      const color = getSectorColor(sec, sIdx);
      const isSel = selectedSector === sec;
      const isHov = hoveredSector === sec;
      const dimmed = (selectedSector != null && !isSel) || (hoveredSector != null && !isHov && !isSel);

      const pts: Pt[] = [];
      for (let i = startIdx; i <= selectedDateIndex; i++) {
        const r = m.rsRatio[i], mo = m.rsMomentum[i];
        if (r != null && mo != null) pts.push({ x: toX(r), y: toY(mo), ratio: r, mom: mo });
      }
      if (pts.length === 0) return;
      const N = pts.length;

      /* trail line — segment-by-segment fade */
      for (let i = 0; i < N - 1; i++) {
        const t = (i + 1) / N;
        const alpha = dimmed ? (0.08 + 0.12 * t) : (0.12 + 0.88 * t);
        ctx.globalAlpha = isSel || isHov ? Math.min(1, alpha * 1.4) : alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = isSel ? 3 : isHov ? 2.5 : 1.8;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[i+1].x, pts[i+1].y);
        ctx.stroke();
      }

      /* history dots — larger, warmer */
      for (let i = 0; i < N - 1; i++) {
        const t = (i + 1) / N;
        const alpha = dimmed ? 0.08 : (0.1 + 0.55 * t);
        const dotR = 1.5 + 1.5 * t;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      /* head dot — EVERY head gets a warm radial glow */
      const head = pts[N - 1];
      const hr = isSel ? 9 : isHov ? 8 : 6;
      ctx.globalAlpha = dimmed ? 0.3 : 1;

      /* outer glow — always present, just bigger for selected */
      const glowR = isSel ? 22 : isHov ? 18 : 14;
      ctx.beginPath();
      ctx.arc(head.x, head.y, glowR, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(head.x, head.y, hr * 0.3, head.x, head.y, glowR);
      g.addColorStop(0, color + (dimmed ? "18" : isSel ? "60" : "40"));
      g.addColorStop(0.6, color + (dimmed ? "08" : "18"));
      g.addColorStop(1, color + "00");
      ctx.fillStyle = g;
      ctx.fill();

      /* solid core dot */
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(head.x, head.y, hr, 0, Math.PI * 2);
      ctx.fill();
      /* white border ring */
      ctx.strokeStyle = dimmed ? "rgba(255,255,255,0.4)" : "#FFFFFF";
      ctx.lineWidth = isSel ? 2.5 : 1.5;
      ctx.stroke();

      /* label bookkeeping */
      ctx.font = "600 11px Inter, sans-serif";
      const tw = ctx.measureText(getSectorName(sec)).width;
      labelBoxes.push({
        sector: sec,
        x: head.x + 10, y: head.y - 9,
        w: tw + 10, h: 18,
        headX: head.x, headY: head.y,
        color, text: getSectorName(sec),
        dimmed, selected: isSel,
      });

      ctx.globalAlpha = 1;
    });

    /* ── 6. Collision-resolved labels ── */
    for (let i = 0; i < labelBoxes.length; i++) {
      for (let j = i + 1; j < labelBoxes.length; j++) {
        const a = labelBoxes[i], b = labelBoxes[j];
        if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
          if (b.headY >= a.headY) b.y = a.y + a.h + 3;
          else b.y = a.y - b.h - 3;
        }
      }
    }

    ctx.font = "600 11px Inter, sans-serif";
    labelBoxes.forEach(({ sector, x, y, w, h, headX, headY, color, text, dimmed, selected }) => {
      ctx.globalAlpha = dimmed ? 0.28 : 1;

      /* leader line */
      const dist = Math.hypot(x - headX, (y + h / 2) - headY);
      if (dist > 14) {
        ctx.strokeStyle = color + "88";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(headX, headY); ctx.lineTo(x, y + h / 2); ctx.stroke();
      }

      /* pill background — darker to match theme */
      ctx.fillStyle = selected ? "#14161BF5" : "#0E1014EE";
      roundRect(ctx, x - 2, y - 1, w, h, 4);
      ctx.fill();
      ctx.strokeStyle = selected ? color + "BB" : "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      /* text */
      ctx.fillStyle = selected ? "#FFFFFF" : color;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x + 3, y + h / 2);
      ctx.globalAlpha = 1;
    });

  }, [data, selectedDateIndex, tailLength, visibleSectors, selectedSector, hoveredSector, computeBounds]);

  /* ── hit test helper ── */
  const hitTest = useCallback((canvasX: number, canvasY: number) => {
    const canvas = canvasRef.current; if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    const PL = 56, PR = 20, PT = 24, PB = 44;
    const PW = W - PL - PR;
    const { x0, x1, y0, y1 } = computeBounds();
    const toX = (v: number) => PL + ((v - x0) / (x1 - x0)) * PW;
    const toY = (v: number) => PT + (1 - (v - y0) / (y1 - y0)) * (H - PT - PB);

    let best: string | null = null, bestDist = 24;
    for (const sec of data.sectors) {
      if (!visibleSectors.has(sec)) continue;
      const m = data.metrics[sec]; if (!m) continue;
      const r = m.rsRatio[selectedDateIndex], mo = m.rsMomentum[selectedDateIndex];
      if (r == null || mo == null) continue;
      const d = Math.hypot(canvasX - toX(r), canvasY - toY(mo));
      if (d < bestDist) { bestDist = d; best = sec; }
    }
    return best;
  }, [data, selectedDateIndex, visibleSectors, computeBounds]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    onSelectSector(hitTest(e.clientX - rect.left, e.clientY - rect.top));
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const sec = hitTest(cx, cy);
    onHoverSector(sec);
    if (sec) {
      const m = data.metrics[sec]!;
      const r  = m.rsRatio[selectedDateIndex]!;
      const mo = m.rsMomentum[selectedDateIndex]!;
      setTooltip({ canvasX: cx, canvasY: cy, sector: sec, ratio: r, mom: mo,
        fwd: m.forward4wReturn[selectedDateIndex], quadrant: getQuadrant(r, mo) });
    } else { setTooltip(null); }
  };

  const qClass = (q: QuadrantName) =>
    q === "Leading" ? "qbadge-leading" : q === "Weakening" ? "qbadge-weakening"
    : q === "Lagging" ? "qbadge-lagging" : "qbadge-improving";

  return (
    <div className="relative w-full" style={{ height: "clamp(420px, 62vh, 680px)" }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair rounded-lg"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseLeave={() => { setTooltip(null); onHoverSector(null); }}
      />

      {/* Tooltip — styled like the macro-intelligence data callout */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-40"
          style={{
            left: Math.min(tooltip.canvasX + 14, 640),
            top: Math.max(tooltip.canvasY - 10, 8),
          }}
        >
          <div
            className="rounded-lg p-3 shadow-2xl min-w-[160px]"
            style={{ background: "var(--bg-raised)", border: "1px solid var(--border-md)" }}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="font-bold text-[13px] text-white">{getSectorName(tooltip.sector)}</span>
              <span className={`qbadge ${qClass(tooltip.quadrant)}`}>{tooltip.quadrant}</span>
            </div>
            <div className="flex flex-col gap-1 font-mono text-[11px]">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">RS-Ratio</span>
                <span className="text-slate-100 font-semibold">{tooltip.ratio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">RS-Momentum</span>
                <span className="text-slate-100 font-semibold">{tooltip.mom.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4 pt-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-slate-500">4W Return</span>
                <span className={`font-semibold ${tooltip.fwd == null ? "text-slate-600" : tooltip.fwd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {tooltip.fwd == null ? "Pending" : `${tooltip.fwd >= 0 ? "+" : ""}${(tooltip.fwd * 100).toFixed(2)}%`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── helper: rounded rect ── */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
