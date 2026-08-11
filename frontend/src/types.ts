export interface SectorMetrics {
  sector: string;
  rsRatio: (number | null)[];
  rsMomentum: (number | null)[];
  forward4wReturn: (number | null)[];
}

export interface RrgResponseData {
  dates: string[];
  benchmark: string;
  sectors: string[];
  prices: Record<string, number[]>;
  metrics: Record<string, SectorMetrics>;
  fetchWarnings?: string[];
  updatedAt?: string;
  cached?: boolean;
}

export type QuadrantName = "Leading" | "Weakening" | "Lagging" | "Improving";

export interface SectorDisplayInfo {
  ticker: string;
  name: string;
  color: string;
  category: "Core" | "Expanded";
}
