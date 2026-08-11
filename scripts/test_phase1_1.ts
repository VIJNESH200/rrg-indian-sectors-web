async function testYahooFinanceChart(ticker: string) {
  const encodedTicker = encodeURIComponent(ticker);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedTicker}?range=3y&interval=1wk`;
  console.log(`Fetching from Yahoo Finance API: ${url}`);

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
  };

  try {
    const response = await fetch(url, { headers });
    console.log(`HTTP Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error(`Fetch failed with status ${response.status}`);
      const text = await response.text();
      console.error(`Response body snippet: ${text.substring(0, 300)}`);
      return false;
    }

    const json = (await response.json()) as any;
    const result = json.chart?.result?.[0];
    if (!result) {
      console.error("No result in chart payload:", JSON.stringify(json));
      return false;
    }

    const timestamps = result.timestamp || [];
    const closePrices = result.indicators?.quote?.[0]?.close || [];
    const adjClosePrices = result.indicators?.adjclose?.[0]?.adjclose || closePrices;

    console.log(`Successfully retrieved data for ${ticker}:`);
    console.log(`- Meta symbol: ${result.meta?.symbol}`);
    console.log(`- Currency: ${result.meta?.currency}`);
    console.log(`- Timestamps count: ${timestamps.length}`);
    console.log(`- Close prices count: ${closePrices.length}`);
    if (timestamps.length > 0) {
      const firstDate = new Date(timestamps[0] * 1000).toISOString().split('T')[0];
      const lastDate = new Date(timestamps[timestamps.length - 1] * 1000).toISOString().split('T')[0];
      console.log(`- Date range: ${firstDate} to ${lastDate}`);
      console.log(`- Latest Adj Close: ${adjClosePrices[adjClosePrices.length - 1]}`);
    }

    return true;
  } catch (err: any) {
    console.error(`Exception while fetching ${ticker}:`, err.message);
    return false;
  }
}

testYahooFinanceChart("^NSEBANK").then((success) => {
  if (success) {
    console.log("\nPHASE 1.1 GATING CHECK: PASSED");
  } else {
    console.error("\nPHASE 1.1 GATING CHECK: FAILED");
    process.exit(1);
  }
});
