import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { generateSEOMetadata } from '../../lib/utils/seoMetadata';
import { getReviewerPageTitle } from '../../lib/utils/pageTitle';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  try {
    const supabase = getSupabase();

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url, reviews_count')
      .eq('user_id', id)
      .single();

    if (profile) {
      const name = profile.display_name || profile.username || 'Reviewer';
      const reviewCount = profile.reviews_count || 0;

      return generateSEOMetadata({
        title: getReviewerPageTitle(name),
        description: `${name} has written ${reviewCount} review${reviewCount !== 1 ? 's' : ''} on sayso. View their reviews and contributions to the community.`,
        keywords: [name, 'reviewer', 'reviews', 'sayso community'],
        image: profile.avatar_url || undefined,
        url: `/reviewer/${id}`,
        type: 'profile',
      });
    }
  } catch (error) {
    console.error('[Reviewer Metadata] Error fetching reviewer:', error);
  }

  return generateSEOMetadata({
    title: getReviewerPageTitle('Reviewer'),
    description: 'View this reviewer\'s reviews and contributions to the sayso community.',
    url: `/reviewer/${id}`,
    type: 'profile',
  });
}

export default function ReviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
