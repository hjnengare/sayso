/**
 * Utility functions for normalizing business_images relation data
 * to the legacy uploaded_images array format for backward compatibility
 */

export type BusinessImage = {
  id: string;
  url: string;
  type: 'cover' | 'logo' | 'gallery' | null;
  sort_order: number | null;
  is_primary: boolean | null;
};

export interface NormalizedBusinessImages {
  uploaded_images: string[];
  cover_image: string | null;
  logo_url: string | null;
}

/**
 * Normalizes business_images relation array to uploaded_images format
 * This maintains backward compatibility with existing UI code
 * 
 * @param business - Business object with business_images relation array
 * @returns Normalized object with uploaded_images array and convenience fields
 */
export function normalizeBusinessImages(business: any): NormalizedBusinessImages {
  const imgs: BusinessImage[] = business.business_images ?? [];
  
  // Sort by sort_order (lower numbers first), then by is_primary
  const sorted = imgs
    .slice()
    .sort((a, b) => {
      // Primary images first
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      // Then by sort_order
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
  
  // Extract URLs in sorted order
  const uploaded_images = sorted.map((i) => i.url).filter(Boolean);
  
  // Find cover image (type === 'cover' or is_primary)
  const cover =
    imgs.find((i) => i.type === 'cover')?.url ??
    imgs.find((i) => i.is_primary)?.url ??
    uploaded_images[0] ??
    null;
  
  // Find logo image (type === 'logo')
  const logo = imgs.find((i) => i.type === 'logo')?.url ?? null;
  
  return {
    uploaded_images,
    cover_image: cover,
    logo_url: logo,
  };
}

