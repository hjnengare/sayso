import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '../../lib/supabase/server';
import { generateSEOMetadata } from '../../lib/utils/seoMetadata';
import { generateItemListSchema, generateOrganizationSchema } from '../../lib/utils/schemaMarkup';
import CategoryPageClient from './CategoryPageClient';
import SchemaMarkup from '../../components/SEO/SchemaMarkup';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

// Category slug to display name mapping
const CATEGORY_MAP: Record<string, string> = {
  'food-drink': 'Food & Drink',
  'beauty-wellness': 'Beauty & Wellness',
  'professional-services': 'Professional Services',
  'outdoors-adventure': 'Outdoors & Adventure',
  'experiences-entertainment': 'Entertainment & Experiences',
  'arts-culture': 'Arts & Culture',
  'family-pets': 'Family & Pets',
  'shopping-lifestyle': 'Shopping & Lifestyle',
};

// Generate metadata for category page
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const categoryName = CATEGORY_MAP[slug] || slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return generateSEOMetadata({
    title: `${categoryName} - Local Businesses`,
    description: `Discover the best ${categoryName.toLowerCase()} businesses in your area. Browse reviews, photos, and ratings from real customers.`,
    keywords: [categoryName.toLowerCase(), 'local businesses', 'reviews', slug, 'near me'],
    url: `/category/${slug}`,
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const categoryName = CATEGORY_MAP[slug] || slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  // Fetch businesses in this category
  const supabase = await getServerSupabase();
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id, name, slug, description, image_url, uploaded_images, location, average_rating:business_stats(average_rating)')
    .eq('category', categoryName)
    .eq('status', 'active')
    .limit(50)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Category Page] Error fetching businesses:', error);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sayso-nine.vercel.app';
  
  // Generate ItemList schema for category page
  const itemListSchema = generateItemListSchema(
    `${categoryName} Businesses`,
    `Discover the best ${categoryName.toLowerCase()} businesses in your area.`,
    (businesses || []).map((business: any) => ({
      name: business.name,
      url: `${baseUrl}/business/${business.slug || business.id}`,
      image: (business.uploaded_images && business.uploaded_images.length > 0 ? business.uploaded_images[0] : null) || business.image_url,
      rating: business.average_rating?.[0]?.average_rating || 0,
    }))
  );

  const organizationSchema = generateOrganizationSchema();

  return (
    <>
      <SchemaMarkup schemas={[itemListSchema, organizationSchema]} />
      <CategoryPageClient 
        categoryName={categoryName}
        categorySlug={slug}
        businesses={businesses || []}
      />
    </>
  );
}

