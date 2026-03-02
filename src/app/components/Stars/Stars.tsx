import { Star, StarOutline } from "@/app/lib/icons";

interface StarsProps {
  value?: number;
  color?: string;
  size?: number;
  spacing?: number;
}

export default function Stars({ value = 5, color = "amber", size = 15, spacing = 2 }: StarsProps) {
  const numericValue = value !== undefined ? Math.max(0, Math.min(5, value)) : 0;
  const full = Math.floor(numericValue);
  const hasHalf = numericValue % 1 >= 0.5;
  const gradientId = color === "gold" ? "starGradientGold" : "starGradient";

  return (
    <div
      className="flex items-center transition-transform duration-200"
      style={{ gap: `${spacing}px`, fontSize: size }}
      aria-label={`Rating: ${value !== undefined ? value.toFixed(1) : 'No rating'} out of 5`}
    >
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="starGradientGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5D547" />
            <stop offset="100%" stopColor="#E6A547" />
          </linearGradient>
        </defs>
      </svg>
      {Array.from({ length: 5 }).map((_, i) => {
        const isFullStar = i < full;
        const isHalfStar = !isFullStar && i === full && hasHalf;
        const starColor =
          color === "gold"
            ? `url(#${gradientId})`
            : color === "charcoal"
            ? "#2a2a2a"
            : color === "navbar-bg"
            ? "#722F37"
            : color === "coral/90"
            ? "#f87171"
            : "#f59e0b";
        return (
          <span
            key={i}
            className="inline-flex items-center justify-center relative"
            style={{ width: size, height: size }}
            aria-hidden
          >
            {/* Background star (empty outline) */}
            <StarOutline
              className="transition-all duration-200 absolute"
              style={{
                width: size,
                height: size,
                color: starColor,
                opacity: 0.65,
              }}
            />
            {/* Foreground star (filled/half-filled) */}
            {(isFullStar || isHalfStar) && (
              <div
                style={{
                  width: isFullStar ? "100%" : "50%",
                  height: "100%",
                  overflow: "hidden",
                  position: "absolute",
                  left: 0,
                  top: 0
                }}
              >
                <Star
                  className="transition-all duration-200"
                  style={{
                    width: size,
                    height: size,
                    color: starColor,
                  }}
                />
              </div>
            )}
          </span>
        );
      })}
    </div>
  );
}
