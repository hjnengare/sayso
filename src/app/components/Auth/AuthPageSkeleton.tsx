import { authStyles } from "./Shared/authStyles";

type AuthSkeletonVariant =
  | "login"
  | "register"
  | "business-login"
  | "business-register"
  | "forgot-password"
  | "reset-password"
  | "verify-email"
  | "auth-error";

interface AuthPageSkeletonProps {
  variant: AuthSkeletonVariant;
}

function Block({
  className,
  rounded = "rounded-full",
}: {
  className: string;
  rounded?: string;
}) {
  return <div aria-hidden="true" className={`animate-pulse bg-white/16 ${rounded} ${className}`} />;
}

function CardBlock({
  className,
  rounded = "rounded-[12px]",
}: {
  className: string;
  rounded?: string;
}) {
  return <div aria-hidden="true" className={`animate-pulse bg-charcoal/10 ${rounded} ${className}`} />;
}

function BackgroundBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute -top-16 left-[-3rem] h-52 w-52 rounded-full bg-sage/15 blur-3xl" />
      <div className="absolute top-1/4 right-[-4rem] h-64 w-64 rounded-full bg-coral/12 blur-3xl" />
      <div className="absolute bottom-[-5rem] left-1/4 h-72 w-72 rounded-full bg-navbar-bg/8 blur-3xl" />
      <div className="absolute bottom-24 right-10 h-40 w-40 rounded-full bg-sage/10 blur-3xl" />
    </div>
  );
}

function SkeletonShell({
  children,
  showRoleToggle = false,
}: {
  children: React.ReactNode;
  showRoleToggle?: boolean;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: authStyles }} />
      <div
        className="min-h-[100dvh] bg-off-white flex flex-col relative overflow-hidden safe-area-full"
        style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
      >
        <BackgroundBlobs />

        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
          <CardBlock className="h-10 w-10 rounded-xl bg-charcoal/12" />
        </div>

        <div className="relative text-center mb-4 pt-16 sm:pt-20 px-2">
          <div className="mx-auto mb-4 flex justify-center">
            <CardBlock className="h-11 w-56 rounded-2xl bg-charcoal/10 sm:w-72" />
          </div>
          <div className="space-y-3 mx-auto max-w-2xl">
            <CardBlock className="h-4 w-full max-w-[22rem] mx-auto rounded-full bg-charcoal/10" />
            <CardBlock className="h-4 w-4/5 max-w-[18rem] mx-auto rounded-full bg-charcoal/10" />
          </div>
        </div>

        {showRoleToggle && (
          <div className="relative flex justify-center px-4 mb-4">
            <div className="inline-flex rounded-full bg-white/70 shadow-sm p-1 gap-1">
              <CardBlock className="h-10 w-36 rounded-full bg-charcoal/12" />
              <CardBlock className="h-10 w-36 rounded-full bg-charcoal/8" />
            </div>
          </div>
        )}

        <div className="relative w-full max-w-[2000px] mx-auto flex-1 flex flex-col justify-center py-8 sm:py-12 px-0 lg:px-10 2xl:px-16">
          <div className="w-full sm:max-w-md lg:max-w-lg xl:max-w-xl sm:mx-auto relative z-10">
            <section data-section>{children}</section>
          </div>
        </div>
      </div>
    </>
  );
}

