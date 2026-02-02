// src/app/components/Header/HeaderSkeleton.tsx
"use client";

/**
 * Mobile-first skeleton loader for Header component
 * Displays animated placeholder while header loads
 * Matches the current Header layout with personal/business account support
 */
export default function HeaderSkeleton({
  variant = "white",
  showSearch = true,
}: {
  variant?: "white" | "frosty";
  showSearch?: boolean;
}) {
  const bgClass = variant === "frosty"
    ? "bg-white/70 backdrop-blur-lg"
    : "bg-navbar-bg";

  return (
    <header 
      className={`sticky top-0 left-0 right-0 w-full max-w-7xl mx-auto z-50 ${bgClass} shadow-md transition-all duration-300`}
      aria-label="Loading header"
      aria-busy="true"
    >
      <div className="relative py-4 z-[1] mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center h-full min-h-[72px] lg:min-h-[80px]">
        
        {/* Mobile Layout - Mobile First */}
        <div className="flex lg:hidden items-center gap-2 w-full min-h-[48px]">
          {/* Logo skeleton - mobile */}
          <div className="pl-2">
            <div className="w-20 h-7 sm:w-24 sm:h-8 bg-gradient-to-r from-charcoal/10 via-charcoal/5 to-charcoal/10 rounded-md animate-shimmer" />
          </div>

          {/* Right side icons - mobile */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Search icon */}
            {showSearch && (
              <div className="w-10 h-10 bg-gradient-to-r from-charcoal/10 via-charcoal/5 to-charcoal/10 rounded-lg animate-shimmer" 
                   style={{ animationDelay: '100ms' }} />
            )}
            
            {/* Notification icon */}
            <div className="w-10 h-10 bg-gradient-to-r from-charcoal/10 via-charcoal/5 to-charcoal/10 rounded-lg animate-shimmer" 
                 style={{ animationDelay: '200ms' }} />
            
            {/* Menu icon */}
            <div className="w-10 h-10 bg-gradient-to-r from-charcoal/10 via-charcoal/5 to-charcoal/10 rounded-lg animate-shimmer" 
                 style={{ animationDelay: '300ms' }} />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-4 w-full">
          {/* Left: Logo skeleton */}
          <div className="flex items-center">
            <div className="w-28 h-9 bg-gradient-to-r from-charcoal/10 via-charcoal/5 to-charcoal/10 rounded-md animate-shimmer" />
          </div>

          {/* Center: Navigation skeleton */}
          <div className="flex justify-center gap-6">
            <div className="w-14 h-8 bg-gradient-to-r from-charcoal/10 via-charcoal/5 to-charcoal/10 rounded-md animate-shimmer" 
                 style={{ animationDelay: '100ms' }} />
            <div className="w-20 h-8 bg-gradient-to-r from-charcoal/10 via-charcoal/5 to-charcoal/10 rounded-md animate-shimmer" 
                 style={{ animationDelay: '200ms' }} />
            <div className="w-24 h-8 bg-gradient-to-r from-charcoal/10 via-charcoal/5 to-charcoal/10 rounded-md animate-shimmer" 
                 style={{ animationDelay: '300ms' }} />
          </div>

          {/* Right: Search + Icons skeleton */}
          <div className="flex items-center justify-end gap-3">
            {/* Search bar */}
            {showSearch && (
              <div className="w-[280px] h-10 bg-gradient-to-r from-charcoal/10 via-charcoal/5 to-charcoal/10 rounded-full animate-shimmer" 
                   style={{ animationDelay: '150ms' }} />
            )}
            
            {/* Icon group */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-charcoal/10 via-charcoal/5 to-charcoal/10 rounded-lg animate-shimmer" 
                   style={{ animationDelay: '400ms' }} />
              <div className="w-10 h-10 bg-gradient-to-r from-charcoal/10 via-charcoal/5 to-charcoal/10 rounded-lg animate-shimmer" 
                   style={{ animationDelay: '500ms' }} />
              <div className="w-10 h-10 bg-gradient-to-r from-charcoal/10 via-charcoal/5 to-charcoal/10 rounded-lg animate-shimmer" 
                   style={{ animationDelay: '600ms' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Shimmer animation styles */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
    </header>
  );
}
