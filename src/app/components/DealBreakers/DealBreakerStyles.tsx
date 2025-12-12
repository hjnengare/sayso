"use client";

const entranceStyles = `
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .enter-fade {
    opacity: 0;
    animation: fadeSlideIn 0.7s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
  }
  .enter-stagger {
    opacity: 0;
    animation: fadeSlideIn 0.6s ease-out forwards;
  }
  @keyframes microBounce {
    0%,100% { transform: scale(1); }
    50%     { transform: scale(1.03); }
  }
  .animate-micro-bounce { animation: microBounce 0.28s ease-out; }

  /* Prevent word breaking in titles on mobile */
  .title-no-break {
    word-break: keep-all;
    overflow-wrap: normal;
    white-space: normal;
  }

  @media (max-width: 768px) {
    .title-no-break {
      word-break: keep-all;
      overflow-wrap: normal;
      white-space: nowrap;
      max-width: 100%;
    }
    
    /* Prevent breaking within words - ensure the title doesn't break */
    .title-no-break h2 {
      white-space: nowrap;
      word-break: keep-all;
      overflow-wrap: normal;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
`;

export default function DealBreakerStyles() {
  return <style dangerouslySetInnerHTML={{ __html: entranceStyles }} />;
}
