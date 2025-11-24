'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, Image as ImageIcon, ChevronUp, Heart, X } from 'react-feather';
import type { ReviewWithUser } from '../../lib/types/database';
import { useAuth } from '../../contexts/AuthContext';
import { useReviewSubmission } from '../../hooks/useReviews';

interface ReviewCardProps {
  review: ReviewWithUser;
  onUpdate?: () => void;
  showBusinessInfo?: boolean;
}

export default function ReviewCard({
  review,
  onUpdate,
  showBusinessInfo = false
}: ReviewCardProps) {
  const { user } = useAuth();
  const { likeReview, deleteReview } = useReviewSubmission();
  const [showAllImages, setShowAllImages] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isLiked, setIsLiked] = useState(false); // In real app, this would come from backend
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count);

  const handleLike = async () => {
    const result = await likeReview(review.id);
    if (result !== null) {
      setIsLiked(result);
      setHelpfulCount(prev => result ? prev + 1 : prev - 1);
    }
  };

  const handleDelete = async () => {
    const confirmed = confirm('Are you sure you want to delete this review?');
    if (confirmed) {
      const success = await deleteReview(review.id);
      if (success && onUpdate) {
        onUpdate();
      }
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  const displayedImages = showAllImages ? review.images : review.images?.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.01, x: 5 }}
      className="bg-gradient-to-br from-off-white via-off-white to-off-white/95 backdrop-blur-sm rounded-lg p-6 border border-white/60 ring-1 ring-white/30 transition-all duration-300 group hover:border-white/80 hover:-translate-y-1"
    >
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ duration: 0.3 }}
          className="flex-shrink-0"
        >
          {review.user.avatar_url ? (
            <div className="relative">
              <div className="w-12 h-12 rounded-full p-0.5 bg-off-white ring-2 ring-white/40">
                <Image
                  src={review.user.avatar_url}
                  alt={review.user.name || 'User'}
                  width={48}
                  height={48}
                  className="w-full h-full rounded-full object-cover group-hover:ring-2 group-hover:ring-sage/40 transition-all duration-300"
                />
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-sage/20 to-sage/10 rounded-full flex items-center justify-center ring-2 ring-white/40 transition-shadow duration-300">
              <span className="font-urbanist text-lg font-700 text-sage">
                {review.user.name?.[0] || 'U'}
              </span>
            </div>
          )}
        </motion.div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 space-y-2 md:space-y-0">
            <div className="flex items-center space-x-3">
              <span className="font-urbanist text-lg font-600 text-charcoal group-hover:text-sage transition-colors duration-300">
                {review.user.name || 'Anonymous User'}
              </span>
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill={i < review.rating ? "currentColor" : "none"}
                      stroke={i < review.rating ? "none" : "currentColor"}
                      viewBox="0 0 24 24"
                      style={{
                        color: i < review.rating ? "#f59e0b" : "#9ca3af",
                      }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={i < review.rating ? 0 : 2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="font-urbanist text-sm font-600 text-charcoal/60">
                {formatDate(review.created_at)}
              </span>
              {user?.id === review.user_id && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleDelete}
                  className="text-red-500 hover:text-red-600 transition-colors duration-200"
                >
                  <Trash2 size={16} />
                </motion.button>
              )}
            </div>
          </div>

          {/* Review Title */}
          {review.title && (
            <h4 className="font-urbanist text-xl font-600 text-charcoal mb-2 group-hover:text-sage transition-colors duration-300">
              {review.title}
            </h4>
          )}

          {/* Business Info (if showing) */}
          {showBusinessInfo && 'business' in review && (
            <div className="mb-3 p-2 bg-sage/10 rounded-lg">
              <span className="font-urbanist text-sm font-500 text-sage">
                Review for: {(review as ReviewWithUser & { business: { name: string } }).business?.name}
              </span>
            </div>
          )}

          {/* Review Text */}
          <p className="font-urbanist text-base font-600 text-charcoal/90 leading-relaxed mb-4">
            {review.content}
          </p>

          {/* Tags */}
          {review.tags && review.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {review.tags.map((tag, index) => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  whileHover={{ scale: 1.05 }}
                  className="inline-flex items-center px-3 py-1 bg-sage/10 text-sage text-sm font-500 rounded-full border border-sage/20 hover:bg-sage/20 transition-colors duration-300"
                >
                  <span className="mr-1">@</span>
                  {tag}
                </motion.span>
              ))}
            </div>
          )}

          {/* Images */}
          {review.images && review.images.length > 0 && (
            <div className="mb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                {displayedImages?.map((image, index) => (
                  <motion.div
                    key={image.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    whileHover={{ scale: 1.05 }}
                    className="aspect-square rounded-lg overflow-hidden cursor-pointer group/image"
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <Image
                      src={image.image_url}
                      alt={image.alt_text || `Review image ${index + 1}`}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/image:scale-110"
                    />
                  </motion.div>
                ))}
              </div>

              {!showAllImages && review.images.length > 3 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAllImages(true)}
                  className="text-sage hover:text-sage/80 font-urbanist text-sm font-500 flex items-center space-x-1"
                >
                  <ImageIcon size={16} />
                  <span>Show {review.images.length - 3} more images</span>
                </motion.button>
              )}

              {showAllImages && review.images.length > 3 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAllImages(false)}
                  className="text-charcoal/60 hover:text-charcoal font-urbanist text-sm font-500 flex items-center space-x-1"
                >
                  <ChevronUp size={16} />
                  <span>Show less</span>
                </motion.button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-sage/10">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLike}
              className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-300 ${
                isLiked
                  ? 'bg-sage/10 text-sage'
                  : 'text-charcoal/60 hover:bg-sage/10 hover:text-sage'
              }`}
              disabled={!user}
            >
              <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
              <span className="font-urbanist text-sm font-500">
                Helpful ({helpfulCount})
              </span>
            </motion.button>

            {!user && (
              <span className="font-urbanist text-sm sm:text-xs text-charcoal/40">
                Login to like reviews
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedImageIndex !== null && review.images && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setSelectedImageIndex(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={review.images[selectedImageIndex].image_url}
                alt={review.images[selectedImageIndex].alt_text || 'Review image'}
                width={800}
                height={600}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedImageIndex(null)}
                className="absolute -top-4 -right-4 w-8 h-8 bg-off-white/95 backdrop-blur-xl text-black rounded-full flex items-center justify-center border border-white/40"
              >
                <X size={20} />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

