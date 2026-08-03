import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const RATE_KEY = "rate";
const DEFAULT_RATE_PER_KWH = 14.98;

export async function GET() {
  const { env } = await getCloudflareContext();
  const stored = await env.RATE_KV.get(RATE_KEY);
  const rate = stored ? Number(stored) : DEFAULT_RATE_PER_KWH;
  return NextResponse.json({ rate: Number.isNaN(rate) ? DEFAULT_RATE_PER_KWH : rate });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rate = body?.rate;

  if (typeof rate !== "number" || Number.isNaN(rate) || rate <= 0) {
    return NextResponse.json({ error: "Invalid rate" }, { status: 400 });
  }

  const { env } = await getCloudflareContext();
  await env.RATE_KV.put(RATE_KEY, String(rate));

  return NextResponse.json({ rate });
}
