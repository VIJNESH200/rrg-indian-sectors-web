async function testTicker(symbol: string) {
  const encoded = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=1y&interval=1wk`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    });
    if (!res.ok) {
      return { symbol, status: res.status, ok: false, count: 0, reason: `HTTP ${res.status}` };
    }
    const json = (await res.json()) as any;
    const result = json.chart?.result?.[0];
    if (!result) {
      return { symbol, status: 200, ok: false, count: 0, reason: "No chart result in payload" };
    }
    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const validCloses = closes.filter((c: any) => c !== null && c !== undefined);
    return {
      symbol,
      status: 200,
      ok: validCloses.length > 0,
      count: validCloses.length,
      name: result.meta?.shortName || result.meta?.symbol || symbol,
      reason: validCloses.length > 0 ? "OK" : "Empty price data",
    };
  } catch (err: any) {
    return { symbol, status: 0, ok: false, count: 0, reason: err.message };
  }
}

const CANDIDATES = [
  // Existing verified core sectors
  "^NSEI",
  "^NSEBANK",
  "^CNXIT",
  "^CNXAUTO",
  "^CNXFMCG",
  "^CNXPHARMA",
  "^CNXMETAL",

  // Sector expansion candidates - common NSE index formats on Yahoo
  "^CNXFIN",
  "NIFTY_FIN_SERVICE.NS",
  "^CNXMEDIA",
  "NIFTY_MEDIA.NS",
  "^CNXPSUBANK",
  "NIFTY_PSU_BANK.NS",
  "^CNXPVTBANK",
  "NIFTY_PVT_BANK.NS",
  "^CNXCONSUM",
  "NIFTY_CONSR_DURBL.NS",
  "^CNXENERGY",
  "NIFTY_OIL_AND_GAS.NS",
  "NIFTY_HEALTHCARE.NS",
  "^CNXREALTY",
  "NIFTY_REALTY.NS",
  "^CNXINFRA",
  "NIFTY_INFRA.NS",
  "^CNXCOMMOD",
  "NIFTY_COMMODITIES.NS",
  "^CNXSERVICE",
];

async function main() {
  console.log(`Testing ${CANDIDATES.length} Yahoo Finance candidate tickers...\n`);
  const results = [];
  for (const sym of CANDIDATES) {
    const res = await testTicker(sym);
    results.push(res);
    const badge = res.ok ? "✓ VALID" : "✗ INVALID";
    console.log(`${badge} | Ticker: ${sym.padEnd(22)} | Count: ${String(res.count).padStart(3)} | Info: ${res.reason}`);
  }

  console.log("\n--- VERIFIED WORKING CANDIDATE TICKERS ---");
  const valid = results.filter((r) => r.ok);
  for (const r of valid) {
    console.log(`- ${r.symbol} (${r.name})`);
  }
}

main();
