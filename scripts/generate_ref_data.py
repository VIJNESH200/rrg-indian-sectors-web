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

def calculate_ema(series: pd.Series, period: int) -> pd.Series:
    if period <= 0:
        return series
    return series.ewm(span=period, adjust=False).mean()

def compute_rrg_python(prices_df: pd.DataFrame, rs_ema_period: int = 0, mom_ema_period: int = 0):
    rs_ratio_dict = {}
    rs_mom_dict = {}
    
    benchmark_series = prices_df[BENCHMARK]
    for sector in SECTORS:
        rs = prices_df[sector] / benchmark_series
        rs_smoothed = calculate_ema(rs, rs_ema_period) if rs_ema_period > 0 else rs
        rs_ratio = zscore_to_100(rs_smoothed, WINDOW)
        rs_ratio_roc = rs_ratio.pct_change()
        rs_mom_raw = zscore_to_100(rs_ratio_roc, WINDOW)
        rs_momentum = calculate_ema(rs_mom_raw, mom_ema_period) if mom_ema_period > 0 else rs_mom_raw
        
        rs_ratio_dict[sector] = [None if np.isnan(v) else float(v) for v in rs_ratio.values]
        rs_mom_dict[sector] = [None if np.isnan(v) else float(v) for v in rs_momentum.values]

    return rs_ratio_dict, rs_mom_dict

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
    
    dates_str = [d.strftime("%Y-%m-%d") for d in prices.index]
    prices_dict = {
        ticker: [float(val) for val in prices[ticker].values]
        for ticker in tickers
    }
    
    # Weekly RRG Metrics (Unsmoothed)
    weekly_ratio, weekly_mom = compute_rrg_python(prices, rs_ema_period=0, mom_ema_period=0)

    # Daily RRG Metrics (20d RS EMA + 5d RS-Mom EMA)
    daily_ratio, daily_mom = compute_rrg_python(prices, rs_ema_period=20, mom_ema_period=5)
    
    ref_payload = {
        "dates": dates_str,
        "benchmark": BENCHMARK,
        "sectors": list(SECTORS),
        "prices": prices_dict,
        "weekly": {
            "expected_rs_ratio": weekly_ratio,
            "expected_rs_momentum": weekly_mom
        },
        "daily": {
            "expected_rs_ratio": daily_ratio,
            "expected_rs_momentum": daily_mom
        }
    }
    
    out_path = Path(__file__).parent / "ref_data.json"
    with open(out_path, "w") as f:
        json.dump(ref_payload, f, indent=2)
        
    print(f"Reference data generated successfully at {out_path} ({len(dates_str)} dates).")

if __name__ == "__main__":
    main()
