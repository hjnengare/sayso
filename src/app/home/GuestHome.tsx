import Image from 'next/image';
import Link from 'next/link';

export default function GuestHome() {
  return (
    <div className="min-h-[100svh] md:min-h-[100dvh] bg-off-white flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl flex flex-col items-center text-center gap-6">
        <Image
          src="/logos/logo.png"
          alt="Sayso logo"
          width={120}
          height={72}
          className="object-contain w-auto h-[88px] sm:h-[96px]"
          priority
        />

        <div className="space-y-2">
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal tracking-tight"
            style={{
              fontFamily:
                'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            }}
          >
            Explore as a guest
          </h1>
          <p
            className="text-body text-charcoal/70 leading-[1.55]"
            style={{
              fontFamily:
                'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            }}
          >
            Browse what&apos;s trending, then create an account to unlock personalised
            recommendations.
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <Link
            href="/trending"
            className="w-full rounded-full py-4 px-6 text-body font-semibold text-white text-center bg-gradient-to-r from-navbar-bg to-navbar-bg/90 hover:opacity-95 transition-all duration-200 shadow-md"
          >
            View Trending
          </Link>
          <Link
            href="/register"
            className="w-full rounded-full py-4 px-6 text-body font-semibold text-white text-center bg-gradient-to-r from-coral to-coral/85 hover:opacity-95 transition-all duration-200 shadow-md"
          >
            Create Account
          </Link>
          <Link
            href="/login"
            className="w-full rounded-full py-4 px-6 text-body font-semibold text-charcoal text-center border border-charcoal/15 bg-white hover:bg-off-white transition-all duration-200 shadow-sm"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

