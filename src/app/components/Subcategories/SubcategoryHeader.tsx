"use client";

import { m } from "framer-motion";

const headerVariants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.8, 0.25, 1] as [number, number, number, number],
      delay: 0.05,
    },
  },
};

export default function SubcategoryHeader() {
  const bodyStyle = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontWeight: 400,
  } as React.CSSProperties;

  return (
    <m.div
      className="text-center mb-6 pt-4 sm:pt-6 title-no-break"
      variants={headerVariants}
      initial="hidden"
      animate="visible"
    >
      <h2
        className="font-urbanist text-2xl md:text-3xl lg:text-4xl font-700 mb-2 tracking-tight px-6 sm:px-4 md:px-2 text-charcoal"
        style={{
          fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          fontWeight: 700,
        }}
      >
        Let&apos;s Get More Specific!
      </h2>
      <p
        className="text-sm md:text-base text-charcoal/70 leading-relaxed px-4 max-w-lg mx-auto break-words whitespace-normal"
        style={bodyStyle}
      >
        Select specific areas within your interests
      </p>
    </m.div>
  );
}
