"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  claimLocationPromptSessionSlot,
  useBusinessDistanceLocation,
} from "../../hooks/useBusinessDistanceLocation";

interface LocationPromptBannerProps {
  hasCoordinateBusinesses: boolean;
}

export default function LocationPromptBanner({
  hasCoordinateBusinesses,
}: LocationPromptBannerProps) {
  const prefersReducedMotion = useReducedMotion();
  const {
    promptVariant,
    shouldShowPrompt,
    status,
    requestLocation,
    dismissPromptForSevenDays,
    acknowledgeDeniedPrompt,
  } = useBusinessDistanceLocation({ hasCoordinateBusinesses });

  const [claimedSessionSlot, setClaimedSessionSlot] = useState(false);

  useEffect(() => {
    if (!shouldShowPrompt || claimedSessionSlot) return;
    if (claimLocationPromptSessionSlot()) {
      setClaimedSessionSlot(true);
    }
  }, [claimedSessionSlot, shouldShowPrompt]);

  const shouldRender = claimedSessionSlot && shouldShowPrompt && !!promptVariant;
  const isDenied = promptVariant === "denied";

  return (
    <AnimatePresence>
      {shouldRender && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 top-0 z-[70] px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:px-4 sm:pt-[calc(env(safe-area-inset-top)+0.75rem)]"
          initial={{ opacity: 0, y: prefersReducedMotion ? -4 : -14, scale: prefersReducedMotion ? 1 : 0.99 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: prefersReducedMotion ? 0.16 : 0.28, ease: [0.2, 0.8, 0.2, 1] },
          }}
          exit={{
            opacity: 0,
            y: prefersReducedMotion ? -4 : -10,
            scale: 0.99,
            transition: { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] },
          }}
        >
          <div className="pointer-events-auto mx-auto w-full max-w-xl rounded-2xl border border-white/60 bg-off-white/95 px-4 py-3 shadow-[0_10px_35px_rgba(0,0,0,0.12)] backdrop-blur-md">
            <h3
              className="text-sm font-semibold text-charcoal"
              style={{
                fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                fontWeight: 600,
              }}
            >
              {isDenied ? "Location is off" : "See places near you"}
            </h3>
            <p
              className="mt-1 text-xs text-charcoal/75"
              style={{
                fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              }}
            >
              {isDenied
                ? "Turn it on in browser settings to see distances."
                : "We use your location to show distance and nearby results."}
            </p>
            <div className="mt-3 flex items-center justify-end gap-2">
              {isDenied ? (
                <button
                  type="button"
                  onClick={acknowledgeDeniedPrompt}
                  className="rounded-full border border-charcoal/20 px-3 py-1.5 text-xs text-charcoal/80 transition-colors duration-200 hover:border-charcoal/35 hover:text-charcoal"
                  style={{
                    fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  }}
                >
                  Got it
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={dismissPromptForSevenDays}
                    className="rounded-full border border-charcoal/20 px-3 py-1.5 text-xs text-charcoal/80 transition-colors duration-200 hover:border-charcoal/35 hover:text-charcoal"
                    style={{
                      fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    onClick={requestLocation}
                    disabled={status === "loading"}
                    className="rounded-full bg-navbar-bg px-3 py-1.5 text-xs text-white transition-opacity duration-200 disabled:cursor-wait disabled:opacity-70"
                    style={{
                      fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    {status === "loading" ? "Enabling..." : "Enable location"}
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
