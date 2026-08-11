export interface SectorInfo {
  ticker: string;
  name: string;
  category: "Core" | "Expanded";
}

export const BENCHMARK_TICKER = "^NSEI";

export const ALL_SECTORS: SectorInfo[] = [
  { ticker: "^NSEBANK", name: "Nifty Bank", category: "Core" },
  { ticker: "^CNXIT", name: "Nifty IT", category: "Core" },
  { ticker: "^CNXAUTO", name: "Nifty Auto", category: "Core" },
  { ticker: "^CNXFMCG", name: "Nifty FMCG", category: "Core" },
  { ticker: "^CNXPHARMA", name: "Nifty Pharma", category: "Core" },
  { ticker: "^CNXMETAL", name: "Nifty Metal", category: "Core" },

  { ticker: "NIFTY_FIN_SERVICE.NS", name: "Nifty Fin Service", category: "Expanded" },
  { ticker: "^CNXMEDIA", name: "Nifty Media", category: "Expanded" },
  { ticker: "^CNXPSUBANK", name: "Nifty PSU Bank", category: "Expanded" },
  { ticker: "NIFTY_PVT_BANK.NS", name: "Nifty Pvt Bank", category: "Expanded" },
  { ticker: "^CNXCONSUM", name: "Nifty Consumption", category: "Expanded" },
  { ticker: "^CNXENERGY", name: "Nifty Energy", category: "Expanded" },
  { ticker: "^CNXREALTY", name: "Nifty Realty", category: "Expanded" },
  { ticker: "^CNXINFRA", name: "Nifty Infra", category: "Expanded" },
  { ticker: "^CNXSERVICE", name: "Nifty Services", category: "Expanded" },
];

export function getSectorName(ticker: string): string {
  if (ticker === BENCHMARK_TICKER) return "Nifty 50";
  const sec = ALL_SECTORS.find((s) => s.ticker === ticker);
  if (sec) return sec.name;
  return ticker.replace("^", "").replace(".NS", "");
}
