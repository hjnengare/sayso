"use client";

import { motion } from "framer-motion";
import { Edit3, Camera } from "lucide-react";
import RatingSelector from "./RatingSelector";
import TagSelector from "./TagSelector";
import ReviewTextForm from "./ReviewTextForm";
import ReviewSubmitButton from "./ReviewSubmitButton";
import dynamic from "next/dynamic";

const ImageUpload = dynamic(() => import("./ImageUpload"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-32 rounded-[20px] border-2 border-dashed border-white/20 bg-white/5 animate-pulse flex items-center justify-center">
      <Camera className="w-8 h-8 text-white/20" />
    </div>
  ),
});

interface ReviewFormProps {
  businessName: string;
  businessRating: number;
  businessImages: string[];
  overallRating: number;
  selectedTags: string[];
  reviewText: string;
  reviewTitle: string;
  selectedImages: File[];
  isFormValid: boolean;
  availableTags: string[];
  onRatingChange: (rating: number) => void;
  onTagToggle: (tag: string) => void;
  onTitleChange: (title: string) => void;
  onTextChange: (text: string) => void;
  onImagesChange: (images: File[]) => void;
  onSubmit: () => void;
  existingImages?: string[];
  onExistingImagesChange?: (urls: string[]) => void;
  isSubmitting?: boolean;
}

export default function ReviewForm({
  businessName,
  overallRating,
  selectedTags,
  reviewText,
  reviewTitle,
  selectedImages,
  isFormValid,
  availableTags,
  onRatingChange,
  onTagToggle,
  onTitleChange,
  onTextChange,
  onImagesChange,
  onSubmit,
  existingImages = [],
  onExistingImagesChange,
  isSubmitting = false,
}: ReviewFormProps) {
  const hasImages = existingImages.length > 0 || selectedImages.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden"
    >
      {/* Form Header */}
      <div className="flex items-center gap-3 mb-6 px-1">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-coral/20 to-coral/10 flex items-center justify-center">
          <Edit3 className="w-5 h-5 text-coral" />
        </div>
        <div>
          <h2
            className="text-lg font-bold text-white"
            style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
          >
            Write a Review
          </h2>
          <p
            className="text-xs text-white/50"
            style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
          >
            Share your experience with {businessName}
          </p>
        </div>
      </div>

      {/* Form Content */}
      <div className="space-y-2">
        {/* Rating Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <RatingSelector overallRating={overallRating} onRatingChange={onRatingChange} />
        </motion.div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Tags Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          <TagSelector
            selectedTags={selectedTags}
            onTagToggle={onTagToggle}
            availableTags={availableTags}
          />
        </motion.div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Text Form Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ReviewTextForm
            reviewTitle={reviewTitle}
            reviewText={reviewText}
            onTitleChange={onTitleChange}
            onTextChange={onTextChange}
          />
        </motion.div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Image Upload Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="py-2"
        >
          <div className="flex items-center gap-2 mb-3 px-1">
            <Camera className="w-4 h-4 text-white/60" />
            <h3
              className="text-sm font-semibold text-white"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
            >
              Photos
              <span className="ml-1 text-xs font-normal text-white/40">(optional)</span>
            </h3>
            {hasImages && (
              <span
                className="ml-auto text-xs text-white/40"
                style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
              >
                {existingImages.length + selectedImages.length}/5
              </span>
            )}
          </div>
          <ImageUpload
            onImagesChange={onImagesChange}
            maxImages={5}
            disabled={false}
            existingImages={existingImages}
            onExistingImagesChange={onExistingImagesChange}
          />
        </motion.div>

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pt-4"
        >
          <ReviewSubmitButton
            isFormValid={isFormValid}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
