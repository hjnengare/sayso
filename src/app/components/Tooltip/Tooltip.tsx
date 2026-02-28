"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export default function Tooltip({ 
  content, 
  children, 
  position = "top" 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isTruncated, setIsTruncated] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkTruncation = () => {
      if (triggerRef.current) {
        const element = triggerRef.current.querySelector('h3, span, div') as HTMLElement;
        if (element) {
          setIsTruncated(element.scrollWidth > element.clientWidth);
        }
      }
    };

    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [content]);

  useEffect(() => {
    if (isVisible && isTruncated && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      let top = 0;
      let left = 0;

      switch (position) {
        case "top":
          top = triggerRect.top - tooltipRect.height - 8;
          left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
          break;
        case "bottom":
          top = triggerRect.bottom + 8;
          left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
          break;
        case "left":
          top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
          left = triggerRect.left - tooltipRect.width - 8;
          break;
        case "right":
          top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
          left = triggerRect.right + 8;
          break;
      }

      // Keep tooltip within viewport
      const padding = 8;
      if (left < padding) left = padding;
      if (left + tooltipRect.width > window.innerWidth - padding) {
        left = window.innerWidth - tooltipRect.width - padding;
      }
      if (top < padding) top = padding;
      if (top + tooltipRect.height > window.innerHeight - padding) {
        top = window.innerHeight - tooltipRect.height - padding;
      }

      setTooltipPosition({ top, left });
    }
  }, [isVisible, isTruncated, position]);

  const handleMouseEnter = () => {
    if (isTruncated) {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-full"
      >
        {children}
      </div>
      {isVisible && isTruncated && typeof window !== "undefined" && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-[9999] px-3 py-2 bg-charcoal/95 text-white text-sm font-medium rounded-lg shadow-lg pointer-events-none transition-opacity duration-200"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            fontFamily: '"Google Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          }}
        >
          {content}
          <div
            className="absolute w-2 h-2 bg-charcoal/95 rotate-45"
            style={{
              [position === "top" ? "bottom" : position === "bottom" ? "top" : position === "left" ? "right" : "left"]: "-4px",
              [position === "top" || position === "bottom" ? "left" : "top"]: "50%",
              transform: position === "top" || position === "bottom" 
                ? "translateX(-50%)" 
                : "translateY(-50%)",
            }}
          />
        </div>,
        document.body
      )}
    </>
  );
}






