import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function faNum(value: number | string): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

export function faInt(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}

/* Deterministic PRNG so "estimated" analyses stay stable per company. */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(arr: T[], r: number): T {
  return arr[Math.min(arr.length - 1, Math.floor(r * arr.length))];
}

export function scoreTone(score: number): "bad" | "mid" | "good" {
  if (score < 45) return "bad";
  if (score < 70) return "mid";
  return "good";
}

export const toneColor: Record<"bad" | "mid" | "good", string> = {
  bad: "#F0655A",
  mid: "#F2A93B",
  good: "#3DDC97",
};
