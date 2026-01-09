import OnboardingLayout from "../components/Onboarding/OnboardingLayout";
import { Loader } from "../components/Loader";

export default function DealBreakersLoading() {
  return (
    <OnboardingLayout step={3} backHref="/subcategories">
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size="md" variant="wavy" color="sage" />
      </div>
    </OnboardingLayout>
  );
}
