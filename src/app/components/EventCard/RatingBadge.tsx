import { Star } from "lucide-react";

interface RatingBadgeProps {
  rating: number;
}

export default function RatingBadge({ rating }: RatingBadgeProps) {
  return (
    <span className="absolute right-2 top-2 z-20 inline-flex items-center gap-1 rounded-[12px] bg-gradient-to-br from-off-white via-off-white to-off-white/90 backdrop-blur-xl px-2.5 py-1 text-charcoal border-none">
      <Star className="w-3 h-3 text-coral fill-coral shadow-md" />
      <span className="text-sm sm:text-xs font-semibold" style={{ fontFamily: '"Google Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
        {rating.toFixed(1)}
      </span>
    </span>
  );
}




