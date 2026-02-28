export const pillBase =
  "inline-flex items-center gap-1 rounded-full font-urbanist transition-all duration-[200ms] ease-out shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-card-bg/50 cursor-pointer";

export const pillSize = {
  sm: "px-3 py-1 text-xs",
  md: "px-3 sm:px-4 py-1.5 text-xs sm:text-sm",
} as const;

export const pillInactive =
  "bg-white/60 border border-charcoal/12 text-charcoal/70 hover:bg-white/78 hover:text-charcoal/88";

export const pillActive =
  "bg-card-bg/92 border border-card-bg/50 text-white";
