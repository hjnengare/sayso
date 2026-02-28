'use client';

import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';

export function buildInitials(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'U';

  const segments = trimmed.split(/\s+/).filter(Boolean);
  if (segments.length === 1) {
    return segments[0].slice(0, 2).toUpperCase();
  }

  return `${segments[0][0] || ''}${segments[1][0] || ''}`.toUpperCase();
}

interface MessageBubbleAvatarProps {
  name: string;
  avatarUrl?: string | null;
}

export function MessageBubbleAvatar({ name, avatarUrl }: MessageBubbleAvatarProps) {
  const normalizedAvatarUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
  const [hasImageError, setHasImageError] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
    setHasImageError(false);
    setIsImageLoaded(false);
  }, [normalizedAvatarUrl]);

  const shouldRenderImage = normalizedAvatarUrl.length > 0 && !hasImageError;
  const initials = useMemo(() => buildInitials(name), [name]);

  return (
    <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-charcoal/15 bg-charcoal/10 sm:h-9 sm:w-9">
      {shouldRenderImage ? (
        <>
          {!isImageLoaded && (
            <div className="absolute inset-0 animate-pulse bg-charcoal/10" aria-hidden />
          )}
          <Image
            src={normalizedAvatarUrl}
            alt={`${name} avatar`}
            fill
            sizes="(max-width: 640px) 32px, 36px"
            className={`object-cover transition-opacity duration-150 ${
              isImageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            unoptimized={normalizedAvatarUrl.includes('supabase.co')}
            onLoad={() => setIsImageLoaded(true)}
            onError={() => {
              setHasImageError(true);
              setIsImageLoaded(false);
            }}
          />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-charcoal/70 sm:text-xs">
          {initials}
        </div>
      )}
    </div>
  );
}
