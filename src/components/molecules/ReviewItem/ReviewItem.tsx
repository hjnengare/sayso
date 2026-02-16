'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Briefcase, Edit, Trash2, ThumbsUp } from 'lucide-react';
import { Text } from '@/components/atoms/Text';
import { Badge } from '@/components/atoms/Badge';

export interface ReviewItemProps {
  businessName: string;
  businessImageUrl?: string | null;
  rating: number;
  reviewText?: string | null;
  reviewTitle?: string | null;
  helpfulCount?: number;
  tags?: string[];
  isFeatured?: boolean;
  createdAt: string;
  businessId?: string;
  onViewClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

const BusinessThumb: React.FC<{
  name: string;
  imageUrl?: string | null;
  size?: number;
}> = ({ name, imageUrl, size = 40 }) => {
  const [err, setErr] = useState(false);

  if (!imageUrl || err) {
    return (
      <div
        className="relative rounded-full bg-gradient-to-br from-sage/15 to-coral/10 border-border-charcoal/10 flex items-center justify-center ring-2 ring-off-white shadow-sm"
        style={{ width: size, height: size }}
        aria-label={`${name} placeholder image`}
      >
        <Briefcase size={size * 0.5} className="text-white" />
      </div>
    );
  }

  return (
    <div
      className="relative rounded-full overflow-hidden ring-2 ring-off-white shadow-sm"
      style={{ width: size, height: size }}
    >
      <div className="w-full h-full rounded-full p-0.5 bg-off-white">
        <Image
          src={imageUrl}
          alt={`${name} thumbnail`}
          width={size}
          height={size}
          className="w-full h-full rounded-full object-cover"
          onError={() => setErr(true)}
        />
      </div>
    </div>
  );
};

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => {
        const active = i < rating;
        return (
          <Star
            key={i}
            size={16}
            className={`${active ? 'text-coral fill-coral' : 'text-gray-300'}`}
            aria-hidden
          />
        );
      })}
    </div>
  );
};

export const ReviewItem: React.FC<ReviewItemProps> = ({
  businessName,
  businessImageUrl,
  rating,
  reviewText,
  reviewTitle,
  helpfulCount,
  tags = [],
  isFeatured = false,
  createdAt,
  businessId,
  onViewClick,
  onEdit,
  onDelete,
  className = '',
}) => {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const truncateText = (text: string, maxLength: number = 120) =>
    text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

  // If we have a businessId, generate the business link
  const businessLink = businessId ? `/business/${businessId}` : '#';
  const BusinessNameComponent = businessId ? Link : 'span';

  return (
    <div
      className={`flex flex-col gap-3 py-4 border-b border-sage/10 last:border-b-0 ${className}`}
    >
      {/* Header: Business info, rating, date */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <BusinessThumb name={businessName} imageUrl={businessImageUrl} size={48} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <BusinessNameComponent 
                href={businessLink}
                className={`text-lg font-semibold text-charcoal ${businessId ? 'hover:text-coral transition-colors cursor-pointer' : ''} truncate`}
                style={{ fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {businessName}
              </BusinessNameComponent>
              {isFeatured && (
                <Badge variant="coral" size="sm">
                  Featured
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                <StarRating rating={rating} />
                <span className="text-sm font-medium text-charcoal ml-1">({rating})</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1.5">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="flex items-center justify-center rounded-full bg-navbar-bg hover:bg-navbar-bg/90 transition-colors min-h-[32px] min-w-[32px] p-1.5"
                  aria-label="Edit review"
                  title="Edit review"
                >
                  <Edit size={14} className="text-white" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="flex items-center justify-center rounded-full bg-navbar-bg hover:bg-navbar-bg/90 transition-colors min-h-[32px] min-w-[32px] p-1.5"
                  aria-label="Delete review"
                  title="Delete review"
                >
                  <Trash2 size={14} className="text-white" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Review content */}
      {(reviewTitle || reviewText) && (
        <div className="pl-[60px]"> {/* Align with content below business thumb */}
          {reviewTitle && (
            <h4 className="text-base font-semibold text-charcoal mb-1" style={{ fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              {reviewTitle}
            </h4>
          )}
          {reviewText && (
            <p className="text-sm text-charcoal/80 leading-relaxed mb-2" style={{ fontFamily: '"Urbanist", -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
              {truncateText(reviewText)}
            </p>
          )}
          
          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 4).map((tag, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-card-bg/15 text-sage text-xs rounded-full border border-sage/20"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 4 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  +{tags.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* View full review CTA */}
      {onViewClick && (
        <div className="pl-[60px]">
          <button
            onClick={onViewClick}
            className="text-coral hover:text-coral/80 transition-colors duration-200 text-sm font-medium"
          >
            Read full review →
          </button>
        </div>
      )}
    </div>
  );
};
