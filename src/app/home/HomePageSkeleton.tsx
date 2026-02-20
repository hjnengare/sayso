import BusinessRowSkeleton from "../components/BusinessRow/BusinessRowSkeleton";
import HeroSkeleton from "../components/Hero/HeroSkeleton";

/**
 * Skeleton for PPR Suspense boundary - shown while HomeClient loads.
 */
export default function HomePageSkeleton() {
  return (
    <div className="min-h-dvh flex flex-col bg-off-white">
      <div className="overflow-hidden">
        <HeroSkeleton />
      </div>
      <main className="relative min-h-dvh pt-8 sm:pt-10 md:pt-12">
        <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
        <div className="relative mx-auto w-full max-w-[2000px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 sm:gap-10 md:gap-12 pt-0">
            <BusinessRowSkeleton title="For You" />
            <BusinessRowSkeleton title="Trending Now" cards={4} />
          </div>
        </div>
      </main>
    </div>
  );
}
