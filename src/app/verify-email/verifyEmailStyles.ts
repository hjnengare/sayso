export const verifyEmailStyles = `
  /* Mobile-first typography scale - Body text = 16px */
  .text-body { font-size: 1rem; line-height: 1.5; }
  .text-body-lg { font-size: 1.125rem; line-height: 1.5; }
  .text-heading-sm { font-size: 1.25rem; line-height: 1.4; }
  .text-heading-md { font-size: 1.5rem; line-height: 1.3; }
  .text-heading-lg { font-size: 1.875rem; line-height: 1.2; }

  .ios-inertia {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    min-height: 0;
  }

  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }

  .btn-press:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }

  .btn-target {
    min-height: 44px;
    min-width: 44px;
    touch-action: manipulation;
  }

  .btn-premium {
    position: relative;
    background: linear-gradient(135deg, #7D9B76 0%, #6B8A64 100%);
    box-shadow:
      0 10px 40px rgba(125, 155, 118, 0.25),
      0 4px 12px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(10px);
  }

  .btn-premium:hover {
    transform: translateY(-2px);
    box-shadow:
      0 20px 60px rgba(125, 155, 118, 0.35),
      0 8px 24px rgba(0, 0, 0, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .btn-premium:active {
    transform: translateY(0);
  }

  .input-mobile {
    font-size: 1rem !important;
    min-height: 48px;
    touch-action: manipulation;
  }

  .card-premium {
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(125, 155, 118, 0.1);
    box-shadow:
      0 8px 32px rgba(125, 155, 118, 0.12),
      0 2px 8px rgba(0, 0, 0, 0.04);
    backdrop-filter: blur(10px);
  }

  .text-truncate {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .full-screen {
    min-height: 100dvh;
    min-height: 100vh;
  }

  .safe-area-full {
    padding-left: max(1rem, env(safe-area-inset-left));
    padding-right: max(1rem, env(safe-area-inset-right));
    padding-top: max(1.5rem, env(safe-area-inset-top));
    padding-bottom: max(6rem, env(safe-area-inset-bottom));
  }

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
  .animate-slide-in-left { animation: slideInLeft 0.6s ease-out forwards; }
  .animate-scale-in { animation: scaleIn 0.8s ease-out forwards; }

  .animate-delay-200 { animation-delay: 0.2s; }
  .animate-delay-400 { animation-delay: 0.4s; }
  .animate-delay-700 { animation-delay: 0.7s; }

  @media (prefers-reduced-motion: reduce) {
    .animate-fade-in-up,
    .animate-slide-in-left,
    .animate-scale-in {
      animation: none;
      opacity: 1;
    }

    .animate-delay-200,
    .animate-delay-400,
    .animate-delay-700 {
      animation-delay: 0s;
      opacity: 1;
    }
  }
`;
