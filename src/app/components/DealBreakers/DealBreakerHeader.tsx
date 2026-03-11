"use client";

export default function DealBreakerHeader() {
  const bodyStyle = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontWeight: 400,
  } as React.CSSProperties;

  return (
    <div className="text-center mb-6 pt-4 sm:pt-6 enter-fade title-no-break">
      <h2
        className="font-urbanist text-2xl md:text-3xl lg:text-4xl font-700 mb-2 tracking-tight px-6 sm:px-4 md:px-2 text-charcoal"
        style={{
          fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          fontWeight: 700,
        }}
      >
        What are your dealbreakers?
      </h2>
      <p
        className="text-sm md:text-base text-charcoal/70 leading-relaxed px-4 max-w-lg mx-auto break-words whitespace-normal"
        style={bodyStyle}
      >
        Select what matters most to you in a business
      </p>
    </div>
  );
}
