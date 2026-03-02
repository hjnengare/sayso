"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "@/app/lib/icons";

interface DiscoverCard {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
}

const discoverCards: DiscoverCard[] = [
  {
    id: 1,
    title: "Find a Store",
    subtitle: "Discover local businesses and services near you",
    imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop&crop=center",
    ctaText: "Our Store",
    ctaLink: "/search"
  },
  {
    id: 2,
    title: "From Our Blog",
    subtitle: "Latest insights and stories from the local community",
    imageUrl: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=300&fit=crop&crop=center",
    ctaText: "Our Store",
    ctaLink: "/blog"
  },
  {
    id: 3,
    title: "Our Story",
    subtitle: "Learn about our mission to connect communities",
    imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop&crop=center",
    ctaText: "Our Store",
    ctaLink: "/about"
  }
];

export default function MoreToDiscover() {
  const [visibleCards, setVisibleCards] = useState<number[]>([]);

  useEffect(() => {
    // Icons are now imported from Lucide React, no preloading needed

    // Staggered animation for cards
    const timer = setTimeout(() => {
      discoverCards.forEach((_, index) => {
        setTimeout(() => {
          setVisibleCards(prev => [...prev, index]);
        }, index * 150);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="py-16 bg-off-white ">
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="font-urbanist text-lg md:text-4xl font-700 text-charcoal mb-4">
            More to Discover
          </h2>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {discoverCards.map((card, index) => (
            <Link
              key={card.id}
              href={card.ctaLink}
              className={`block relative bg-off-white  rounded-lg overflow-hidden transition-all duration-500 hover:shadow-lg cursor-pointer ${
                visibleCards.includes(index)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
              style={{
                transitionDelay: `${index * 100}ms`
              }}
            >
              {/* Card Image */}
              <div className="relative h-48 overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${card.imageUrl})`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>

              {/* Card Content */}
              <div className="p-6 text-center">
                <h3 className="font-urbanist text-xl font-700 text-charcoal mb-3">
                  {card.title}
                </h3>

                <p className="text-charcoal/70 text-sm leading-relaxed mb-6">
                  {card.subtitle}
                </p>

                {/* CTA Text */}
                <div className="inline-flex items-center text-charcoal font-urbanist text-sm font-600">
                  {card.ctaText}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
