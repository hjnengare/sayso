"use client";

// No imports needed for pure CSS hamburger animation

interface HamburgerMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export default function HamburgerMenu({ isOpen, onToggle, className = "" }: HamburgerMenuProps) {
  // No useEffect needed since we're using pure CSS for the hamburger animation

  return (
    <button
      onClick={onToggle}
      className={`
        w-10 h-10 flex flex-col items-center justify-center space-y-1
        hover:bg-card-bg/5 rounded-lg transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-sage/50 focus:ring-offset-2
        mobile-interaction touch-target-large
        ${className}
      `}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
    >
      {/* Custom hamburger lines that transform to X */}
      <div className="relative w-5 h-4 flex flex-col justify-center">
        {/* Top line */}
        <span
          className={`block h-0.5 w-5 bg-charcoal/70 transition-all duration-300 ease-in-out
            ${isOpen
              ? 'rotate-45 translate-y-1.5 bg-coral'
              : 'rotate-0 translate-y-0 hover:bg-card-bg'
            }
          `}
        />

        {/* Middle line */}
        <span
          className={`block h-0.5 w-5 bg-charcoal/70 transition-all duration-300 ease-in-out mt-1
            ${isOpen
              ? 'opacity-0 scale-0'
              : 'opacity-100 scale-100 hover:bg-card-bg'
            }
          `}
        />

        {/* Bottom line */}
        <span
          className={`block h-0.5 w-5 bg-charcoal/70 transition-all duration-300 ease-in-out mt-1
            ${isOpen
              ? '-rotate-45 -translate-y-1.5 bg-coral'
              : 'rotate-0 translate-y-0 hover:bg-card-bg'
            }
          `}
        />
      </div>
    </button>
  );
}
