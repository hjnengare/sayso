"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import Image from "next/image";
import { ArrowDown, ChevronLeft, ChevronRight, X } from "@/app/lib/icons";

interface BusinessPhotoGridProps {
  businessName: string;
  photos?: string[];
}

export default function BusinessPhotoGrid({ businessName, photos = [] }: BusinessPhotoGridProps) {
  const normalizedPhotos = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];

    photos.forEach((photo) => {
      if (!photo || typeof photo !== "string") return;
      const trimmed = photo.trim();
      if (!trimmed || seen.has(trimmed)) return;
      seen.add(trimmed);
      result.push(trimmed);
    });

    return result;
  }, [photos]);

  const gridPhotos = normalizedPhotos.slice(0, 9);
  const hasPhotos = gridPhotos.length > 0;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const openModalAt = (index: number) => {
    if (normalizedPhotos.length === 0) return;
    setActiveIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const goPrev = () => {
    setActiveIndex((prev) => {
      if (normalizedPhotos.length === 0) return 0;
      return prev === 0 ? normalizedPhotos.length - 1 : prev - 1;
    });
  };

  const goNext = () => {
    setActiveIndex((prev) => {
      if (normalizedPhotos.length === 0) return 0;
      return prev === normalizedPhotos.length - 1 ? 0 : prev + 1;
    });
  };

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isModalOpen, normalizedPhotos.length]);

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4 sm:p-6"
    >
      <h3
        className="text-h3 font-semibold text-charcoal mb-3"
        style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
      >
        Photos
      </h3>

      {hasPhotos ? (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 rounded-[12px]">
            {gridPhotos.map((photo, index) => (
              <button
                key={`${photo}-${index}`}
                type="button"
                onClick={() => openModalAt(index)}
                className="relative aspect-square overflow-hidden rounded-[10px] bg-off-white/60 focus:outline-none focus:ring-2 focus:ring-navbar-bg/40"
                aria-label={`Open photo ${index + 1}`}
              >
                <Image
                  src={photo}
                  alt={`${businessName} photo ${index + 1}`}
                  fill
                  className="object-cover"
                  loading="lazy"
                  sizes="(max-width: 640px) 33vw, 220px"
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => openModalAt(0)}
            className="mt-4 w-full rounded-full bg-navbar-bg px-5 py-3 text-body-sm font-semibold text-white transition-colors hover:bg-navbar-bg/90"
            style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
          >
            View More
          </button>
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[12px] border border-white/35 bg-off-white/60 px-4 py-6 text-center">
            <p
              className="text-body-sm text-charcoal/70"
              style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
            >
              Photos from this business profile will appear here once gallery images are available.
            </p>
            <p
              className="mt-2 text-xs text-charcoal/60"
              style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
            >
              This section uses the business gallery images for consistency.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-charcoal/60 animate-pulse">
            <ArrowDown className="w-4 h-4" />
            <span
              className="text-xs font-medium"
              style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
            >
              Scroll down for similar businesses at the bottom
            </span>
          </div>

          <button
            type="button"
            disabled
            className="w-full rounded-full bg-navbar-bg/60 px-5 py-3 text-body-sm font-semibold text-white/80 cursor-not-allowed"
            style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
          >
            View More
          </button>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && normalizedPhotos.length > 0 && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-charcoal/95 backdrop-blur-sm"
            onClick={closeModal}
            role="dialog"
            aria-modal="true"
            aria-label="Business photo gallery"
          >
            <div className="relative h-full w-full" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                onClick={closeModal}
                className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
                aria-label="Close gallery"
              >
                <X className="w-5 h-5" />
              </button>

              {normalizedPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    className="absolute left-4 top-1/2 z-20 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="absolute right-4 top-1/2 z-20 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              <div className="relative h-full w-full p-4 sm:p-8">
                <div className="relative h-full w-full overflow-hidden rounded-[12px]">
                  <Image
                    src={normalizedPhotos[activeIndex]}
                    alt={`${businessName} photo ${activeIndex + 1}`}
                    fill
                    className="object-contain"
                    priority
                    sizes="100vw"
                  />
                </div>
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-charcoal/70 px-3 py-1.5">
                <span
                  className="text-xs text-white"
                  style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                >
                  {activeIndex + 1} / {normalizedPhotos.length}
                </span>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}
