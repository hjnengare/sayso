"use client";

import Link from "next/link";
import Image from "next/image";
import { IoArrowForward } from "react-icons/io5";
import { useEffect, useState, memo } from "react";

interface DealCategory {
  title: string;
  description: string;
  price: string;
  image1: string;
  image2: string;
  alt1: string;
  alt2: string;
  rating: string;
  reviews: number;
  color1: string;
  color2: string;
}

const DEAL_CATEGORIES: DealCategory[] = [
  {
    title: "Premium Dental Care Package",
    description: "Get a complete dental checkup with professional cleaning at our community's highest-rated dental clinic. Limited-time exclusive offer for verified members.",
    price: "$89.00",
    image1: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&h=800&fit=crop&auto=format",
    image2: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=600&h=800&fit=crop&auto=format",
    alt1: "Modern dental clinic",
    alt2: "Professional dental care",
    rating: "4.9/5",
    reviews: 243,
    color1: "from-blue-100 to-blue-50",
    color2: "from-pink-100 to-pink-50",
  },
  {
    title: "Luxury Hotel Weekend Getaway",
    description: "Experience premium hospitality at our top-rated boutique hotel. Includes breakfast, spa access, and complimentary room upgrade. Perfect weekend escape awaits.",
    price: "$199.00",
    image1: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=800&fit=crop&auto=format",
    image2: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=800&fit=crop&auto=format",
    alt1: "Luxury hotel lobby",
    alt2: "Premium hotel room",
    rating: "4.8/5",
    reviews: 387,
    color1: "from-purple-100 to-purple-50",
    color2: "from-amber-100 to-amber-50",
  },
  {
    title: "Gourmet Dining Experience",
    description: "Savor an exclusive 5-course tasting menu at our award-winning restaurant. Chef's special selection with wine pairing included. Unforgettable culinary journey.",
    price: "$125.00",
    image1: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=800&fit=crop&auto=format",
    image2: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=800&fit=crop&auto=format",
    alt1: "Fine dining restaurant",
    alt2: "Gourmet cuisine",
    rating: "4.9/5",
    reviews: 512,
    color1: "from-emerald-100 to-emerald-50",
    color2: "from-rose-100 to-rose-50",
  },
  {
    title: "Full-Service Spa Retreat",
    description: "Rejuvenate with our premium spa package including massage, facial, and wellness consultation. Escape the stress and pamper yourself at the city's best spa.",
    price: "$149.00",
    image1: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&h=800&fit=crop&auto=format",
    image2: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=800&fit=crop&auto=format",
    alt1: "Luxury spa interior",
    alt2: "Spa treatment room",
    rating: "5.0/5",
    reviews: 298,
    color1: "from-cyan-100 to-cyan-50",
    color2: "from-pink-100 to-pink-50",
  },
];

function FeaturedDeal() {
  const [currentCategory, setCurrentCategory] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 2,
    hours: 14,
    minutes: 30,
    seconds: 45,
  });

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Rotate categories every 8 seconds with fade effect
  useEffect(() => {
    const categoryTimer = setInterval(() => {
      setIsTransitioning(true);

      // Wait for fade out, then change category
      setTimeout(() => {
        setCurrentCategory((prev) => (prev + 1) % DEAL_CATEGORIES.length);
        setIsTransitioning(false);
      }, 800); // Half of transition duration for crossfade
    }, 8000);

    return () => clearInterval(categoryTimer);
  }, []);

  const deal = DEAL_CATEGORIES[currentCategory];

  return (
    <section
      className="py-6 sm:py-8 bg-card-bg  relative overflow-hidden"
      aria-label="featured deal"
      data-section
    >
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-sage/30 to-transparent rounded-full blur-lg" />
        <div className="absolute bottom-1/3 left-1/4 w-48 h-48 bg-gradient-to-br from-coral/20 to-transparent rounded-full blur-lg" />
      </div>

      <div className="container mx-auto max-w-[1300px] px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Column - Images */}
          <div className="grid grid-cols-2 gap-3">
            {/* Top Image with static background */}
            <div className={`relative h-64 sm:h-80 bg-gradient-to-br ${deal.color1} rounded-6 overflow-hidden p-4`}>
              <div className={`relative w-full h-full transition-all duration-[1500ms] ease-in-out ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                <Image
                  key={deal.image1}
                  src={deal.image1}
                  alt={deal.alt1}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover rounded-6"
                  loading="lazy"
                  quality={75}
                />
              </div>
            </div>

            {/* Bottom Image with static background */}
            <div className={`relative h-64 sm:h-80 bg-gradient-to-br ${deal.color2} rounded-6 overflow-hidden p-4 mt-8`}>
              <div className={`relative w-full h-full transition-all duration-[1500ms] ease-in-out delay-150 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                <Image
                  key={deal.image2}
                  src={deal.image2}
                  alt={deal.alt2}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover rounded-6"
                  loading="lazy"
                  quality={75}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Badge */}
            <div className="flex items-center gap-3">
              <span className="font-urbanist text-sm font-600 text-primary/80 uppercase tracking-wide">
                Special Offer
              </span>
              <span className="inline-flex items-center px-3 py-1 bg-card-bg text-white font-urbanist font-700 text-sm rounded-full">
                -20%
              </span>
            </div>

            {/* Heading */}
            <h2 className={`font-urbanist text-4xl sm:text-5xl lg:text-6xl font-800 text-primary leading-tight transition-all duration-[1200ms] ease-in-out ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
              {deal.title}
            </h2>

            {/* Description */}
            <p className={`font-urbanist text-base sm:text-lg text-primary/80 leading-relaxed max-w-lg transition-all duration-[1200ms] ease-in-out delay-100 ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
              {deal.description}
            </p>

            {/* Countdown Timer */}
            <div className="space-y-3">
              <p className="font-urbanist text-sm font-600 text-primary/70 uppercase tracking-wide">
                Offer ends in
              </p>
              <div className="flex gap-3 sm:gap-3">
                {[
                  { value: timeLeft.days, label: "Days" },
                  { value: timeLeft.hours, label: "Hours" },
                  { value: timeLeft.minutes, label: "Mins" },
                  { value: timeLeft.seconds, label: "Secs" },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center bg-card-bg   shadow-2 rounded-6 px-4 py-3 min-w-[70px]"
                  >
                    <span className="font-urbanist text-lg sm:text-lg font-800 text-primary">
                      {String(item.value).padStart(2, "0")}
                    </span>
                    <span className="font-urbanist text-sm sm:text-xs text-primary/70 uppercase tracking-wide mt-1">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <Link
              href="/featured-deal"
              className={`group inline-flex items-center gap-3 bg-charcoal text-white font-urbanist font-700 text-base px-8 py-4 rounded-6 transition-all duration-[1200ms] ease-in-out delay-200 hover:bg-card-bg hover:shadow-1 ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
            >
              Book Now - Only {deal.price}
              <IoArrowForward className="text-lg transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            {/* Additional info */}
            <p className={`font-urbanist text-sm text-primary/60 transition-all duration-[1200ms] ease-in-out delay-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              ⭐ {deal.rating} rating • {deal.reviews} verified reviews
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(FeaturedDeal);
