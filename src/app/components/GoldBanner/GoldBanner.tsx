"use client";

import { useId, type ReactNode } from "react";

interface GoldBannerProps {
  children?: ReactNode;
  className?: string;
  /** Accessible label describing the banner */
  label?: string;
}

export function GoldBanner({ children, className, label }: GoldBannerProps) {
  // Unique IDs so multiple instances don't conflict in the same document
  const uid = useId().replace(/:/g, "");
  const ids = {
    body:   `${uid}body`,
    sheen:  `${uid}sheen`,
    rollL:  `${uid}rollL`,
    rollR:  `${uid}rollR`,
    drop:   `${uid}drop`,
  };

  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      className={["relative w-full select-none", className].filter(Boolean).join(" ")}
    >
      {/* ─── SVG banner ─────────────────────────────────────────────────────── */}
      <svg
        viewBox="0 0 600 130"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        aria-hidden="true"
      >
        <defs>
          {/* ── Main body: vertical gold ramp with bright centre highlight ── */}
          <linearGradient id={ids.body} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#b8820a" />
            <stop offset="18%"  stopColor="#dfa015" />
            <stop offset="46%"  stopColor="#f5d060" />
            <stop offset="74%"  stopColor="#dfa015" />
            <stop offset="100%" stopColor="#9e6e06" />
          </linearGradient>

          {/* ── Radial sheen: oval highlight centred slightly above midline ── */}
          <radialGradient id={ids.sheen} cx="50%" cy="38%" r="44%">
            <stop offset="0%"   stopColor="rgba(255,252,195,0.60)" />
            <stop offset="100%" stopColor="rgba(255,252,195,0)" />
          </radialGradient>

          {/* ── Left roll face: dark outer edge fading to lit front face ── */}
          <linearGradient id={ids.rollL} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#4e3000" />
            <stop offset="35%"  stopColor="#b87e0c" />
            <stop offset="70%"  stopColor="#dda015" />
            <stop offset="100%" stopColor="#be8010" />
          </linearGradient>

          {/* ── Right roll face: mirror of left ── */}
          <linearGradient id={ids.rollR} x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%"   stopColor="#4e3000" />
            <stop offset="35%"  stopColor="#b87e0c" />
            <stop offset="70%"  stopColor="#dda015" />
            <stop offset="100%" stopColor="#be8010" />
          </linearGradient>

          {/* ── Drop shadow ── */}
          <filter id={ids.drop} x="-6%" y="-30%" width="112%" height="175%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur" />
            <feOffset in="blur" dx="0" dy="8" result="offsetBlur" />
            <feFlood floodColor="#000" floodOpacity="0.28" result="col" />
            <feComposite in="col" in2="offsetBlur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter={`url(#${ids.drop})`}>
          {/* ───────────────── LEFT CURL ───────────────── */}

          {/* Top fold shadow — the dark underside of the banner folding back */}
          {/*  (68,22) sweeps down via bezier to the fold point (34,48),         */}
          {/*  then across the midline to (34,65) → (68,65)                      */}
          <path
            d="M 68,22 C 52,22 38,32 34,48 L 34,65 L 68,65 Z"
            fill="#6a4600"
          />

          {/* Bottom fold shadow — mirror of top */}
          <path
            d="M 68,65 L 34,65 C 38,82 52,108 68,108 Z"
            fill="#5a3a00"
          />

          {/* ───────────────── MAIN BODY ───────────────── */}
          <rect x="68" y="22" width="464" height="86" fill={`url(#${ids.body})`} />
          {/* Sheen overlay — second rect so the radial gradient sits on top */}
          <rect x="68" y="22" width="464" height="86" fill={`url(#${ids.sheen})`} />

          {/* ───────────────── RIGHT CURL ──────────────── */}
          <path
            d="M 532,22 C 548,22 562,32 566,48 L 566,65 L 532,65 Z"
            fill="#6a4600"
          />
          <path
            d="M 532,65 L 566,65 C 562,82 548,108 532,108 Z"
            fill="#5a3a00"
          />

          {/* ─── Roll faces — drawn last so they sit above the shadow folds ─── */}
          {/* Left: narrow vertical ellipse; gradient simulates cylindrical form  */}
          <ellipse cx="32" cy="65" rx="10" ry="24" fill={`url(#${ids.rollL})`} />
          {/* Right: mirror */}
          <ellipse cx="568" cy="65" rx="10" ry="24" fill={`url(#${ids.rollR})`} />
        </g>
      </svg>

      {/* ─── Content overlay ──────────────────────────────────────────────── */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center px-[18%]">
          {children}
        </div>
      )}
    </div>
  );
}
