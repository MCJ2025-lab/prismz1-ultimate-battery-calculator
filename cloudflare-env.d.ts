// Regenerate with `npm run cf-typegen` once the KV namespace is bound in wrangler.jsonc
import type { KVNamespace, Fetcher } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    RATE_KV: KVNamespace;
    ASSETS: Fetcher;
  }
}
