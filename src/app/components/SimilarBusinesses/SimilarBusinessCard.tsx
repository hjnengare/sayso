"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, MapPin } from "react-feather";
import { getCategoryPng, isPngIcon } from "../../utils/categoryToPngMapping";
import VerifiedBadge from "../VerifiedBadge/VerifiedBadge";
import OptimizedImage from "../Performance/OptimizedImage";

interface SimilarBusinessCardProps {
  id: string;
  name: string;
  image?: string;
  image_url?: string;
  uploaded_image?: string;
  category: string;
  location: string;
  address?: string;
  rating?: number;
  totalRating?: number;
  reviews?: number;
  total_reviews?: number;
  verified?: boolean;
  priceRange?: string;
  price_range?: string;
}

export default function SimilarBusinessCard({
  id,
  name,
  image,
  image_url,
  uploaded_image,
  category,
  location,
  address,
  rating,
  totalRating,
  reviews,
  total_reviews,
  verified,
  priceRange,
  price_range,
}: SimilarBusinessCardProps) {
  // Determine display image
  const displayImage = uploaded_image || image_url || image || getCategoryPng(category);
  const isImagePng = isPngIcon(displayImage) || displayImage.includes('/png/');
  const displayRating = rating || totalRating || 0;
  const displayReviews = reviews || total_reviews || 0;

  return (
    <Link
      href={`/business/${id}`}
      className="group block bg-gradient-to-br from-card-bg via-card-bg/98 to-card-bg/95 rounded-2xl overflow-visible border border-white/60 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] relative transition-all duration-500 ease-out hover:z-20 hover:shadow-[0_16px_40px_rgba(0,0,0,0.15),0_8px_20px_rgba(0,0,0,0.08)] hover:border-white/80 h-full w-full flex flex-col min-h-[320px]"
    >
      {/* Premium glass depth overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent pointer-events-none z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Premium gradient accents */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0" />
      
      {/* Image Section - Premium */}
      <div className="relative h-48 sm:h-52 flex-shrink-0 overflow-hidden bg-gradient-to-br from-off-white/95 to-off-white/85 rounded-t-2xl group-hover:rounded-t-2xl transition-all duration-500">
        {isImagePng ? (
          <div className="w-full h-full flex items-center justify-center">
            <OptimizedImage
              src={displayImage}
              alt={name}
              width={100}
              height={100}
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
              priority={false}
              quality={90}
            />
          </div>
        ) : (
          <div className="relative w-full h-full">
            <Image
              src={displayImage}
              alt={name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={false}
              quality={85}
            />
          </div>
        )}
        
        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
        
        {/* Verified badge - Premium */}
        {verified && (
          <div className="absolute top-3 left-3 z-10 scale-90 origin-top-left group-hover:scale-100 transition-transform duration-300">
            <VerifiedBadge />
          </div>
        )}
        
        {/* Rating badge - Premium */}
        {displayRating > 0 && (
          <div className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-off-white/98 via-off-white/95 to-off-white/90 backdrop-blur-xl px-3 py-1.5 text-charcoal border border-white/60 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
            <Star className="w-3.5 h-3.5 text-coral fill-coral" aria-hidden strokeWidth={2.5} />
            <span className="text-[11px] font-bold text-charcoal" style={{ 
              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', 
              fontWeight: 700
            }}>
              {Number(displayRating).toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Content Section - Premium Enhanced */}
      <div className="p-4 sm:p-5 space-y-3 relative z-10 bg-gradient-to-b from-transparent via-off-white/20 to-off-white/40 flex-1 flex flex-col justify-between rounded-b-2xl">
        {/* Business Name, Location, and Address - Stacked */}
        <div className="space-y-2">
          {/* Business Name */}
          <h3
            className="text-sm sm:text-base font-bold text-charcoal line-clamp-2 group-hover:text-navbar-bg transition-colors duration-300 leading-tight"
            style={{
              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              fontWeight: 700,
            }}
            title={name}
          >
            {name}
          </h3>

          {/* Location - Stacked */}
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-coral flex-shrink-0 mt-0.5" strokeWidth={2.5} />
            <span className="text-xs text-charcoal/70 font-medium leading-relaxed" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {location}
            </span>
          </div>

          {/* Address - Stacked (if available) */}
          {address && (
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-charcoal/40 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
              <span className="text-xs text-charcoal/60 font-medium leading-relaxed line-clamp-2" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                {address}
              </span>
            </div>
          )}
        </div>

        {/* Reviews Count and Rating Badge */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/40">
          {/* Reviews Count */}
          <div className="flex items-center">
            {displayReviews > 0 ? (
              <span className="text-xs sm:text-sm text-charcoal/70 font-semibold group-hover:text-charcoal transition-colors duration-300" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                {displayReviews} {displayReviews === 1 ? 'review' : 'reviews'}
              </span>
            ) : (
              <span className="text-xs sm:text-sm text-charcoal/50 italic" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                No reviews yet
              </span>
            )}
          </div>

          {/* Total Reviews Badge - Only show if has rating */}
          {displayRating > 0 && (
            <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-off-white/98 via-off-white/95 to-off-white/90 backdrop-blur-xl px-2.5 py-1 text-charcoal border border-white/60 shadow-md">
              <Star className="w-3 h-3 text-coral fill-coral" aria-hidden strokeWidth={2.5} />
              <span className="text-[10px] font-bold text-charcoal" style={{ 
                fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', 
                fontWeight: 700
              }}>
                {Number(displayRating).toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* See Business CTA Button */}
        <button
          className="w-full bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white font-semibold py-2.5 px-4 rounded-full transition-all duration-300 hover:bg-navbar-bg border border-white/30 text-sm sm:text-base hover:scale-105 active:scale-95"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          onClick={(e) => {
            e.preventDefault();
            window.location.href = `/business/${id}`;
          }}
        >
          See Business
        </button>
      </div>
    </Link>
  );
}

