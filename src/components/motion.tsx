"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { motion, useInView, useSpring, useMotionValue } from "framer-motion";
import { faInt, toneColor, scoreTone } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Reveal({
  children,
  delay = 0,
  className,
  y = 26,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function Stat({
  value,
  label,
  sub,
  tone = "default",
}: {
  value: number;
  label: string;
  sub?: string;
  tone?: "default" | "gold" | "mint" | "rose";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 18 });
  const numRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => {
      if (numRef.current) numRef.current.textContent = faInt(Math.round(v));
    });
    return unsub;
  }, [spring]);

  const color =
    tone === "gold"
      ? "text-gold-400"
      : tone === "mint"
        ? "text-mint-400"
        : tone === "rose"
          ? "text-rose-450"
          : "text-white";

  return (
    <div ref={ref} className="card-surface rounded-2xl p-5">
      <div className={`text-4xl font-black tabular-nums ${color}`}>
        <span ref={numRef}>۰</span>
      </div>
      <div className="mt-2 text-[13px] font-bold text-fog-300">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-fog-500">{sub}</div>}
    </div>
  );
}

export function ScoreRing({
  score,
  size = 64,
  stroke = 6,
  label,
}: {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const color = toneColor[scoreTone(score)];
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          whileInView={{ strokeDashoffset: circ - (circ * score) / 100 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: EASE }}
          style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}
        />
      </svg>
      <div className="absolute text-center leading-none">
        <div className="font-black tabular-nums" style={{ color, fontSize: size / 3 }}>
          {faInt(score)}
        </div>
        {label && <div className="mt-0.5 text-[9px] text-fog-500">{label}</div>}
      </div>
    </div>
  );
}
