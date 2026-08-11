/**
 * Relative Rotation Graph (RRG) Engine in TypeScript
 * Exact port of pandas rolling mean/std (ddof=0) and JdK RRG formulas.
 */

export interface RrgConfig {
  benchmark: string;
  sectors: string[];
  rollingWindow: number;
  tailPeriods: number;
}

import { ALL_SECTORS } from "./sectors.js";

export const DEFAULT_CONFIG: RrgConfig = {
  benchmark: "^NSEI",
  sectors: ALL_SECTORS.map((s) => s.ticker),
  rollingWindow: 14,
  tailPeriods: 12,
};

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
  prices: Record<string, number[]>;
  metrics: Record<string, RrgSectorMetrics>;
  warnings: string[];
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
 * Computes 4-week forward return: (Price_{t+4} - Price_t) / Price_t
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

    const rsRatio = zscoreTo100(rs, config.rollingWindow);
    const rsRatioRoc = pctChange(rsRatio);
    const rsMomentum = zscoreTo100(rsRatioRoc, config.rollingWindow);
    const forward4wReturn = computeForward4wReturn(sectorPrices);

    metrics[sector] = {
      sector,
      rsRatio,
      rsMomentum,
      forward4wReturn,
    };
  }

  return {
    dates,
    benchmark: config.benchmark,
    sectors: config.sectors.filter((s) => metrics[s] !== undefined),
    prices,
    metrics,
    warnings,
  };
}
