import { describe, it, expect } from "vitest";
import {
  zscoreTo100,
  pctChange,
  computeForward4wReturn,
  computeRrgMetrics,
  DEFAULT_CONFIG,
} from "../src/rrg_engine.js";

describe("RRG Engine - Mathematical Invariants & Edge Cases", () => {
  it("should return null for indices before min_periods (14)", () => {
    const data = Array.from({ length: 20 }, (_, i) => 100 + i);
    const z = zscoreTo100(data, 14);

    // Indices 0 to 12 must be null (13 periods < 14)
    for (let i = 0; i < 13; i++) {
      expect(z[i]).toBeNull();
    }
    // Index 13 must be a valid number (14th period)
    expect(z[13]).not.toBeNull();
    expect(typeof z[13]).toBe("number");
  });

  it("should handle zero-variance edge case by returning null", () => {
    // Constant series in rolling window -> std = 0
    const constantData = Array(20).fill(105.0);
    const z = zscoreTo100(constantData, 14);

    // All computed z-scores when std = 0 should be null to avoid division by zero
    for (let i = 0; i < 20; i++) {
      expect(z[i]).toBeNull();
    }
  });

  it("should obey RS-Ratio > 100 invariant when sector consistently outperforms benchmark", () => {
    const benchmark = Array.from({ length: 30 }, () => 100);
    // Sector growing relative to flat benchmark
    const sector = Array.from({ length: 30 }, (_, i) => 100 + i * 2);

    const rs = sector.map((s, idx) => s / benchmark[idx]);
    const z = zscoreTo100(rs, 14);

    // After warmup (index >= 13), z-score of steadily increasing RS must be > 100
    for (let i = 13; i < 30; i++) {
      expect(z[i]).toBeGreaterThan(100);
    }
  });

  it("should correctly compute pctChange ROC", () => {
    const series = [null, 100, 110, 99];
    const roc = pctChange(series);

    expect(roc[0]).toBeNull();
    expect(roc[1]).toBeNull(); // prev is null
    expect(roc[2]).toBeCloseTo(0.10); // (110 - 100) / 100
    expect(roc[3]).toBeCloseTo(-0.10); // (99 - 110) / 110
  });

  it("should strictly enforce 4-week forward-return boundary rule (Phase 3)", () => {
    // 10 weekly price points: 100, 102, 104, 106, 108, 110, 112, 114, 116, 118
    const prices = Array.from({ length: 10 }, (_, i) => 100 + i * 2);
    const fwd = computeForward4wReturn(prices);

    // Index 0: price[0]=100, price[4]=108 -> return = (108-100)/100 = +0.08
    expect(fwd[0]).toBeCloseTo(0.08);

    // Index 5: price[5]=110, price[9]=118 -> return = (118-110)/110 = +0.072727
    expect(fwd[5]).toBeCloseTo((118 - 110) / 110);

    // Most recent 4 periods (indices 6, 7, 8, 9) have no 4-week future data yet
    expect(fwd[6]).toBeNull();
    expect(fwd[7]).toBeNull();
    expect(fwd[8]).toBeNull();
    expect(fwd[9]).toBeNull();
  });

  it("should handle missing sector prices gracefully with warning", () => {
    const dates = ["2026-01-01", "2026-01-08"];
    const prices = {
      "^NSEI": [10000, 10100],
      "^NSEBANK": [], // Empty sector
    };

    const res = computeRrgMetrics(dates, prices, {
      ...DEFAULT_CONFIG,
      sectors: ["^NSEBANK"],
    });

    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.warnings[0]).toContain("returned empty price data");
    expect(res.metrics["^NSEBANK"]).toBeUndefined();
  });
});
