"use client";

import { useEffect, useRef, useState } from "react";

type HistoryItem = {
  id: number;
  pct: number;
  timestamp: string;
  durationLabel: string;
  finishLabel: string;
};

const CALIBRATION: [number, number][] = [
  [0, 228],
  [43, 130],
  [73, 62],
  [100, 0],
];

const BUFFER_MINUTES = 30;
const DEFAULT_RATE_PER_KWH = 14.98;
const DEFAULT_FULL_CHARGE_COST = 23.63;
const HISTORY_KEY = "prismz1-history";
const MAX_HISTORY = 2;

type SpeedMode = "40" | "1" | "2" | "3";

const SPEED_LABELS: Record<SpeedMode, string> = {
  "40": "40 Odo",
  "1": "Speed 1",
  "2": "Speed 2",
  "3": "Speed 3",
};

// km of range per 1% battery, derived from GPS-calibrated field samples
const KM_PER_PERCENT: Record<SpeedMode, number> = {
  "40": 0.875,
  "1": 0.271,
  "2": 0.258,
  "3": 0.278,
};

function interpolateBaseMinutes(pct: number): number {
  for (let i = 0; i < CALIBRATION.length - 1; i++) {
    const [x0, y0] = CALIBRATION[i];
    const [x1, y1] = CALIBRATION[i + 1];
    if (pct >= x0 && pct <= x1) {
      const t = (pct - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return 0;
}

function computeCost(pct: number, rate: number): number {
  const rateRatio = rate / DEFAULT_RATE_PER_KWH;
  return ((100 - pct) / 100) * DEFAULT_FULL_CHARGE_COST * rateRatio;
}

function formatDurationSpaced(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours} H ${String(minutes).padStart(2, "0")} M`;
}

function formatDurationCompact(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}H ${String(minutes).padStart(2, "0")}M`;
}

function formatClock(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [rateInput, setRateInput] = useState(String(DEFAULT_RATE_PER_KWH));
  const [speedMode, setSpeedMode] = useState<SpeedMode>("1");
  const [totalMinutes, setTotalMinutes] = useState<number | null>(null);
  const [cost, setCost] = useState<number | null>(null);
  const [finishLabel, setFinishLabel] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const rateLoaded = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {
        // ignore corrupt data
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    fetch("/api/rate")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.rate === "number") {
          setRateInput(String(data.rate));
        }
      })
      .catch(() => {
        // fall back to default rate already in state
      })
      .finally(() => {
        rateLoaded.current = true;
      });
  }, []);

  useEffect(() => {
    if (!rateLoaded.current) return;
    const rate = Number(rateInput);
    if (Number.isNaN(rate) || rate <= 0) return;

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate }),
      }).catch(() => {
        // ignore network errors, will retry on next change
      });
    }, 500);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [rateInput]);

  function handleCalculate() {
    const pct = Number(inputValue);
    if (inputValue.trim() === "" || Number.isNaN(pct) || pct < 0 || pct > 100) {
      alert("Please enter a valid battery percentage between 0 and 100.");
      return;
    }

    const rate = Number(rateInput);
    if (Number.isNaN(rate) || rate <= 0) {
      alert("Please enter a valid rate.");
      return;
    }

    const baseMinutes = interpolateBaseMinutes(pct);
    const total = baseMinutes + BUFFER_MINUTES;
    const totalCost = Math.round(computeCost(pct, rate) * 100) / 100;
    const now = new Date();
    const finish = new Date(now.getTime() + total * 60000);
    const finishStr = formatClock(finish);

    setTotalMinutes(total);
    setCost(totalCost);
    setFinishLabel(finishStr);

    const newItem: HistoryItem = {
      id: Date.now(),
      pct,
      timestamp: formatClock(now),
      durationLabel: formatDurationCompact(total),
      finishLabel: finishStr,
    };
    setHistory((prev) => [newItem, ...prev].slice(0, MAX_HISTORY));
  }

  function handleClear() {
    setInputValue("");
    setTotalMinutes(null);
    setCost(null);
    setFinishLabel(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleCalculate();
    }
  }

  const currentPct = Number(inputValue);
  const remainingKm =
    inputValue.trim() !== "" && !Number.isNaN(currentPct) && currentPct >= 0 && currentPct <= 100
      ? currentPct * KM_PER_PERCENT[speedMode]
      : null;

  return (
    <div className="min-h-screen bg-[#0d0e0f] flex items-start justify-center p-6">
      <div className="w-full max-w-md mt-8">
        <div className="rounded-3xl bg-[#1d1f21] border border-white/10 p-6 shadow-xl">
          <h1 className="flex items-center justify-center gap-2 text-xl font-bold text-[#4CAF50] mb-6 text-center">
            <span>🔋</span>
            <span>PrismZ1 Battery Calculator</span>
          </h1>

          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-2">
              Current Battery %
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 34"
              className="w-full rounded-xl bg-[#2a2c2e] text-white text-center py-3 px-4 outline-none focus:ring-2 focus:ring-[#4CAF50] placeholder:text-gray-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-2">
              Rate (₱/kWh)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              className="w-full rounded-xl bg-[#2a2c2e] text-white text-center py-2 px-3 outline-none focus:ring-2 focus:ring-[#4CAF50]"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-2">
              Speed Mode
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(SPEED_LABELS) as SpeedMode[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSpeedMode(key)}
                  className={`rounded-xl py-2 text-sm font-semibold transition-colors ${
                    speedMode === key
                      ? "bg-[#4CAF50] text-white"
                      : "bg-[#2a2c2e] text-gray-300 hover:bg-[#333537]"
                  }`}
                >
                  {key === "40" ? "40 Odo" : key}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            <button
              onClick={handleCalculate}
              className="w-full rounded-xl bg-[#4CAF50] text-white font-semibold py-3 hover:bg-[#43a047] transition-colors"
            >
              Calculate
            </button>
            <button
              onClick={handleClear}
              className="w-full rounded-xl bg-[#2a2c2e] text-white font-semibold py-3 hover:bg-[#333537] transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="rounded-2xl bg-[#2a2c2e] p-5 text-center mb-6">
            <p className="text-xs text-gray-400 mb-1">Time to Full Charge</p>
            <p className="text-3xl font-bold text-[#4CAF50] mb-2">
              {totalMinutes !== null ? formatDurationSpaced(totalMinutes) : "-- H -- M"}
            </p>
            <p className="text-xs text-gray-400">
              Added 30 mins buffer | ₱{cost !== null ? cost.toFixed(2) : "--.--"} (@ ₱{Number(rateInput || DEFAULT_RATE_PER_KWH).toFixed(2)}/kWh)
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {finishLabel ? `Finishes at ${finishLabel}` : "Finishes at --:-- --"}
            </p>
          </div>

          <div className="rounded-2xl bg-[#2a2c2e] p-5 text-center mb-6">
            <p className="text-xs text-gray-400 mb-1">Remaining Range ({SPEED_LABELS[speedMode]})</p>
            <p className="text-3xl font-bold text-[#4CAF50]">
              {remainingKm !== null ? `${remainingKm.toFixed(2)} km` : "-- km"}
            </p>
          </div>

          <div>
            <h2 className="text-sm font-bold text-[#4CAF50] mb-3">History</h2>
            {history.length === 0 ? (
              <p className="text-xs text-gray-500">No history yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {history.map((item) => (
                  <div key={item.id} className="rounded-xl bg-[#2a2c2e] p-3 text-center">
                    <p className="text-[11px] text-gray-400 mb-1">
                      {item.timestamp} &ndash; {item.pct}%
                    </p>
                    <p className="text-lg font-bold text-[#4CAF50]">{item.durationLabel}</p>
                    <p className="text-[11px] text-gray-500">({item.finishLabel})</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 mt-6 text-[11px] text-gray-500">
            <span>⚠️</span>
            <span>
              Estimates only. Charging time and distance may vary depending on battery health, rider weight, terrain, riding style, and weather.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
