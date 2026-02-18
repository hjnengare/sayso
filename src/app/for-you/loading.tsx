import BusinessGridSkeleton from "../components/Explore/BusinessGridSkeleton";

export default function ForYouLoading() {
  return (
    <div className="min-h-dvh relative">
      <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)] pointer-events-none" />

      <main className="relative">
        <div className="relative mx-auto w-full max-w-[2000px] px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 pb-8">
          <div className="h-6 w-40 bg-charcoal/10 rounded-md animate-pulse mb-4" />
          <div className="h-10 w-72 sm:w-96 bg-charcoal/10 rounded-lg animate-pulse mb-3" />
          <div className="h-4 w-full max-w-2xl bg-charcoal/10 rounded animate-pulse mb-6" />
          <div className="h-12 w-full bg-charcoal/10 rounded-full animate-pulse mb-6" />
          <BusinessGridSkeleton />
        </div>
      </main>
    </div>
  );
}
