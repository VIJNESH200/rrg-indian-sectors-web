import { fetchAllPrices } from "./fetcher.js";
import { computeRrgMetrics, WEEKLY_RRG_CONFIG, DAILY_RRG_CONFIG } from "./rrg_engine.js";

export interface Env {
  RRG_CACHE?: any;
  ENVIRONMENT?: string;
  ALLOWED_ORIGIN?: string;
}

const CACHE_KEY_1WK = "rrg_latest_metrics_1wk_v3";
const CACHE_KEY_1D  = "rrg_latest_metrics_1d_v3";
const CACHE_TTL_SECONDS = 86400; // 24 hours KV TTL

export async function computeAndCacheRrgData(env: Env, interval: "1wk" | "1d" = "1wk") {
  console.log(`Computing fresh RRG data (${interval}) from Yahoo Finance...`);
  const range = interval === "1d" ? "1y" : "5y";
  const fetchResult = await fetchAllPrices({ range, interval });
  const config = interval === "1d" ? DAILY_RRG_CONFIG : WEEKLY_RRG_CONFIG;
  const computed = computeRrgMetrics(fetchResult.dates, fetchResult.prices, config);

  const payload = {
    ...computed,
    timeframe: interval === "1d" ? "Daily" : "Weekly",
    interval,
    fetchWarnings: fetchResult.warnings,
    updatedAt: new Date().toISOString(),
    cached: false,
  };

  const cacheKey = interval === "1d" ? CACHE_KEY_1D : CACHE_KEY_1WK;

  if (env.RRG_CACHE) {
    try {
      await env.RRG_CACHE.put(cacheKey, JSON.stringify(payload), {
        expirationTtl: CACHE_TTL_SECONDS,
      });
      console.log(`Updated Cloudflare KV Cache for ${interval}`);
    } catch (e: any) {
      console.warn("Failed to write to Cloudflare KV Cache:", e.message);
    }
  }

  return payload;
}

async function getOrComputeRrgData(env: Env, ctx?: any, forceRefresh: boolean = false, interval: "1wk" | "1d" = "1wk") {
  const cacheKey = interval === "1d" ? CACHE_KEY_1D : CACHE_KEY_1WK;

  if (!forceRefresh && env.RRG_CACHE) {
    try {
      const cached = await env.RRG_CACHE.get(cacheKey, "json");
      if (cached) {
        const ageMs = cached.updatedAt ? Date.now() - new Date(cached.updatedAt).getTime() : 0;
        const STALE_THRESHOLD_MS = 4 * 3600 * 1000;

        if (ageMs > STALE_THRESHOLD_MS && ctx && typeof ctx.waitUntil === "function") {
          console.log(`KV Cache entry for ${interval} is stale (> 4h). Triggering background update...`);
          ctx.waitUntil(computeAndCacheRrgData(env, interval));
        } else {
          console.log(`Serving fresh RRG data (${interval}) from Cloudflare KV Cache`);
        }

        return { ...cached, cached: true };
      }
    } catch (e: any) {
      console.warn("KV Cache lookup failed:", e.message);
    }
  }

  return await computeAndCacheRrgData(env, interval);
}

function getCorsHeaders(request: Request, env: Env) {
  const requestOrigin = request.headers.get("Origin") || "";
  let allowedOrigin = "*";

  const isLocalhost =
    requestOrigin.startsWith("http://localhost:") ||
    requestOrigin.startsWith("http://127.0.0.1:");

  const isPagesDev = requestOrigin.endsWith(".pages.dev");

  if (env.ENVIRONMENT === "production") {
    if (env.ALLOWED_ORIGIN && requestOrigin === env.ALLOWED_ORIGIN) {
      allowedOrigin = env.ALLOWED_ORIGIN;
    } else if (isPagesDev || isLocalhost) {
      allowedOrigin = requestOrigin;
    } else if (env.ALLOWED_ORIGIN) {
      allowedOrigin = env.ALLOWED_ORIGIN;
    } else {
      allowedOrigin = "";
    }
  }

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
  }

  return headers;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/api/test-yahoo") {
      if (env.ENVIRONMENT === "production") {
        return new Response(
          JSON.stringify({ error: "Diagnostic endpoint disabled in production." }),
          { status: 403, headers: corsHeaders }
        );
      }

      const ticker = url.searchParams.get("ticker") || "^NSEBANK";
      const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1y&interval=1wk`;
      try {
        const res = await fetch(yUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        });
        const status = res.status;
        const text = await res.text();
        return new Response(
          JSON.stringify({ status, ok: res.ok, snippet: text.substring(0, 300) }),
          { headers: corsHeaders }
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    if (url.pathname === "/api/rrg-data") {
      const forceRefresh = url.searchParams.get("refresh") === "true";
      const intervalParam = url.searchParams.get("interval");
      const interval: "1wk" | "1d" = intervalParam === "1d" ? "1d" : "1wk";

      try {
        const data = await getOrComputeRrgData(env, ctx, forceRefresh, interval);
        return new Response(JSON.stringify(data), { headers: corsHeaders });
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: err.message || "Failed to compute RRG metrics" }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    return new Response(JSON.stringify({ error: "Endpoint not found" }), {
      status: 404,
      headers: corsHeaders,
    });
  },

  async scheduled(event: any, env: Env, ctx: any): Promise<void> {
    ctx.waitUntil(
      Promise.all([
        computeAndCacheRrgData(env, "1wk"),
        computeAndCacheRrgData(env, "1d"),
      ])
    );
  },
};