function AuthFormCard({
  showModeToggle = false,
  fieldCount,
  showSupportLink = false,
  showCheckbox = false,
  showProgress = false,
  showSocialButtons = false,
  showInlineLinks = false,
  footerWidth = "w-56",
}: {
  showModeToggle?: boolean;
  fieldCount: number;
  showSupportLink?: boolean;
  showCheckbox?: boolean;
  showProgress?: boolean;
  showSocialButtons?: boolean;
  showInlineLinks?: boolean;
  footerWidth?: string;
}) {
  return (
    <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden backdrop-blur-md shadow-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12">
      {showModeToggle && (
        <div className="flex items-center justify-center pb-6">
          <div className="inline-flex rounded-full bg-white/15 p-1 gap-1">
            <Block className="h-10 w-24" />
            <Block className="h-10 w-24 bg-white/10" />
          </div>
        </div>
      )}

      <div className="space-y-4 relative z-10">
        <Block className="h-14 w-full rounded-[12px] bg-white/12" rounded="rounded-[12px]" />

        {Array.from({ length: fieldCount }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Block className="h-4 w-24 bg-white/12" />
            <Block className="h-12 w-full rounded-2xl" rounded="rounded-2xl" />
            {index === 0 && fieldCount > 2 && <Block className="h-3 w-32 bg-white/10" rounded="rounded-md" />}
          </div>
        ))}

        {showSupportLink && <div className="flex justify-end"><Block className="h-4 w-28 bg-white/14" /></div>}

        {showCheckbox && (
          <div className="pt-2 flex items-start gap-3">
            <Block className="h-4 w-4 mt-1 rounded-md bg-white/18" rounded="rounded-md" />
            <div className="flex-1 space-y-2">
              <Block className="h-4 w-full bg-white/10" />
              <Block className="h-4 w-5/6 bg-white/10" />
            </div>
          </div>
        )}

        <div className="pt-4 flex flex-col items-center gap-3">
          <Block className="h-14 w-full bg-white/20" />

          {showInlineLinks && (
            <div className="space-y-2 text-center w-full">
              <Block className="h-4 w-48 mx-auto bg-white/10" />
              <Block className="h-4 w-52 mx-auto bg-white/10" />
            </div>
          )}
        </div>

        {showProgress && (
          <div className="space-y-3 pt-2">
            <Block className="h-3 w-32 bg-white/12" rounded="rounded-md" />
            <div className="grid grid-cols-2 gap-2">
              <Block className="h-9 w-full rounded-xl bg-white/12" rounded="rounded-xl" />
              <Block className="h-9 w-full rounded-xl bg-white/12" rounded="rounded-xl" />
              <Block className="h-9 w-full rounded-xl bg-white/8" rounded="rounded-xl" />
              <Block className="h-9 w-full rounded-xl bg-white/8" rounded="rounded-xl" />
            </div>
          </div>
        )}

        {showSocialButtons && (
          <div className="space-y-3 pt-2">
            <Block className="h-12 w-full rounded-2xl bg-white/14" rounded="rounded-2xl" />
            <Block className="h-12 w-full rounded-2xl bg-white/10" rounded="rounded-2xl" />
          </div>
        )}
      </div>

      <div className="text-center mt-6 pt-6 border-t border-white/20">
        <Block className={`h-4 ${footerWidth} mx-auto bg-white/12`} />
      </div>
    </div>
  );
}

function SimpleAuthCard({
  lineCount,
  fieldCount,
  footerWidth,
}: {
  lineCount: number;
  fieldCount: number;
  footerWidth?: string;
}) {
  return (
    <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden backdrop-blur-md shadow-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12">
      <div className="space-y-4 relative z-10">
        <div className="space-y-3 text-center mb-4">
          {Array.from({ length: lineCount }).map((_, index) => (
            <Block
              key={index}
              className={`h-4 ${index === lineCount - 1 ? "w-3/4" : "w-full"} mx-auto bg-white/12`}
            />
          ))}
        </div>

        {Array.from({ length: fieldCount }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Block className="h-4 w-24 bg-white/12" />
            <Block className="h-12 w-full rounded-2xl" rounded="rounded-2xl" />
          </div>
        ))}

        <div className="pt-2">
          <Block className="h-14 w-full bg-white/20" />
        </div>
      </div>

      {footerWidth && (
        <div className="text-center mt-6 pt-6 border-t border-white/20">
          <Block className={`h-4 ${footerWidth} mx-auto bg-white/12`} />
        </div>
      )}
    </div>
  );
}

