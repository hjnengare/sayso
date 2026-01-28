"use client";

import { Suspense } from "react";
import OnboardingLayout from "../components/Onboarding/OnboardingLayout";
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";
import SubcategoryStyles from "../components/Subcategories/SubcategoryStyles";
import SubcategoryHeader from "../components/Subcategories/SubcategoryHeader";
import SubcategorySelection from "../components/Subcategories/SubcategorySelection";
import SubcategoryGrid from "../components/Subcategories/SubcategoryGrid";
import SubcategoryActions from "../components/Subcategories/SubcategoryActions";
import { Loader } from "../components/Loader";
import { useSubcategoriesPage } from "../hooks/useSubcategoriesPage";
import { OnboardingErrorBoundary } from "../components/Onboarding/OnboardingErrorBoundary";

const MAX_SELECTIONS = 10;

function SubcategoriesContent() {
  const {
    subcategories,
    groupedSubcategories,
    selectedSubcategories,
    isNavigating,
    shakingIds,
    canProceed,
    handleToggle,
    handleNext,
    error,
  } = useSubcategoriesPage();

  return (
    <OnboardingErrorBoundary>
      <SubcategoryStyles />
      <OnboardingLayout step={2} backHref="/interests">
        <SubcategoryHeader />

        <div className="animate-fade-in-up">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-[12px] p-4 text-center mb-4 animate-fade-in-up delay-100">
              <p className="text-sm font-semibold text-red-600">
                {error.message || 'An error occurred'}
              </p>
            </div>
          )}

          <SubcategorySelection selectedCount={selectedSubcategories.length} maxSelections={MAX_SELECTIONS}>
            <SubcategoryGrid
              groupedSubcategories={groupedSubcategories}
              selectedSubcategories={selectedSubcategories.map(id => {
                const subcategory = subcategories.find(s => s.id === id);
                return { id, interest_id: subcategory?.interest_id || '' };
              })}
              maxSelections={MAX_SELECTIONS}
              onToggle={handleToggle}
              subcategories={subcategories}
              loading={false}
              shakingIds={shakingIds}
            />
          </SubcategorySelection>

          <SubcategoryActions
            canProceed={canProceed}
            isNavigating={isNavigating}
            isLoading={false}
            selectedCount={selectedSubcategories.length}
            onContinue={handleNext}
          />
        </div>
      </OnboardingLayout>
    </OnboardingErrorBoundary>
  );
}

// Optimize: Allow static generation where possible
export const dynamic = 'auto';

export default function SubcategoriesPage() {
  return (
    <ProtectedRoute requiresAuth={true}>
      <Suspense fallback={
        <OnboardingLayout step={2} backHref="/interests">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader size="md" variant="wavy" color="sage" />
          </div>
        </OnboardingLayout>
      }>
        <SubcategoriesContent />
      </Suspense>
    </ProtectedRoute>
  );
}
