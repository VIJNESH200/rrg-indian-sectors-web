import { describe, it, expect } from "vitest";
import { fetchAllPrices } from "../src/fetcher.js";

describe("Fetcher & Data Alignment Suite", () => {
  it("should correctly handle alignment with null for pre-history instead of zero", () => {
    // Simulated benchmark and delayed-start sector
    const benchmarkDates = ["2026-01-01", "2026-01-08", "2026-01-15", "2026-01-22"];
    const sectorDateMap = new Map<string, number>([
      ["2026-01-15", 1500],
      ["2026-01-22", 1550],
    ]);

    const sortedDates = benchmarkDates;
    const alignedPrices: (number | null)[] = new Array(sortedDates.length);
    let lastValidPrice: number | null = null;

    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];
      const p = sectorDateMap.get(date);
      if (p !== undefined) {
        alignedPrices[i] = p;
        lastValidPrice = p;
      } else if (lastValidPrice !== null) {
        alignedPrices[i] = lastValidPrice;
      } else {
        alignedPrices[i] = null; // Pre-history must be strictly null
      }
    }

    // Indices 0 and 1 (before 2026-01-15) must be null
    expect(alignedPrices[0]).toBeNull();
    expect(alignedPrices[1]).toBeNull();

    // Indices 2 and 3 must have valid price values
    expect(alignedPrices[2]).toBe(1500);
    expect(alignedPrices[3]).toBe(1550);
  });

  it("should forward-fill intermediate missing market dates", () => {
    const dates = ["2026-01-01", "2026-01-08", "2026-01-15", "2026-01-22"];
    // Sector has data on Jan 1 and Jan 15 (Jan 8 is missing)
    const sectorDateMap = new Map<string, number>([
      ["2026-01-01", 100],
      ["2026-01-15", 110],
    ]);

    const alignedPrices: (number | null)[] = new Array(dates.length);
    let lastValidPrice: number | null = null;

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const p = sectorDateMap.get(date);
      if (p !== undefined) {
        alignedPrices[i] = p;
        lastValidPrice = p;
      } else if (lastValidPrice !== null) {
        alignedPrices[i] = lastValidPrice; // Forward fill
      } else {
        alignedPrices[i] = null;
      }
    }

    expect(alignedPrices[0]).toBe(100);
    expect(alignedPrices[1]).toBe(100); // Forward filled from Jan 1
    expect(alignedPrices[2]).toBe(110);
    expect(alignedPrices[3]).toBe(110); // Forward filled from Jan 15
  });
});
