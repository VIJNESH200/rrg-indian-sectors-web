import { BENCHMARK_TICKER, ALL_SECTORS } from "./sectors.js";

export interface FetcherOptions {
  range?: string; // Default '5y' to support historical forward-returns
  interval?: string; // Default '1wk'
}

export interface FetchResult {
  dates: string[];
  prices: Record<string, (number | null)[]>;
  warnings: string[];
}

export async function fetchYahooChart(
  ticker: string,
  range: string = "5y",
  interval: string = "1wk"
): Promise<{ dateMap: Map<string, number>; warning?: string }> {
  const encoded = encodeURIComponent(ticker);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=${range}&interval=${interval}`;
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const warnMsg = `[FETCH WARNING] Ticker '${ticker}' failed with HTTP status ${response.status} ${response.statusText}`;
      console.warn(warnMsg);
      return { dateMap: new Map(), warning: warnMsg };
    }

    const json = (await response.json()) as any;
    const result = json.chart?.result?.[0];
    if (!result) {
      const warnMsg = `[FETCH WARNING] Ticker '${ticker}' returned invalid payload structure`;
      console.warn(warnMsg);
      return { dateMap: new Map(), warning: warnMsg };
    }

    const timestamps: number[] = result.timestamp || [];
    const quoteCloses = result.indicators?.quote?.[0]?.close || [];
    const adjCloses = result.indicators?.adjclose?.[0]?.adjclose || quoteCloses;

    if (timestamps.length === 0 || adjCloses.length === 0) {
      const warnMsg = `[FETCH WARNING] Ticker '${ticker}' returned 0 price data points`;
      console.warn(warnMsg);
      return { dateMap: new Map(), warning: warnMsg };
    }

    const dateMap = new Map<string, number>();
    for (let i = 0; i < timestamps.length; i++) {
      const price = adjCloses[i];
      if (price !== null && price !== undefined && !Number.isNaN(price)) {
        const dateStr = new Date(timestamps[i] * 1000).toISOString().split("T")[0];
        dateMap.set(dateStr, price);
      }
    }

    if (dateMap.size === 0) {
      const warnMsg = `[FETCH WARNING] Ticker '${ticker}' contained no valid non-null prices`;
      console.warn(warnMsg);
      return { dateMap: new Map(), warning: warnMsg };
    }

    return { dateMap };
  } catch (err: any) {
    const warnMsg = `[FETCH WARNING] Exception while fetching '${ticker}': ${err.message}`;
    console.warn(warnMsg);
    return { dateMap: new Map(), warning: warnMsg };
  }
}

export async function fetchAllPrices(options: FetcherOptions = {}): Promise<FetchResult> {
  const range = options.range || "5y";
  const interval = options.interval || "1wk";
  const tickersToFetch = [BENCHMARK_TICKER, ...ALL_SECTORS.map((s) => s.ticker)];

  const warnings: string[] = [];
  const fetchPromises = tickersToFetch.map((ticker) =>
    fetchYahooChart(ticker, range, interval).then((res) => ({ ticker, ...res }))
  );

  const fetchResults = await Promise.all(fetchPromises);

  // Separate benchmark result
  const benchResult = fetchResults.find((r) => r.ticker === BENCHMARK_TICKER);
  if (!benchResult || benchResult.dateMap.size === 0) {
    throw new Error(`Critical Error: Benchmark ticker ${BENCHMARK_TICKER} price data could not be fetched.`);
  }

  // Get sorted list of dates from benchmark (excluding 2021-08-08 to 2022-02-06)
  const rawDates = Array.from(benchResult.dateMap.keys()).sort();
  const sortedDates = rawDates.filter(
    (d) => !(d >= "2021-08-08" && d <= "2022-02-06")
  );
  const prices: Record<string, (number | null)[]> = {};

  for (const res of fetchResults) {
    if (res.warning) {
      warnings.push(res.warning);
    }

    if (res.dateMap.size === 0) {
      // Per-symbol fallback: skip ticker from prices object so engine handles warning gracefully
      continue;
    }

    // Align prices to benchmark dates using forward-fill for gaps, null for pre-history
    const alignedPrices: (number | null)[] = new Array(sortedDates.length);
    let lastValidPrice: number | null = null;

    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];
      const p = res.dateMap.get(date);
      if (p !== undefined) {
        alignedPrices[i] = p;
        lastValidPrice = p;
      } else if (lastValidPrice !== null) {
        alignedPrices[i] = lastValidPrice; // forward-fill for missing intermediate market days
      } else {
        alignedPrices[i] = null; // Strictly null for pre-history before first observation
      }
    }

    prices[res.ticker] = alignedPrices;
  }

  return {
    dates: sortedDates,
    prices,
    warnings,
  };
}
