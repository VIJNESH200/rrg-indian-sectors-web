/**
 * Relative Rotation Graph (RRG) Engine in TypeScript
 * Exact port of pandas rolling mean/std (ddof=0) and JdK RRG formulas,
 * with optional causal EMA smoothing for Daily RRG.
 */

export interface RrgConfig {
  benchmark: string;
  sectors: string[];
  rollingWindow: number;
  tailPeriods: number;
  timeframe?: "1wk" | "1d";
  rsEmaPeriod?: number;   // e.g. 20 for Daily RRG
  momEmaPeriod?: number;  // e.g. 5 for Daily RRG
}

import { ALL_SECTORS } from "./sectors.js";

export const WEEKLY_RRG_CONFIG: RrgConfig = {
  benchmark: "^NSEI",
  sectors: ALL_SECTORS.map((s) => s.ticker),
  rollingWindow: 14,
  tailPeriods: 12,
  timeframe: "1wk",
  rsEmaPeriod: 0,
  momEmaPeriod: 0,
};

export const DAILY_RRG_CONFIG: RrgConfig = {
  benchmark: "^NSEI",
  sectors: ALL_SECTORS.map((s) => s.ticker),
  rollingWindow: 14,
  tailPeriods: 12,
  timeframe: "1d",
  rsEmaPeriod: 20,
  momEmaPeriod: 5,
};

export const DEFAULT_CONFIG: RrgConfig = WEEKLY_RRG_CONFIG;

export interface RrgSectorMetrics {
  sector: string;
  rsRatio: (number | null)[];
  rsMomentum: (number | null)[];
  forward4wReturn: (number | null)[];
}

export interface RrgCalculationResult {
  dates: string[];
  benchmark: string;
  sectors: string[];
  prices: Record<string, (number | null)[]>;
  metrics: Record<string, RrgSectorMetrics>;
  warnings: string[];
}

/**
 * Calculates causal Exponential Moving Average (EMA) over a (number | null)[] series.
 * Formula: alpha = 2 / (period + 1)
 * EMA_t = alpha * value_t + (1 - alpha) * EMA_{t-1}
 * The first non-null value initializes the EMA. Chronological, no lookahead bias.
 */
export function calculateEma(
  series: (number | null)[],
  period: number
): (number | null)[] {
  const n = series.length;
  const result: (number | null)[] = new Array(n).fill(null);
  if (period <= 1 || n === 0) return [...series];

  const alpha = 2 / (period + 1);
  let prevEma: number | null = null;

  for (let i = 0; i < n; i++) {
    const val = series[i];
    if (val === null || val === undefined || Number.isNaN(val)) {
      result[i] = null;
      prevEma = null; // Reset EMA continuity on missing values
    } else {
      if (prevEma === null) {
        prevEma = val;
      } else {
        prevEma = alpha * val + (1 - alpha) * prevEma;
      }
      result[i] = prevEma;
    }
  }

  return result;
}

/**
 * Calculates rolling z-score baseline 100 with exact pandas semantics (ddof=0, min_periods=window).
 */
export function zscoreTo100(
  series: (number | null)[],
  window: number = 14
): (number | null)[] {
  const n = series.length;
  const result: (number | null)[] = new Array(n).fill(null);

  for (let i = 0; i < n; i++) {
    if (i < window - 1) {
      result[i] = null;
      continue;
    }

    let sum = 0;
    let valid = true;
    for (let j = i - window + 1; j <= i; j++) {
      const val = series[j];
      if (val === null || val === undefined || Number.isNaN(val)) {
        valid = false;
        break;
      }
      sum += val;
    }

    if (!valid) {
      result[i] = null;
      continue;
    }

    const mean = sum / window;

    let sumSq = 0;
    for (let j = i - window + 1; j <= i; j++) {
      const diff = (series[j] as number) - mean;
      sumSq += diff * diff;
    }

    // Population standard deviation (ddof=0, matching pandas.std(ddof=0))
    const std = Math.sqrt(sumSq / window);

    if (std === 0 || Number.isNaN(std)) {
      result[i] = null;
      continue;
    }

    const currentVal = series[i] as number;
    const z = (currentVal - mean) / std;
    result[i] = 100 + z;
  }

  return result;
}

/**
 * Computes 1-period percentage change (ROC): (x_t - x_{t-1}) / x_{t-1}
 */
export function pctChange(series: (number | null)[]): (number | null)[] {
  const n = series.length;
  const result: (number | null)[] = new Array(n).fill(null);

  for (let i = 1; i < n; i++) {
    const curr = series[i];
    const prev = series[i - 1];

    if (
      curr === null ||
      curr === undefined ||
      Number.isNaN(curr) ||
      prev === null ||
      prev === undefined ||
      Number.isNaN(prev) ||
      prev === 0
    ) {
      result[i] = null;
    } else {
      result[i] = (curr - prev) / prev;
    }
  }

  return result;
}

