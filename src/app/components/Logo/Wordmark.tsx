import React from "react";

interface WordmarkProps {
  className?: string;
  size?: string; // Tailwind text size class, e.g. "text-xl"
}

export default function Wordmark({ className = "", size = "text-xl" }: WordmarkProps) {
  return (
    <span
      className={`sayso-wordmark inline-flex items-center whitespace-nowrap ${size} font-normal leading-none select-none text-white ${className}`}
    >
      <span className="text-[1.05em] sayso-wordmark">S</span>
      <span className="text-[0.9em] sayso-wordmark">ayso</span>
    </span>
  );
}