function VerifyEmailCard() {
  return (
    <div className="bg-card-bg rounded-lg p-5 sm:p-7 md:p-9 mb-4 relative overflow-hidden shadow-md">
      <div className="text-center mb-6">
        <CardBlock className="h-20 w-20 mx-auto mb-4 rounded-full bg-charcoal/10" />
        <CardBlock className="h-14 w-full rounded-full bg-navbar-bg/75" />
      </div>

      <div className="space-y-3 mb-6">
        <CardBlock className="h-4 w-full rounded-full" />
        <CardBlock className="h-4 w-5/6 mx-auto rounded-full" />
        <div className="bg-gradient-to-r from-sage/5 to-coral/5 rounded-lg p-6 border border-sage/10 space-y-3">
          <CardBlock className="h-5 w-40 rounded-full bg-charcoal/10" />
          <CardBlock className="h-3 w-full rounded-full" />
          <CardBlock className="h-3 w-11/12 rounded-full" />
          <CardBlock className="h-3 w-4/5 rounded-full" />
          <CardBlock className="h-3 w-10/12 rounded-full" />
        </div>
      </div>

      <div className="space-y-3 mb-5">
        <CardBlock className="h-14 w-full rounded-full bg-coral/20" />
        <CardBlock className="h-12 w-full rounded-xl" />
      </div>

      <CardBlock className="h-3 w-4/5 mx-auto rounded-full" />
      <div className="mt-4">
        <CardBlock className="h-3 w-32 mx-auto rounded-full" />
      </div>
    </div>
  );
}

function StatusCard() {
  return (
    <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden backdrop-blur-md shadow-md px-6 py-8 sm:px-8 sm:py-10">
      <div className="text-center space-y-5">
        <CardBlock className="h-16 w-16 mx-auto rounded-full bg-charcoal/10" />
        <div className="space-y-3">
          <CardBlock className="h-6 w-48 mx-auto rounded-full" />
          <CardBlock className="h-4 w-full max-w-sm mx-auto rounded-full" />
          <CardBlock className="h-4 w-4/5 max-w-xs mx-auto rounded-full" />
        </div>
        <div className="pt-2">
          <CardBlock className="h-12 w-full rounded-full bg-coral/15" />
        </div>
      </div>
    </div>
  );
}

export default function AuthPageSkeleton({ variant }: AuthPageSkeletonProps) {
  switch (variant) {
    case "login":
      return (
        <SkeletonShell showRoleToggle>
          <AuthFormCard
            showModeToggle
            fieldCount={2}
            showSupportLink
            showSocialButtons
            footerWidth="w-52"
          />
        </SkeletonShell>
      );
    case "register":
      return (
        <SkeletonShell showRoleToggle>
          <AuthFormCard
            showModeToggle
            fieldCount={3}
            showCheckbox
            showProgress
            showSocialButtons
            footerWidth="w-56"
          />
        </SkeletonShell>
      );
    case "business-login":
      return (
        <SkeletonShell>
          <AuthFormCard
            fieldCount={2}
            showSupportLink
            showInlineLinks
            footerWidth="w-64"
          />
        </SkeletonShell>
      );
    case "business-register":
      return (
        <SkeletonShell>
          <AuthFormCard
            fieldCount={3}
            showCheckbox
            showProgress
            showInlineLinks
            footerWidth="w-60"
          />
        </SkeletonShell>
      );
    case "forgot-password":
      return (
        <SkeletonShell>
          <SimpleAuthCard lineCount={2} fieldCount={1} footerWidth="w-40" />
        </SkeletonShell>
      );
    case "reset-password":
      return (
        <SkeletonShell>
          <SimpleAuthCard lineCount={1} fieldCount={2} />
        </SkeletonShell>
      );
    case "verify-email":
      return (
        <SkeletonShell>
          <VerifyEmailCard />
        </SkeletonShell>
      );
    case "auth-error":
      return (
        <SkeletonShell>
          <StatusCard />
        </SkeletonShell>
      );
    default:
      return null;
  }
}
