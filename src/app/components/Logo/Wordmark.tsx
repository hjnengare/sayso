import React from "react";

interface WordmarkProps {
  className?: string;
  size?: string; // Tailwind text size class, e.g. "text-xl"
  hoverLabel?: string;
}

export default function Wordmark({
  className = "",
  size = "text-xl",
  hoverLabel,
}: WordmarkProps) {
  const renderBrandText = () => (
    <>
      <span className="text-[1.05em] sayso-wordmark">S</span>
      <span className="text-[0.9em] sayso-wordmark">ayso</span>
    </>
  );

  if (!hoverLabel) {
    return (
      <span
        className={`sayso-wordmark inline-flex items-center whitespace-nowrap ${size} font-normal leading-none select-none text-white ${className}`}
      >
        {renderBrandText()}
      </span>
    );
  }

  return (
    <span
      data-home-swap="true"
      className={`sayso-wordmark inline-flex items-center whitespace-nowrap ${size} font-normal leading-none select-none text-white ${className}`}
    >
      <span className="sr-only">sayso</span>
      <span
        aria-hidden="true"
        data-wordmark-swap
        className="relative inline-grid place-items-center overflow-hidden align-middle"
      >
        <span className="col-start-1 row-start-1 inline-flex items-center whitespace-nowrap opacity-0">
          {renderBrandText()}
        </span>
        <span
          data-wordmark-primary
          className="col-start-1 row-start-1 inline-flex items-center whitespace-nowrap"
        >
          {renderBrandText()}
        </span>
        <span
          data-wordmark-hover
          className="col-start-1 row-start-1 inline-flex items-center justify-center whitespace-nowrap text-[0.88em] tracking-[0.14em]"
        >
          {hoverLabel}
        </span>
      </span>
    </span>
  );
}