/**
 * Computes 4-period forward return: (Price_{t+4} - Price_t) / Price_t
 * If t + 4 >= N or prices are null, returns null (Pending).
 */
export function computeForward4wReturn(prices: (number | null)[]): (number | null)[] {
  const n = prices.length;
  const result: (number | null)[] = new Array(n).fill(null);

  for (let i = 0; i < n; i++) {
    const targetIdx = i + 4;
    if (targetIdx < n) {
      const pCurrent = prices[i];
      const pFuture = prices[targetIdx];
      if (
        pCurrent !== null &&
        pCurrent !== undefined &&
        pCurrent !== 0 &&
        pFuture !== null &&
        pFuture !== undefined
      ) {
        result[i] = (pFuture - pCurrent) / pCurrent;
      }
    } else {
      // Pending: future data does not exist yet
      result[i] = null;
    }
  }

  return result;
}

/**
 * Computes RRG metrics (RS-Ratio, RS-Momentum, Forward Returns) for all sectors against benchmark.
 */
export function computeRrgMetrics(
  dates: string[],
  prices: Record<string, (number | null)[]>,
  config: RrgConfig = DEFAULT_CONFIG
): RrgCalculationResult {
  const warnings: string[] = [];
  const benchmarkPrices = prices[config.benchmark];

  if (!benchmarkPrices || benchmarkPrices.length === 0) {
    throw new Error(`Benchmark ticker ${config.benchmark} price data is missing or empty.`);
  }

  const metrics: Record<string, RrgSectorMetrics> = {};

  for (const sector of config.sectors) {
    const sectorPrices = prices[sector];
    if (!sectorPrices || sectorPrices.length === 0) {
      warnings.push(`Sector ${sector} returned empty price data. Skipped calculation.`);
      continue;
    }

    if (sectorPrices.length !== benchmarkPrices.length) {
      warnings.push(
        `Length mismatch for ${sector} (${sectorPrices.length}) vs benchmark (${benchmarkPrices.length}).`
      );
    }

    const n = Math.min(sectorPrices.length, benchmarkPrices.length);
    const rs: (number | null)[] = new Array(n);

    for (let i = 0; i < n; i++) {
      const pSector = sectorPrices[i];
      const pBench = benchmarkPrices[i];
      if (
        pSector !== null &&
        pSector !== undefined &&
        pBench !== null &&
        pBench !== undefined &&
        pBench !== 0
      ) {
        rs[i] = pSector / pBench;
      } else {
        rs[i] = null;
      }
    }

    // 1. Optional RS EMA smoothing (e.g., 20-period for Daily RRG)
    const rsSmoothed =
      config.rsEmaPeriod && config.rsEmaPeriod > 0
        ? calculateEma(rs, config.rsEmaPeriod)
        : rs;

    // 2. Compute RS-Ratio
    const rsRatio = zscoreTo100(rsSmoothed, config.rollingWindow);

    // 3. Compute 1-period ROC & raw RS-Momentum
    const rsRatioRoc = pctChange(rsRatio);
    const rsMomentumRaw = zscoreTo100(rsRatioRoc, config.rollingWindow);

    // 4. Optional RS-Momentum EMA smoothing (e.g., 5-period for Daily RRG)
    const rsMomentum =
      config.momEmaPeriod && config.momEmaPeriod > 0
        ? calculateEma(rsMomentumRaw, config.momEmaPeriod)
        : rsMomentumRaw;

    const forward4wReturn = computeForward4wReturn(sectorPrices);

    metrics[sector] = {
      sector,
      rsRatio,
      rsMomentum,
      forward4wReturn,
    };
  }

  // Filter out pre-history burn-in data points so every returned date has 100% valid non-null metrics
  const firstSec = config.sectors[0];
  const firstSecMetrics = metrics[firstSec];
  const cutIdx = dates.findIndex((d, idx) => {
    return firstSecMetrics && firstSecMetrics.rsRatio[idx] != null && firstSecMetrics.rsMomentum[idx] != null;
  });
  const validCutIdx = cutIdx !== -1 ? cutIdx : 0;

  const slicedDates = dates.slice(validCutIdx);
  const slicedMetrics: Record<string, RrgSectorMetrics> = {};
  const slicedPrices: Record<string, (number | null)[]> = {};

  for (const [sec, m] of Object.entries(metrics)) {
    slicedMetrics[sec] = {
      sector: sec,
      rsRatio: m.rsRatio.slice(validCutIdx),
      rsMomentum: m.rsMomentum.slice(validCutIdx),
      forward4wReturn: m.forward4wReturn.slice(validCutIdx),
    };
  }

  for (const [sec, pList] of Object.entries(prices)) {
    slicedPrices[sec] = pList.slice(validCutIdx);
  }

  return {
    dates: slicedDates,
    benchmark: config.benchmark,
    sectors: config.sectors.filter((s) => slicedMetrics[s] !== undefined),
    prices: slicedPrices,
    metrics: slicedMetrics,
    warnings,
  };
}
