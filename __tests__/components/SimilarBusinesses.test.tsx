/**
 * Unit tests for SimilarBusinesses component
 * 
 * Tests:
 * - Component renders with business data
 * - Similar businesses are fetched and displayed
 * - Filtering by category and location
 * - Fallback strategies when no results
 * - Loading states
 * - Empty states
 * - Error handling
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import SimilarBusinesses from '../../src/app/components/SimilarBusinesses/SimilarBusinesses';
import { renderWithProviders } from '../../__test-utils__/helpers/render';

// Mock useBusinesses hook
jest.mock('../../src/app/hooks/useBusinesses', () => ({
  useBusinesses: jest.fn(),
}));

// Mock useUserPreferences hook
jest.mock('../../src/app/hooks/useUserPreferences', () => ({
  useUserPreferences: jest.fn(() => ({
    interests: [],
    subcategories: [],
    dealbreakers: [],
    loading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

// Mock BusinessCard component
jest.mock('../../src/app/components/BusinessCard/BusinessCard', () => {
  return function MockBusinessCard({ business }: { business: any }) {
    return (
      <div data-testid={`business-card-${business.id}`}>
        <h3>{business.name}</h3>
        <p>{business.category}</p>
        <p>{business.location}</p>
      </div>
    );
  };
});

// Mock SimilarBusinessCard component
jest.mock('../../src/app/components/SimilarBusinesses/SimilarBusinessCard', () => {
  return function MockSimilarBusinessCard({ id, name, category, location }: any) {
    return (
      <div data-testid={`similar-business-card-${id}`}>
        <h3>{name}</h3>
        <p>{category}</p>
        <p>{location}</p>
      </div>
    );
  };
});

import { useBusinesses } from '../../src/app/hooks/useBusinesses';

describe('SimilarBusinesses Component', () => {
  const mockBusiness = {
    id: 'business-1',
    name: 'Test Restaurant',
    category: 'Restaurant',
    location: 'Cape Town',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component with heading', async () => {
      const mockBusinesses = [
        {
          id: 'business-2',
          name: 'Similar Restaurant',
          category: 'Restaurant',
          location: 'Cape Town',
        },
      ];

      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: mockBusinesses,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProviders(
        <SimilarBusinesses
          currentBusinessId="business-1"
          category="Restaurant"
          location="Cape Town"
        />,
        {
          authValue: {
            user: null,
            isAuthenticated: false,
            isEmailVerified: false,
          },
        }
      );

      await waitFor(() => {
        expect(screen.getByText('You Might Also Like')).toBeInTheDocument();
        expect(screen.getByText('Similar Restaurant')).toBeInTheDocument();
      });
    });

    it('should not render when currentBusinessId is missing', () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { container } = renderWithProviders(
        <SimilarBusinesses
          currentBusinessId=""
          category="Restaurant"
          location="Cape Town"
        />,
        {
          authValue: {
            user: null,
            isAuthenticated: false,
            isEmailVerified: false,
          },
        }
      );

      // Component should not render content when businessId is empty
      expect(screen.queryByText('You Might Also Like')).not.toBeInTheDocument();
    });
  });

  describe('Fetching Similar Businesses', () => {
    it('should fetch businesses with category and location filters', () => {
      const mockBusinesses = [
        {
          id: 'business-2',
          name: 'Similar Restaurant',
          category: 'Restaurant',
          location: 'Cape Town',
        },
        {
          id: 'business-3',
          name: 'Another Restaurant',
          category: 'Restaurant',
          location: 'Cape Town',
        },
      ];

      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: mockBusinesses,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProviders(
        <SimilarBusinesses
          currentBusinessId="business-1"
          category="Restaurant"
          location="Cape Town"
        />,
        {
          authValue: {
            user: null,
            isAuthenticated: false,
            isEmailVerified: false,
          },
        }
      );

      expect(useBusinesses).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Restaurant',
          location: 'Cape Town',
        })
      );
    });

    it('should exclude current business from results', async () => {
      const mockBusinesses = [
        {
          id: 'business-1', // Current business - should be filtered out
          name: 'Current Restaurant',
          category: 'Restaurant',
          location: 'Cape Town',
        },
        {
          id: 'business-2',
          name: 'Similar Restaurant',
          category: 'Restaurant',
          location: 'Cape Town',
        },
      ];

      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: mockBusinesses,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProviders(
        <SimilarBusinesses
          currentBusinessId="business-1"
          category="Restaurant"
          location="Cape Town"
        />,
        {
          authValue: {
            user: null,
            isAuthenticated: false,
            isEmailVerified: false,
          },
        }
      );

      await waitFor(() => {
        // Current business should not be displayed
        expect(screen.queryByText('Current Restaurant')).not.toBeInTheDocument();
        // Similar business should be displayed
        expect(screen.getByText('Similar Restaurant')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering Strategies', () => {
    it('should display businesses matching both category and location', async () => {
      const mockBusinesses = [
        {
          id: 'business-2',
          name: 'Matching Restaurant',
          category: 'Restaurant',
          location: 'Cape Town',
        },
      ];

      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: mockBusinesses,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProviders(
        <SimilarBusinesses
          currentBusinessId="business-1"
          category="Restaurant"
          location="Cape Town"
        />,
        {
          authValue: {
            user: null,
            isAuthenticated: false,
            isEmailVerified: false,
          },
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Matching Restaurant')).toBeInTheDocument();
        expect(screen.getByTestId('similar-business-card-business-2')).toBeInTheDocument();
      });
    });

    it('should handle businesses with only category match', async () => {
      const mockBusinesses = [
        {
          id: 'business-2',
          name: 'Category Match',
          category: 'Restaurant',
          location: 'Johannesburg', // Different location
        },
      ];

      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: mockBusinesses,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProviders(
        <SimilarBusinesses
          currentBusinessId="business-1"
          category="Restaurant"
          location="Cape Town"
        />,
        {
          authValue: {
            user: null,
            isAuthenticated: false,
            isEmailVerified: false,
          },
        }
      );

      await waitFor(() => {
        // Should still display if category matches (fallback strategy)
        expect(screen.getByText('Category Match')).toBeInTheDocument();
      });
    });

    it('should handle businesses with only location match', async () => {
      const mockBusinesses = [
        {
          id: 'business-2',
          name: 'Location Match',
          category: 'Cafe', // Different category
          location: 'Cape Town',
        },
      ];

      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: mockBusinesses,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProviders(
        <SimilarBusinesses
          currentBusinessId="business-1"
          category="Restaurant"
          location="Cape Town"
        />,
        {
          authValue: {
            user: null,
            isAuthenticated: false,
            isEmailVerified: false,
          },
        }
      );

      await waitFor(() => {
        // Should still display if location matches (fallback strategy)
        expect(screen.getByText('Location Match')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state while fetching', () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [],
        loading: true,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProviders(
        <SimilarBusinesses
          currentBusinessId="business-1"
          category="Restaurant"
          location="Cape Town"
        />,
        {
          authValue: {
            user: null,
            isAuthenticated: false,
            isEmailVerified: false,
          },
        }
      );

      // Component should show loading state with heading
      expect(screen.getByText('Similar Businesses')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should handle empty results gracefully', () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { container } = renderWithProviders(
        <SimilarBusinesses
          currentBusinessId="business-1"
          category="Restaurant"
          location="Cape Town"
        />,
        {
          authValue: {
            user: null,
            isAuthenticated: false,
            isEmailVerified: false,
          },
        }
      );

      // Component should not render when there are no results
      expect(screen.queryByText('You Might Also Like')).not.toBeInTheDocument();
      expect(screen.queryByTestId(/similar-business-card-/)).not.toBeInTheDocument();
    });

    it('should handle case when all results are the current business', () => {
      const mockBusinesses = [
        {
          id: 'business-1', // Only current business
          name: 'Current Restaurant',
          category: 'Restaurant',
          location: 'Cape Town',
        },
      ];

      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: mockBusinesses,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProviders(
        <SimilarBusinesses
          currentBusinessId="business-1"
          category="Restaurant"
          location="Cape Town"
        />,
        {
          authValue: {
            user: null,
            isAuthenticated: false,
            isEmailVerified: false,
          },
        }
      );

      // Current business should be filtered out, so no cards should render
      expect(screen.queryByTestId(/similar-business-card-/)).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [],
        loading: false,
        error: 'Failed to fetch businesses',
        refetch: jest.fn(),
      });

      renderWithProviders(
        <SimilarBusinesses
          currentBusinessId="business-1"
          category="Restaurant"
          location="Cape Town"
        />,
        {
          authValue: {
            user: null,
            isAuthenticated: false,
            isEmailVerified: false,
          },
        }
      );

      // Component should not render when there are errors and no businesses
      expect(screen.queryByText('You Might Also Like')).not.toBeInTheDocument();
      expect(screen.queryByTestId(/similar-business-card-/)).not.toBeInTheDocument();
    });
  });

  describe('Business Card Display', () => {
    it('should render business cards for similar businesses', async () => {
      const mockBusinesses = [
        {
          id: 'business-2',
          name: 'Similar Restaurant 1',
          category: 'Restaurant',
          location: 'Cape Town',
        },
        {
          id: 'business-3',
          name: 'Similar Restaurant 2',
          category: 'Restaurant',
          location: 'Cape Town',
        },
        {
          id: 'business-4',
          name: 'Similar Restaurant 3',
          category: 'Restaurant',
          location: 'Cape Town',
        },
      ];

      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: mockBusinesses,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProviders(
        <SimilarBusinesses
          currentBusinessId="business-1"
          category="Restaurant"
          location="Cape Town"
        />,
        {
          authValue: {
            user: null,
            isAuthenticated: false,
            isEmailVerified: false,
          },
        }
      );

      await waitFor(() => {
        expect(screen.getByText('Similar Restaurant 1')).toBeInTheDocument();
        expect(screen.getByText('Similar Restaurant 2')).toBeInTheDocument();
        expect(screen.getByText('Similar Restaurant 3')).toBeInTheDocument();
        expect(screen.getByTestId('similar-business-card-business-2')).toBeInTheDocument();
        expect(screen.getByTestId('similar-business-card-business-3')).toBeInTheDocument();
        expect(screen.getByTestId('similar-business-card-business-4')).toBeInTheDocument();
      });
    });

    it('should limit the number of displayed businesses', async () => {
      const mockBusinesses = Array.from({ length: 20 }, (_, i) => ({
        id: `business-${i + 2}`,
        name: `Restaurant ${i + 2}`,
        category: 'Restaurant',
        location: 'Cape Town',
      }));

      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: mockBusinesses,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProviders(
        <SimilarBusinesses
          currentBusinessId="business-1"
          category="Restaurant"
          location="Cape Town"
          limit={3}
        />,
        {
          authValue: {
            user: null,
            isAuthenticated: false,
            isEmailVerified: false,
          },
        }
      );

      await waitFor(() => {
        // Component should limit displayed businesses to the limit prop (3)
        const businessCards = screen.getAllByTestId(/similar-business-card-/);
        expect(businessCards.length).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('Props Handling', () => {
    it('should work with only category provided', () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProviders(
        <SimilarBusinesses
          currentBusinessId="business-1"
          category="Restaurant"
          location={undefined}
        />,
        {
          authValue: {
            user: null,
            isAuthenticated: false,
            isEmailVerified: false,
          },
        }
      );

      expect(useBusinesses).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Restaurant',
        })
      );
    });

    it('should work with only location provided', () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProviders(
        <SimilarBusinesses
          currentBusinessId="business-1"
          category={undefined}
          location="Cape Town"
        />,
        {
          authValue: {
            user: null,
            isAuthenticated: false,
            isEmailVerified: false,
          },
        }
      );

      expect(useBusinesses).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'Cape Town',
        })
      );
    });

    it('should handle missing category and location', () => {
      (useBusinesses as jest.Mock).mockReturnValue({
        businesses: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProviders(
        <SimilarBusinesses
          currentBusinessId="business-1"
          category={undefined}
          location={undefined}
        />,
        {
          authValue: {
            user: null,
            isAuthenticated: false,
            isEmailVerified: false,
          },
        }
      );

      // Component should not render when there are no results
      expect(screen.queryByText('You Might Also Like')).not.toBeInTheDocument();
    });
  });
});
