export interface SectorInfo {
  ticker: string;
  name: string;
  category: "Core" | "Expanded";
}

export const BENCHMARK_TICKER = "^NSEI";

// Sorted alphabetically by sector name
export const ALL_SECTORS: SectorInfo[] = [
  { ticker: "^CNXAUTO", name: "Nifty Auto", category: "Core" },
  { ticker: "^NSEBANK", name: "Nifty Bank", category: "Core" },
  { ticker: "^CNXENERGY", name: "Nifty Energy", category: "Expanded" },
  { ticker: "NIFTY_FIN_SERVICE.NS", name: "Nifty Fin Service", category: "Expanded" },
  { ticker: "^CNXFMCG", name: "Nifty FMCG", category: "Core" },
  { ticker: "^CNXINFRA", name: "Nifty Infra", category: "Expanded" },
  { ticker: "^CNXIT", name: "Nifty IT", category: "Core" },
  { ticker: "^CNXMEDIA", name: "Nifty Media", category: "Expanded" },
  { ticker: "^CNXMETAL", name: "Nifty Metal", category: "Core" },
  { ticker: "^CNXPHARMA", name: "Nifty Pharma", category: "Core" },
  { ticker: "^CNXPSUBANK", name: "Nifty PSU Bank", category: "Expanded" },
  { ticker: "NIFTY_PVT_BANK.NS", name: "Nifty Pvt Bank", category: "Expanded" },
  { ticker: "^CNXREALTY", name: "Nifty Realty", category: "Expanded" },
  { ticker: "^CNXSERVICE", name: "Nifty Services", category: "Expanded" },
];

export function getSectorName(ticker: string): string {
  if (ticker === BENCHMARK_TICKER) return "Nifty 50";
  const sec = ALL_SECTORS.find((s) => s.ticker === ticker);
  if (sec) return sec.name;
  return ticker.replace("^", "").replace(".NS", "");
}
