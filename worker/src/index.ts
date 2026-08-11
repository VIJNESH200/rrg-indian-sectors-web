import { fetchAllPrices } from "./fetcher.js";
import { computeRrgMetrics, DEFAULT_CONFIG } from "./rrg_engine.js";

export interface Env {
  RRG_CACHE?: any;
  ENVIRONMENT?: string;
  ALLOWED_ORIGIN?: string;
}

const CACHE_KEY = "rrg_latest_metrics_v1";
const CACHE_TTL_SECONDS = 86400; // 24 hours KV TTL

export async function computeAndCacheRrgData(env: Env) {
  console.log("Computing fresh RRG data from Yahoo Finance...");
  const fetchResult = await fetchAllPrices({ range: "5y", interval: "1wk" });
  const computed = computeRrgMetrics(fetchResult.dates, fetchResult.prices, DEFAULT_CONFIG);

  const payload = {
    ...computed,
    fetchWarnings: fetchResult.warnings,
    updatedAt: new Date().toISOString(),
    cached: false,
  };

  if (env.RRG_CACHE) {
    try {
      await env.RRG_CACHE.put(CACHE_KEY, JSON.stringify(payload), {
        expirationTtl: CACHE_TTL_SECONDS,
      });
      console.log("Updated Cloudflare KV Cache with fresh RRG data");
    } catch (e: any) {
      console.warn("Failed to write to Cloudflare KV Cache:", e.message);
    }
  }

  return payload;
}

async function getOrComputeRrgData(env: Env, ctx?: any, forceRefresh: boolean = false) {
  if (!forceRefresh && env.RRG_CACHE) {
    try {
      const cached = await env.RRG_CACHE.get(CACHE_KEY, "json");
      if (cached) {
        // If data is older than 4 hours, serve stale immediately and trigger background refresh via ctx.waitUntil
        const ageMs = cached.updatedAt ? Date.now() - new Date(cached.updatedAt).getTime() : 0;
        const STALE_THRESHOLD_MS = 4 * 3600 * 1000;

        if (ageMs > STALE_THRESHOLD_MS && ctx && typeof ctx.waitUntil === "function") {
          console.log("KV Cache entry is stale (> 4h). Triggering background update...");
          ctx.waitUntil(computeAndCacheRrgData(env));
        } else {
          console.log("Serving fresh RRG data from Cloudflare KV Cache");
        }

        return { ...cached, cached: true };
      }
    } catch (e: any) {
      console.warn("KV Cache lookup failed:", e.message);
    }
  }

  return await computeAndCacheRrgData(env);
}

function getCorsHeaders(request: Request, env: Env) {
  const requestOrigin = request.headers.get("Origin") || "*";
  const allowedOrigin = env.ALLOWED_ORIGIN || (env.ENVIRONMENT === "production" ? requestOrigin : "*");

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Diagnostic endpoint: disabled in production for security
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
      try {
        const data = await getOrComputeRrgData(env, ctx, forceRefresh);
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
    ctx.waitUntil(computeAndCacheRrgData(env));
  },
};
