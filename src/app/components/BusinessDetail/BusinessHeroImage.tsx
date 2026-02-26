// src/components/BusinessDetail/BusinessHeroImage.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { m } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import GoldStar from "../Icons/GoldStar";
import { getSubcategoryPlaceholder } from "../../utils/subcategoryPlaceholders";
import { isPlaceholderImage } from "../../utils/subcategoryPlaceholders";

interface BusinessHeroImageProps {
  image: string;
  alt: string;
  rating: number;
  verified?: boolean;
  images?: string[]; // Array of all images for carousel
  uploaded_images?: string[]; // Uploaded images array
  /** Canonical subcategory slug for placeholder when no photos (e.g. sub_interest_id) */
  subcategorySlug?: string | null;
  sharedLayoutId?: string;
}

export default function BusinessHeroImage({
  image,
  alt,
  rating,
  verified = false,
  images = [],
  uploaded_images = [],
  subcategorySlug,
  sharedLayoutId,
}: BusinessHeroImageProps) {
  // Combine all available images (exclude placeholders so we show real photos only)
  const allImages = useMemo(() => {
    const imageSet = new Set<string>();

    // Priority 1: uploaded_images array
    if (uploaded_images && uploaded_images.length > 0) {
      uploaded_images.forEach(img => {
        if (img && img.trim() && !isPlaceholderImage(img)) imageSet.add(img);
      });
    }

    // Priority 2: images array
    if (images && images.length > 0) {
      images.forEach(img => {
        if (img && img.trim() && !isPlaceholderImage(img)) imageSet.add(img);
      });
    }

    // Priority 3: single image prop
    if (image && image.trim() && !isPlaceholderImage(image)) {
      imageSet.add(image);
    }

    return Array.from(imageSet);
  }, [image, images, uploaded_images]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const hasMultipleImages = allImages.length > 1;
  const hasImage = allImages.length > 0;
  const slideWidthPercent = hasImage ? 100 / allImages.length : 100;
  const translatePercent = currentImageIndex * slideWidthPercent;
  const placeholderSrc = getSubcategoryPlaceholder(subcategorySlug ?? undefined);

  useEffect(() => {
    if (allImages.length === 0) {
      setCurrentImageIndex(0);
      return;
    }
    if (currentImageIndex > allImages.length - 1) {
      setCurrentImageIndex(0);
    }
  }, [allImages.length, currentImageIndex]);

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === 0 ? allImages.length - 1 : prev - 1
    );
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === allImages.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <m.div
      layoutId={sharedLayoutId}
      className="relative w-full h-[50vh] sm:h-auto sm:aspect-[16/9] lg:aspect-[21/9] rounded-none overflow-hidden border-none"
    >
      {hasImage ? (
        <>
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="flex h-full"
              style={{
                width: `${allImages.length * 100}%`,
                transform: `translate3d(-${translatePercent}%, 0, 0)`,
                transition: "transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                willChange: "transform",
              }}
            >
              {allImages.map((img, index) => (
                <div
                  key={`${img}-${index}`}
                  className="relative h-full flex-shrink-0"
                  style={{ width: `${slideWidthPercent}%` }}
                >
                  <Image
                    src={img}
                    alt={alt}
                    fill
                    className="object-cover"
                    priority={index === 0}
                    quality={80}
                    sizes="100vw"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
        </>
      ) : (
        <div className="absolute inset-0 bg-card-bg overflow-hidden">
          <Image
            src={placeholderSrc}
            alt={alt}
            fill
            className="object-cover"
            priority
            quality={70}
            sizes="100vw"
          />
        </div>
      )}

      {/* Verified Badge */}
      {verified && (
        <div className="absolute top-6 left-6 z-20">
          <span className="px-4 py-2 rounded-full text-body-sm font-600 backdrop-blur-xl border bg-card-bg/90 text-white border-sage/50" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
            Verified
          </span>
        </div>
      )}

      {/* Rating Badge - matching BusinessCard style */}
      <div className="absolute top-6 right-6 z-20 inline-flex items-center gap-1 rounded-full bg-off-white/95 backdrop-blur-xl px-3 py-1.5 text-charcoal border-none">
        <GoldStar size={14} className="w-3.5 h-3.5" />
        <span className="text-body-sm font-semibold text-charcoal" style={{
          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          fontWeight: 600
        }}>
          {Number(rating).toFixed(1)}
        </span>
      </div>

      {/* Carousel Controls - Only show if multiple images */}
      {hasMultipleImages && (
        <>
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-off-white/95 backdrop-blur-xl flex items-center justify-center shadow-lg hover:bg-white transition-all duration-200 hover:scale-110 border-none"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 text-charcoal" strokeWidth={2.5} />
          </button>

          {/* Next Button */}
          <button
            onClick={handleNext}
            className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-off-white/95 backdrop-blur-xl flex items-center justify-center shadow-lg hover:bg-white transition-all duration-200 hover:scale-110 border-none"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 text-charcoal" strokeWidth={2.5} />
          </button>

          {/* Image Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            {allImages.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(index);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentImageIndex
                    ? 'w-8 bg-white shadow-md'
                    : 'w-2 bg-white/60 hover:bg-white/80'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>

          {/* Image Counter */}
          <div className="absolute bottom-6 right-6 z-30 px-3 py-1.5 rounded-full bg-charcoal/80 backdrop-blur-xl">
            <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              {currentImageIndex + 1} / {allImages.length}
            </span>
          </div>
        </>
      )}

    </m.div>
  );
}
