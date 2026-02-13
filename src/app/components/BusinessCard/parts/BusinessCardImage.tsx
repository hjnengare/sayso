import React from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import { getCategoryPlaceholder } from "../../../utils/categoryToPngMapping";

// Tiny 4x3 SVG matching the card error-state bg (#E5E0E5) — instant visual fill while image loads
const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSIzIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjMiIGZpbGw9IiNlNWUwZTUiLz48L3N2Zz4=";

interface BusinessCardImageProps {
  displayImage: string;
  isImagePng?: boolean;
  displayAlt: string;
  usingFallback: boolean;
  imgError: boolean;
  onImageError: () => void;
  categoryKey: string;
  businessName: string;
  verified?: boolean;
  /** Set to true for above-fold images (first ~3 cards) to improve LCP */
  priority?: boolean;
  sharedLayoutId?: string;
}

const BusinessCardImage: React.FC<BusinessCardImageProps> = ({
  displayImage,
  displayAlt,
  usingFallback,
  imgError,
  onImageError,
  categoryKey,
  priority = false,
  sharedLayoutId,
}) => {
  return (
    <motion.div layoutId={sharedLayoutId} className="relative w-full h-full">
      {!imgError && displayImage ? (
        <div className="relative w-full h-full overflow-hidden">
          <Image
            src={usingFallback ? getCategoryPlaceholder(categoryKey) : displayImage}
            alt={displayAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 340px, 340px"
            className="object-cover card-img-zoom group-active:scale-[0.98] motion-reduce:transition-none"
            quality={priority ? 85 : 75}
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            onError={onImageError}
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            style={{ aspectRatio: '4/3' }}
          />
          <div
            className="absolute inset-0 pointer-events-none card-overlay-fade motion-reduce:transition-none"
            style={{ background: "hsla(0, 0%, 0%, 0.2)" }}
            aria-hidden="true"
          />
        </div>
      ) : (
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{ backgroundColor: "#E5E0E5" }}
        >
          <ImageIcon className="w-16 h-16 text-charcoal/20" aria-hidden="true" />
        </div>
      )}
    </motion.div>
  );
};

export default BusinessCardImage;
