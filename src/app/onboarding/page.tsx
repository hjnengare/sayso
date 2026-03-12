"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { m, useAnimationControls, useReducedMotion } from "framer-motion";

const HEADER_EASE_OUT_CUBIC = [0.33, 1, 0.68, 1] as const;
const CTA_EASE_OUT_CUBIC = [0.22, 1, 0.36, 1] as const;

export default function OnboardingPage() {
  const prefersReducedMotion = useReducedMotion();
  const ctaScaleControls = useAnimationControls();
  const loginRowControls = useAnimationControls();

  const pagePaddingStyles = {
    paddingTop: "calc(48px + env(safe-area-inset-top, 0px))",
    paddingRight: "calc(24px + env(safe-area-inset-right, 0px))",
    paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))",
    paddingLeft: "calc(24px + env(safe-area-inset-left, 0px))",
  } as const;

  useEffect(() => {
    if (prefersReducedMotion) {
      ctaScaleControls.set({ scale: 1 });
      loginRowControls.set({ opacity: 1 });
      return;
    }

    let active = true;

    const runMotionSequence = async () => {
      await ctaScaleControls.start({
        scale: 1.02,
        transition: {
          delay: 0.12,
          type: "spring",
          damping: 16,
          stiffness: 220,
          mass: 0.8,
        },
      });

      if (!active) return;

      await ctaScaleControls.start({
        scale: 1,
        transition: {
          type: "spring",
          damping: 22,
          stiffness: 260,
        },
      });

      if (!active) return;

      await loginRowControls.start({
        opacity: 1,
        transition: { duration: 0.18, ease: "easeOut" },
      });
    };

    void runMotionSequence();

    return () => {
      active = false;
      ctaScaleControls.stop();
      loginRowControls.stop();
    };
  }, [prefersReducedMotion, ctaScaleControls, loginRowControls]);

  return (
    <main
      className="min-h-[100svh] bg-[#E5E0E5] flex flex-col justify-between"
      style={pagePaddingStyles}
    >
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[344px] flex flex-col items-center gap-8 text-center">
          <m.div
            initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.26, ease: HEADER_EASE_OUT_CUBIC }
            }
            className="w-full flex flex-col items-center gap-4"
          >
            <Image
              src="/logos/logo.png"
              alt="Sayso logo"
              width={200}
              height={80}
              priority
              className="h-20 w-auto object-contain"
            />
            <h1 className="font-urbanist text-[34px] leading-[40px] font-700 tracking-tight text-[#2D2D2D]">
              Discover gems near you
            </h1>
            <p className="max-w-[288px] md:max-w-[600px] font-urbanist text-[16px] leading-[24px] font-normal text-[rgba(45,45,45,0.72)]">
              Explore trusted businesses, leave reviews, and see what&apos;s trending around you.
            </p>
          </m.div>

          <m.div
            initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { delay: 0.12, duration: 0.2, ease: CTA_EASE_OUT_CUBIC }
            }
            className="w-full"
          >
            <m.div
              initial={prefersReducedMotion ? { scale: 1 } : { scale: 0.96 }}
              animate={prefersReducedMotion ? { scale: 1 } : ctaScaleControls}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
              className="w-full"
            >
              <Link
                href="/home?guest=true"
                className="w-full min-h-[56px] rounded-full bg-navbar-bg text-[#FFFFFF] text-[16px] font-700 leading-[24px] font-urbanist flex items-center justify-center shadow-md transition-colors duration-200 hover:bg-navbar-bg/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-navbar-bg/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#E5E0E5]"
              >
                Get Started
              </Link>
            </m.div>
          </m.div>

          <m.div
            initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : loginRowControls}
            className="flex flex-col items-center gap-1 font-urbanist text-[14px] leading-[24px] font-normal text-[rgba(45,45,45,0.72)]"
          >
            <p>
              Already have an account?{" "}
              <Link href="/login" className="font-700 text-[#2D2D2D] hover:underline">
                Log In
              </Link>
            </p>
            <p>
              New to Sayso?{" "}
              <Link href="/register" className="font-700 text-[#2D2D2D] hover:underline">
                Create Account
              </Link>
            </p>
          </m.div>
        </div>
      </div>

      <p className="w-full text-center font-urbanist text-[14px] leading-[24px] italic font-medium text-[rgba(45,45,45,0.72)]">
        Less guessing, more confessing
      </p>
    </main>
  );
}
