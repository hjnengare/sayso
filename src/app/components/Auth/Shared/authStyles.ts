// Shared mobile-first CSS styles for auth pages
export const authStyles = `
  /* Mobile-first typography scale - Body text ≥ 16px */
  .text-body { font-size: 1rem; line-height: 1.5; }
  .text-body-lg { font-size: 1.125rem; line-height: 1.5; }
  .text-heading-sm { font-size: 1.25rem; line-height: 1.4; }
  .text-heading-md { font-size: 1.5rem; line-height: 1.3; }
  .text-heading-lg { font-size: 1.875rem; line-height: 1.2; }

  /* iOS inertia scrolling and prevent double scroll */
  .ios-inertia {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    min-height: 0;
  }

  /* Hide scrollbar */
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }

  /* Button press states - 44-48px targets */
  .btn-press:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }

  .btn-target {
    min-height: 44px;
    min-width: 44px;
    touch-action: manipulation;
  }

  /* Premium button styling */
  .btn-premium {
    position: relative;
    background: linear-gradient(135deg, #E07A5F 0%, #D1674A 100%);
    box-shadow:
      0 10px 40px rgba(224, 122, 95, 0.25),
      0 4px 12px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(10px);
  }

  .btn-premium:hover {
    transform: translateY(-2px);
    background: linear-gradient(135deg, #E88A6F 0%, #D9755A 100%);
    box-shadow:
      0 20px 60px rgba(224, 122, 95, 0.35),
      0 8px 24px rgba(0, 0, 0, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .btn-premium:active {
    transform: translateY(0);
    background: linear-gradient(135deg, #D1674A 0%, #C2553A 100%);
  }

  /* Input styling - 16px+ to prevent auto-zoom */
  .input-mobile {
    font-size: 1rem !important;
    min-height: 48px;
    touch-action: manipulation;
  }

  /* Premium card styling with gradient shadow */
  .card-premium {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(125, 155, 118, 0.1);
    box-shadow:
      0 8px 32px rgba(125, 155, 118, 0.12),
      0 2px 8px rgba(0, 0, 0, 0.04);
    backdrop-filter: blur(10px);
  }

  /* Text truncation support */
  .text-truncate {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Full-screen pattern - respects notches */
  .full-screen {
    min-height: 100dvh;
    min-height: 100vh;
  }

  /* Safe area padding */
  .safe-area-full {
    padding-left: max(1rem, env(safe-area-inset-left));
    padding-right: max(1rem, env(safe-area-inset-right));
    padding-top: max(1.5rem, env(safe-area-inset-top));
    padding-bottom: max(6rem, env(safe-area-inset-bottom));
  }

  /* Prevent layout jumps */
  .stable-layout {
    contain: layout style;
  }

  /* Fixed aspect ratios for images */
  .aspect-square { aspect-ratio: 1 / 1; }
  .aspect-video { aspect-ratio: 16 / 9; }
  .aspect-photo { aspect-ratio: 4 / 3; }

  /* Carousel patterns for mobile */
  @media (max-width: 768px) {
    .carousel-mobile {
      scroll-snap-type: x mandatory;
      overflow-x: auto;
      display: flex;
    }

    .carousel-item {
      scroll-snap-align: center;
      flex-shrink: 0;
    }
  }

  /* CSS Animations */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Animation classes */
  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out forwards;
  }

  .animate-slide-in-left {
    animation: slideInLeft 0.6s ease-out forwards;
  }

  .animate-scale-in {
    animation: scaleIn 0.8s ease-out forwards;
  }

  .animate-delay-200 {
    animation-delay: 0.2s;
    opacity: 0;
  }

  .animate-delay-400 {
    animation-delay: 0.4s;
    opacity: 0;
  }

  .animate-delay-700 {
    animation-delay: 0.7s;
    opacity: 0;
  }

  /* Premium floating orbs */
  @keyframes float1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -30px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
  }

  @keyframes float2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(-40px, 40px) scale(0.95); }
    66% { transform: translate(25px, -25px) scale(1.05); }
  }

  @keyframes float3 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(35px, 35px) scale(1.08); }
  }

  @keyframes float4 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(-30px, -30px) scale(0.92); }
  }

  @keyframes float5 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    25% { transform: translate(20px, -40px) scale(1.06); }
    75% { transform: translate(-25px, 30px) scale(0.94); }
  }

  .floating-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    pointer-events: none;
    z-index: 0;
    opacity: 0.4;
  }

  .floating-orb-1 {
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(157, 171, 155, 0.6) 0%, rgba(157, 171, 155, 0.2) 50%, transparent 100%);
    top: 10%;
    left: 5%;
    animation: float1 20s ease-in-out infinite;
  }

  .floating-orb-2 {
    width: 250px;
    height: 250px;
    background: radial-gradient(circle, rgba(125, 15, 42, 0.5) 0%, rgba(125, 15, 42, 0.2) 50%, transparent 100%);
    top: 60%;
    right: 8%;
    animation: float2 25s ease-in-out infinite;
  }

  .floating-orb-3 {
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(157, 171, 155, 0.45) 0%, rgba(157, 171, 155, 0.15) 50%, transparent 100%);
    bottom: 15%;
    left: 10%;
    animation: float3 18s ease-in-out infinite;
  }

  .floating-orb-4 {
    width: 180px;
    height: 180px;
    background: radial-gradient(circle, rgba(125, 15, 42, 0.4) 0%, rgba(125, 15, 42, 0.15) 50%, transparent 100%);
    top: 30%;
    right: 15%;
    animation: float4 22s ease-in-out infinite;
  }

  .floating-orb-5 {
    width: 220px;
    height: 220px;
    background: radial-gradient(circle, rgba(157, 171, 155, 0.5) 0%, rgba(157, 171, 155, 0.2) 50%, transparent 100%);
    bottom: 25%;
    right: 5%;
    animation: float5 24s ease-in-out infinite;
  }

  .floating-orb-6 {
    width: 160px;
    height: 160px;
    background: radial-gradient(circle, rgba(125, 15, 42, 0.35) 0%, rgba(125, 15, 42, 0.12) 50%, transparent 100%);
    top: 50%;
    left: 2%;
    animation: float1 19s ease-in-out infinite reverse;
  }

  /* Prevent word breaking in titles on mobile */
  .title-no-break {
    word-break: keep-all;
    overflow-wrap: normal;
    white-space: normal;
  }

  @media (max-width: 768px) {
    .floating-orb {
      filter: blur(40px);
      opacity: 0.3;
    }
    .floating-orb-1 { width: 200px; height: 200px; }
    .floating-orb-2 { width: 180px; height: 180px; }
    .floating-orb-3 { width: 150px; height: 150px; }
    .floating-orb-4 { width: 140px; height: 140px; }
    .floating-orb-5 { width: 160px; height: 160px; }
    .floating-orb-6 { width: 120px; height: 120px; }
    
    .title-no-break {
      word-break: keep-all;
      overflow-wrap: normal;
      white-space: nowrap;
      max-width: 100%;
    }
    
    .title-no-break h2,
    .title-no-break h1 {
      white-space: nowrap;
      word-break: keep-all;
      overflow-wrap: normal;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .floating-orb { animation: none !important; opacity: 0.2 !important; }
  }
`;
