async function inspectTicker(symbol: string) {
  const encoded = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=5y&interval=1wk`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      return { symbol, ok: false, error: `HTTP ${res.status}` };
    }
    const json = (await res.json()) as any;
    const result = json.chart?.result?.[0];
    if (!result) return { symbol, ok: false, error: "No chart result" };

    const meta = result.meta || {};
    const timestamps: number[] = result.timestamp || [];
    const closes: number[] = result.indicators?.quote?.[0]?.close || [];
    const validCloses = closes.filter((c) => c !== null && c !== undefined);

    const startDate = timestamps.length > 0 ? new Date(timestamps[0] * 1000).toISOString().split("T")[0] : "N/A";
    const endDate = timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1] * 1000).toISOString().split("T")[0] : "N/A";

    return {
      symbol,
      ok: true,
      instrumentType: meta.instrumentType || meta.quoteType || "UNKNOWN",
      shortName: meta.shortName || meta.symbol || symbol,
      currency: meta.currency,
      regularMarketPrice: meta.regularMarketPrice,
      total5yRecords: validCloses.length,
      startDate,
      endDate,
    };
  } catch (err: any) {
    return { symbol, ok: false, error: err.message };
  }
}

const ALL_CANDIDATES = [
  // Core 6
  "^NSEI",
  "^NSEBANK",
  "^CNXIT",
  "^CNXAUTO",
  "^CNXFMCG",
  "^CNXPHARMA",
  "^CNXMETAL",

  // Expansion candidates
  "^CNXFIN",
  "NIFTY_FIN_SERVICE.NS",
  "^CNXMEDIA",
  "^CNXPSUBANK",
  "NIFTY_PVT_BANK.NS",
  "^CNXCONSUM",
  "NIFTY_CONSR_DURBL.NS",
  "^CNXENERGY",
  "NIFTY_OIL_AND_GAS.NS",
  "NIFTY_HEALTHCARE.NS",
  "^CNXREALTY",
  "^CNXINFRA",
  "^CNXSERVICE",
];

async function main() {
  console.log("=== INSPECTING TICKER METADATA, INSTRUMENT TYPE, AND HISTORICAL LENGTH (5Y) ===\n");
  for (const sym of ALL_CANDIDATES) {
    const info = await inspectTicker(sym);
    if (!info.ok) {
      console.log(`[FAILED] ${sym.padEnd(22)} | Error: ${info.error}`);
    } else {
      console.log(
        `[OK] ${info.symbol.padEnd(22)} | Type: ${String(info.instrumentType).padEnd(10)} | Records: ${String(
          info.total5yRecords
        ).padStart(3)} | Range: ${info.startDate} to ${info.endDate} | Price: ${info.regularMarketPrice}`
      );
    }
  }
}

main();
