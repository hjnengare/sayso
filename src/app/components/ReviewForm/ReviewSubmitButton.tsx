"use client";

import { ArrowRight } from "react-feather";

interface ReviewSubmitButtonProps {
  isFormValid: boolean;
  onSubmit: () => void;
}

export default function ReviewSubmitButton({ isFormValid, onSubmit }: ReviewSubmitButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isFormValid) {
      e.preventDefault();
      return;
    }
    onSubmit();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (!isFormValid) {
      e.preventDefault();
      return;
    }
    // Add visual feedback for touch
    e.currentTarget.style.opacity = '0.9';
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.currentTarget.style.opacity = '1';
  };

  return (
    <div className="px-4 relative z-20">
      <button
        type="button"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`w-full py-3.5 px-5 rounded-full text-sm font-600 transition-all duration-300 relative overflow-hidden touch-manipulation min-h-[48px] z-20 ${isFormValid
            ? "active:bg-navbar-bg/80 active:scale-[0.98] hover:bg-navbar-bg text-white focus:outline-none focus:ring-2 focus:ring-navbar-bg/50 focus:ring-offset-2 group hover:shadow-lg cursor-pointer"
            : "bg-charcoal/20 text-charcoal/40 cursor-not-allowed"
          }`}
        disabled={!isFormValid}
        style={{
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
          pointerEvents: isFormValid ? 'auto' : 'none',
          zIndex: 20,
          backgroundColor: isFormValid ? '#7D0F2A' : undefined, // Explicit navbar-bg color
          color: isFormValid ? '#FFFFFF' : undefined,
        }}
        aria-disabled={!isFormValid}
      >
        <span className="relative z-10 flex items-center justify-center space-x-2">
          <span>Submit Review</span>
          {isFormValid && <ArrowRight size={16} className="flex-shrink-0" />}
        </span>
      </button>
    </div>
  );
}
