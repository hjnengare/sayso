import OnboardingLayout from "../components/Onboarding/OnboardingLayout";
import { Loader } from "../components/Loader";

export default function SubcategoriesLoading() {
  return (
    <OnboardingLayout step={2} backHref="/interests">
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size="md" variant="wavy" color="sage" />
      </div>
    </OnboardingLayout>
  );
}
