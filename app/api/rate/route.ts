import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "rate.json");
const DEFAULT_RATE_PER_KWH = 14.98;

async function readRate(): Promise<number> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.rate === "number" && parsed.rate > 0) {
      return parsed.rate;
    }
  } catch {
    // file missing or invalid — fall back to default
  }
  return DEFAULT_RATE_PER_KWH;
}

export async function GET() {
  const rate = await readRate();
  return NextResponse.json({ rate });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rate = body?.rate;

  if (typeof rate !== "number" || Number.isNaN(rate) || rate <= 0) {
    return NextResponse.json({ error: "Invalid rate" }, { status: 400 });
  }

  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify({ rate }), "utf-8");

  return NextResponse.json({ rate });
}
