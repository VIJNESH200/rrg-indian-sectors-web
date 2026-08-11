#!/usr/bin/env python3
import json
import numpy as np
import pandas as pd
from pathlib import Path

BENCHMARK = "^NSEI"
SECTORS = ("^NSEBANK", "^CNXIT", "^CNXAUTO", "^CNXFMCG", "^CNXPHARMA", "^CNXMETAL")
WINDOW = 14

def zscore_to_100(series: pd.Series, window: int) -> pd.Series:
    mean = series.rolling(window=window, min_periods=window).mean()
    std = series.rolling(window=window, min_periods=window).std(ddof=0)
    std = std.replace(0, np.nan)
    z = (series - mean) / std
    return 100 + z

def main():
    tickers = [BENCHMARK, *SECTORS]
    cache_path = Path("C:/Users/Vijnesh/Desktop/rrg_cache_6afaa670.csv")
    
    if cache_path.exists():
        print(f"Loading prices directly from {cache_path}...")
        prices = pd.read_csv(cache_path, index_col=0)
        prices.index = pd.to_datetime(prices.index, dayfirst=True)
    else:
        import yfinance as yf
        print(f"Downloading reference price data for {tickers}...")
        data = yf.download(tickers=tickers, period="3y", interval="1wk", auto_adjust=True, progress=False)
        if isinstance(data.columns, pd.MultiIndex):
            prices = data["Close"].copy()
        elif "Close" in data.columns:
            prices = data["Close"].copy()
        else:
            prices = data.copy()
        prices.index = pd.to_datetime(prices.index)
            
    prices = prices.dropna(how="all").ffill().dropna(how="any")
    
    # Save input prices to dict
    dates_str = [d.strftime("%Y-%m-%d") for d in prices.index]
    prices_dict = {
        ticker: [float(val) for val in prices[ticker].values]
        for ticker in tickers
    }
    
    # Compute Python reference metrics
    rs_ratio_dict = {}
    rs_mom_dict = {}
    
    benchmark_series = prices[BENCHMARK]
    for sector in SECTORS:
        rs = prices[sector] / benchmark_series
        rs_ratio = zscore_to_100(rs, WINDOW)
        rs_ratio_roc = rs_ratio.pct_change()
        rs_momentum = zscore_to_100(rs_ratio_roc, WINDOW)
        
        rs_ratio_dict[sector] = [None if np.isnan(v) else float(v) for v in rs_ratio.values]
        rs_mom_dict[sector] = [None if np.isnan(v) else float(v) for v in rs_momentum.values]
        
    ref_payload = {
        "dates": dates_str,
        "benchmark": BENCHMARK,
        "sectors": list(SECTORS),
        "prices": prices_dict,
        "expected_rs_ratio": rs_ratio_dict,
        "expected_rs_momentum": rs_mom_dict
    }
    
    out_path = Path(__file__).parent / "ref_data.json"
    with open(out_path, "w") as f:
        json.dump(ref_payload, f, indent=2)
        
    print(f"Reference data generated successfully at {out_path} ({len(dates_str)} dates).")

if __name__ == "__main__":
    main()
