"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { IoArrowBack, IoHome, IoSearch } from "react-icons/io5";
import FloatingElements from "./components/Animations/FloatingElements";
import FadeInUp from "./components/Animations/FadeInUp";
import PremiumHover from "./components/Animations/PremiumHover";

export default function NotFound() {
  return (
    <div 
      className="min-h-dvh bg-off-white relative overflow-hidden font-urbanist"
      style={{
        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      {/* Floating background elements */}
      <FloatingElements />

      <div className="relative z-10 flex items-center justify-center min-h-dvh px-4 py-8">
        <div className="text-center max-w-lg mx-auto">

          {/* 404 Icon/Number */}
          <FadeInUp delay={0.1}>
            <motion.div
              className="relative mb-8"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {/* Large 404 with subtle glow */}
              <h1 className="font-urbanist text-8xl md:text-9xl font-800 text-transparent bg-clip-text bg-gradient-to-r from-charcoal via-sage to-charcoal mb-2 relative">
                404
                {/* Subtle glow effect */}
                <div className="absolute inset-0 font-urbanist text-8xl md:text-9xl font-800 text-sage/10 blur-lg -z-10">
                  404
                </div>
              </h1>

              {/* Floating search icon */}
              <motion.div
                className="absolute -top-4 -right-4 p-3 bg-off-white  /80 backdrop-blur-sm rounded-full shadow-lg border border-sage/10"
                initial={{ rotate: -15, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <IoSearch className="w-6 h-6 text-sage" />
              </motion.div>
            </motion.div>
          </FadeInUp>

          {/* Heading and description */}
          <FadeInUp delay={0.3}>
            <h2 className="font-urbanist text-lg md:text-4xl font-700 text-charcoal mb-4">
              Oops! Page Not Found
            </h2>
          </FadeInUp>

          <FadeInUp delay={0.4}>
            <p className="font-urbanist text-lg md:text-xl font-600 text-charcoal/70 mb-8 max-w-lg mx-auto leading-relaxed">
              The page you&apos;re looking for seems to have wandered off. Let&apos;s get you back on track!
            </p>
          </FadeInUp>

          {/* Action buttons */}
          <FadeInUp delay={0.5}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">

              {/* Primary CTA - Go Home */}
              <PremiumHover scale={1.02}>
                <Link
                  href="/interests"
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto py-4 px-8 bg-gradient-to-r from-sage to-sage/90 text-white font-urbanist font-600 text-lg rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-sage/20 group"
                >
                  <IoHome className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
                  Go Home
                </Link>
              </PremiumHover>

              {/* Secondary CTA - Go Back */}
              <PremiumHover scale={1.02}>
                <button
                  onClick={() => window.history.back()}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto py-4 px-8 bg-off-white  /80 backdrop-blur-sm text-charcoal font-urbanist font-600 text-lg rounded-lg border border-sage/20 shadow-sm transition-all duration-300 hover:shadow-md hover:bg-off-white/90 group"
                >
                  <IoArrowBack className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
                  Go Back
                </button>
              </PremiumHover>

            </div>
          </FadeInUp>

          {/* Helpful links */}
          <FadeInUp delay={0.6}>
            <div className="mt-12 pt-8 border-t border-sage/10">
              <p className="font-urbanist text-sm font-500 text-charcoal/70 mb-4">
                Popular pages:
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <Link
                  href="/interests"
                  className="font-urbanist font-500 text-sage hover:text-sage/80 transition-colors"
                >
                  Interests
                </Link>
                <span className="text-charcoal/30">•</span>
                <Link
                  href="/subcategories"
                  className="font-urbanist font-500 text-sage hover:text-sage/80 transition-colors"
                >
                  Subcategories
                </Link>
                <span className="text-charcoal/30">•</span>
                <Link
                  href="/register"
                  className="font-urbanist font-500 text-sage hover:text-sage/80 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </FadeInUp>

        </div>
      </div>
    </div>
  );
}
