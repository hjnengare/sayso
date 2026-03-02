'use client';

import { useState } from 'react';
import Image from 'next/image';
import { m, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, ChevronUp, X } from "@/app/lib/icons";

interface ReviewImage {
  id: string;
  image_url: string;
  alt_text?: string | null;
}

interface ReviewGalleryProps {
  images: ReviewImage[];
  isDesktop: boolean;
}

export function ReviewGallery({ images, isDesktop }: ReviewGalleryProps) {
  const [showAllImages, setShowAllImages] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const displayedImages = showAllImages ? images : images.slice(0, 3);

  return (
    <div className="mb-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
        {displayedImages.map((image, index) => (
          <m.div
            key={image.id}
            whileHover={isDesktop ? undefined : { scale: 1.05 }}
            className="aspect-square rounded-lg overflow-hidden cursor-pointer group/image"
            onClick={() => setSelectedImageIndex(index)}
          >
            <Image
              src={image.image_url}
              alt={image.alt_text || `Review image ${index + 1}`}
              width={200}
              height={200}
              className={`w-full h-full object-cover ${
                isDesktop ? '' : 'transition-transform duration-300 group-hover/image:scale-110'
              }`}
            />
          </m.div>
        ))}
      </div>

      {!showAllImages && images.length > 3 && (
        <m.button
          whileHover={isDesktop ? undefined : { scale: 1.05 }}
          whileTap={isDesktop ? undefined : { scale: 0.95 }}
          onClick={() => setShowAllImages(true)}
          className={`text-sage font-urbanist text-sm font-500 flex items-center space-x-1 ${
            isDesktop ? '' : 'hover:text-sage/80'
          }`}
        >
          <ImageIcon size={16} />
          <span>Show {images.length - 3} more images</span>
        </m.button>
      )}

      {showAllImages && images.length > 3 && (
        <m.button
          whileHover={isDesktop ? undefined : { scale: 1.05 }}
          whileTap={isDesktop ? undefined : { scale: 0.95 }}
          onClick={() => setShowAllImages(false)}
          className={`text-charcoal/60 font-urbanist text-sm font-500 flex items-center space-x-1 ${
            isDesktop ? '' : 'hover:text-charcoal'
          }`}
        >
          <ChevronUp size={16} />
          <span>Show less</span>
        </m.button>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImageIndex !== null && (
          <m.div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setSelectedImageIndex(null)}
          >
            <m.div
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={images[selectedImageIndex].image_url}
                alt={images[selectedImageIndex].alt_text || 'Review image'}
                width={800}
                height={600}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              <m.button
                whileHover={isDesktop ? undefined : { scale: 1.1 }}
                whileTap={isDesktop ? undefined : { scale: 0.9 }}
                onClick={() => setSelectedImageIndex(null)}
                className="absolute -top-4 -right-4 w-8 h-8 bg-off-white/95 backdrop-blur-xl text-black rounded-full flex items-center justify-center border-none"
              >
                <X size={20} />
              </m.button>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
