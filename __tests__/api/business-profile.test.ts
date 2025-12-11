/**
 * Backend API tests for business profile functionality
 * 
 * Tests:
 * - GET /api/businesses/[id] - Fetch business by ID
 * - GET /api/businesses/[id] - Fetch business by slug
 * - GET /api/businesses/[id] - Business with stats and reviews
 * - GET /api/businesses/[id] - Business not found
 * - GET /api/businesses/[id] - Review data transformation
 * - GET /api/businesses/[id] - Image handling
 * - PUT /api/businesses/[id] - Update business (owner only)
 * - PUT /api/businesses/[id] - Authorization checks
 * - PUT /api/businesses/[id] - Field validation
 * - Error handling
 */

import { GET, PUT } from '../../src/app/api/businesses/[id]/route';
import { createTestRequest } from '../../__test-utils__/helpers/create-test-request';
import { getServerSupabase } from '../../src/app/lib/supabase/server';

// Mock Supabase
jest.mock('../../src/app/lib/supabase/server', () => ({
  getServerSupabase: jest.fn(),
}));

// Mock optimized queries
jest.mock('../../src/app/lib/utils/optimizedQueries', () => ({
  fetchBusinessOptimized: jest.fn(),
}));

// Mock username generation
jest.mock('../../src/app/lib/utils/generateUsernameServer', () => ({
  getDisplayUsername: jest.fn((username, displayName, email, userId) => {
    return displayName || username || `User ${userId?.slice(0, 8)}`;
  }),
}));

import { fetchBusinessOptimized } from '../../src/app/lib/utils/optimizedQueries';

describe('GET /api/businesses/[id] - Fetch Business Profile', () => {
  let mockSupabase: any;
  let mockFrom: jest.Mock;
  let mockAuth: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFrom = jest.fn();
    mockAuth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    };

    mockSupabase = {
      from: mockFrom,
      auth: mockAuth,
    };

    (getServerSupabase as jest.Mock).mockResolvedValue(mockSupabase);
    (fetchBusinessOptimized as jest.Mock).mockRejectedValue(new Error('Fallback to standard query'));
  });

  describe('Input Validation', () => {
    it('should require business ID', async () => {
      const req = createTestRequest('/api/businesses/');
      const params = Promise.resolve({ id: '' });

      const response = await GET(req, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Business ID is required');
    });
  });

  describe('Fetching by ID', () => {
    it('should fetch business by ID with stats and reviews', async () => {
      const mockBusiness = {
        id: 'business-1',
        name: 'Test Business',
        description: 'A test business',
        category: 'Restaurant',
        location: 'Cape Town',
        image_url: 'https://example.com/image.jpg',
        uploaded_image: null,
        verified: true,
        price_range: '$$',
        business_stats: [
          {
            total_reviews: 10,
            average_rating: 4.5,
            percentiles: {
              trustworthiness: 90,
              punctuality: 85,
              friendliness: 88,
            },
          },
        ],
      };

      const mockReviews = [
        {
          id: 'review-1',
          user_id: 'user-1',
          rating: 5,
          content: 'Great place!',
          title: 'Excellent',
          tags: ['friendly', 'fast'],
          created_at: '2024-01-01T00:00:00Z',
          helpful_count: 5,
        },
      ];

      const mockProfiles = [
        {
          user_id: 'user-1',
          display_name: 'John Doe',
          username: 'johndoe',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      ];

      const mockReviewImages = [
        {
          review_id: 'review-1',
          image_url: 'https://example.com/review-image.jpg',
        },
      ];

      // Mock slug lookup (not found, so use ID)
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      })
      // Mock business query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBusiness,
          error: null,
        }),
      })
      // Mock reviews query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockReviews,
          error: null,
        }),
      })
      // Mock review images query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockReviewImages,
          error: null,
        }),
      })
      // Mock profiles query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: mockProfiles,
          error: null,
        }),
      });

      const req = createTestRequest('/api/businesses/business-1');
      const params = Promise.resolve({ id: 'business-1' });

      const response = await GET(req, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('business-1');
      expect(data.name).toBe('Test Business');
      expect(data.stats).toBeDefined();
      expect(data.stats.total_reviews).toBe(10);
      expect(data.stats.average_rating).toBe(4.5);
      expect(data.reviews).toHaveLength(1);
      expect(data.reviews[0].author).toBe('John Doe');
      expect(data.reviews[0].rating).toBe(5);
      expect(data.reviews[0].reviewImages).toContain('https://example.com/review-image.jpg');
      expect(data.trust).toBe(90);
      expect(data.punctuality).toBe(85);
      expect(data.friendliness).toBe(88);
    });

    it('should fetch business by slug', async () => {
      const mockSlugData = { id: 'business-1' };
      const mockBusiness = {
        id: 'business-1',
        name: 'Test Business',
        slug: 'test-business',
        category: 'Restaurant',
        business_stats: [],
      };

      // Mock slug lookup (found)
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockSlugData,
          error: null,
        }),
      })
      // Mock business query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBusiness,
          error: null,
        }),
      })
      // Mock reviews query (empty)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const req = createTestRequest('/api/businesses/test-business');
      const params = Promise.resolve({ id: 'test-business' });

      const response = await GET(req, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('business-1');
      expect(data.slug).toBe('test-business');
    });

    it('should return 404 when business not found', async () => {
      // Mock slug lookup (not found)
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      })
      // Mock business query (not found) - the handler checks for PGRST116 code
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      })
      // Mock reviews query (won't be called but need to prevent undefined)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const req = createTestRequest('/api/businesses/nonexistent');
      const params = Promise.resolve({ id: 'nonexistent' });

      const response = await GET(req, { params });
      const data = await response.json();

      // The handler checks for PGRST116 code and returns 404
      expect(response.status).toBe(404);
      expect(data.error).toBe('Business not found');
    });
  });

  describe('Review Data Transformation', () => {
    it('should transform reviews with profile data', async () => {
      const mockBusiness = {
        id: 'business-1',
        name: 'Test Business',
        business_stats: [],
      };

      const mockReviews = [
        {
          id: 'review-1',
          user_id: 'user-1',
          rating: 4,
          content: 'Good food',
          title: 'Nice place',
          tags: ['clean'],
          created_at: '2024-01-15T00:00:00Z',
          helpful_count: 2,
        },
      ];

      const mockProfiles = [
        {
          user_id: 'user-1',
          display_name: 'Jane Smith',
          username: 'janesmith',
          avatar_url: 'https://example.com/jane.jpg',
        },
      ];

      // Mock slug lookup
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      })
      // Mock business query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBusiness,
          error: null,
        }),
      })
      // Mock reviews query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockReviews,
          error: null,
        }),
      })
      // Mock review images query (empty)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })
      // Mock profiles query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: mockProfiles,
          error: null,
        }),
      });

      const req = createTestRequest('/api/businesses/business-1');
      const params = Promise.resolve({ id: 'business-1' });

      const response = await GET(req, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.reviews).toHaveLength(1);
      expect(data.reviews[0].id).toBe('review-1');
      expect(data.reviews[0].userId).toBe('user-1');
      expect(data.reviews[0].author).toBe('Jane Smith');
      expect(data.reviews[0].rating).toBe(4);
      expect(data.reviews[0].text).toBe('Good food');
      expect(data.reviews[0].tags).toEqual(['clean']);
      expect(data.reviews[0].profileImage).toBe('https://example.com/jane.jpg');
      expect(data.reviews[0].helpfulCount).toBe(2);
      expect(data.reviews[0].date).toBe('Jan 2024');
    });

    it('should handle reviews without profile data', async () => {
      const mockBusiness = {
        id: 'business-1',
        name: 'Test Business',
        business_stats: [],
      };

      const mockReviews = [
        {
          id: 'review-1',
          user_id: 'user-1',
          rating: 3,
          content: 'Okay',
          created_at: '2024-01-01T00:00:00Z',
          helpful_count: 0,
        },
      ];

      // Mock slug lookup
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      })
      // Mock business query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBusiness,
          error: null,
        }),
      })
      // Mock reviews query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockReviews,
          error: null,
        }),
      })
      // Mock review images query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })
      // Mock profiles query (empty)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const req = createTestRequest('/api/businesses/business-1');
      const params = Promise.resolve({ id: 'business-1' });

      const response = await GET(req, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.reviews).toHaveLength(1);
      expect(data.reviews[0].author).toContain('user-1'); // Fallback username
      expect(data.reviews[0].profileImage).toBe('');
    });

    it('should handle review images with storage paths', async () => {
      const mockBusiness = {
        id: 'business-1',
        name: 'Test Business',
        business_stats: [],
      };

      const mockReviews = [
        {
          id: 'review-1',
          user_id: 'user-1',
          rating: 5,
          content: 'Great!',
          created_at: '2024-01-01T00:00:00Z',
          helpful_count: 0,
        },
      ];

      const mockReviewImages = [
        {
          review_id: 'review-1',
          storage_path: 'review-1/image.jpg',
          image_url: null,
        },
      ];

      // Set env var for Supabase URL
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';

      // Mock slug lookup
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      })
      // Mock business query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBusiness,
          error: null,
        }),
      })
      // Mock reviews query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockReviews,
          error: null,
        }),
      })
      // Mock review images query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockReviewImages,
          error: null,
        }),
      })
      // Mock profiles query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const req = createTestRequest('/api/businesses/business-1');
      const params = Promise.resolve({ id: 'business-1' });

      const response = await GET(req, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.reviews[0].reviewImages).toContain(
        'https://test.supabase.co/storage/v1/object/public/review_images/review-1/image.jpg'
      );
    });
  });

  describe('Image Handling', () => {
    it('should combine uploaded_image and image_url into images array', async () => {
      const mockBusiness = {
        id: 'business-1',
        name: 'Test Business',
        uploaded_image: 'https://example.com/uploaded.jpg',
        image_url: 'https://example.com/external.jpg',
        business_stats: [],
      };

      // Mock slug lookup
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      })
      // Mock business query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBusiness,
          error: null,
        }),
      })
      // Mock reviews query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const req = createTestRequest('/api/businesses/business-1');
      const params = Promise.resolve({ id: 'business-1' });

      const response = await GET(req, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.images).toHaveLength(2);
      expect(data.images).toContain('https://example.com/uploaded.jpg');
      expect(data.images).toContain('https://example.com/external.jpg');
    });

    it('should filter out empty image strings', async () => {
      const mockBusiness = {
        id: 'business-1',
        name: 'Test Business',
        uploaded_image: '',
        image_url: '   ',
        business_stats: [],
      };

      // Mock slug lookup
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      })
      // Mock business query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBusiness,
          error: null,
        }),
      })
      // Mock reviews query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const req = createTestRequest('/api/businesses/business-1');
      const params = Promise.resolve({ id: 'business-1' });

      const response = await GET(req, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.images).toHaveLength(0);
    });
  });

  describe('Stats and Percentiles', () => {
    it('should include default percentiles when stats are missing', async () => {
      const mockBusiness = {
        id: 'business-1',
        name: 'Test Business',
        business_stats: [],
      };

      // Mock slug lookup
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      })
      // Mock business query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBusiness,
          error: null,
        }),
      })
      // Mock reviews query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const req = createTestRequest('/api/businesses/business-1');
      const params = Promise.resolve({ id: 'business-1' });

      const response = await GET(req, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.trust).toBe(85); // Default
      expect(data.punctuality).toBe(85); // Default
      expect(data.friendliness).toBe(85); // Default
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock slug lookup error
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '500', message: 'Database error' },
        }),
      });

      const req = createTestRequest('/api/businesses/business-1');
      const params = Promise.resolve({ id: 'business-1' });

      const response = await GET(req, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch business');
    });

    it('should handle review fetch errors gracefully', async () => {
      const mockBusiness = {
        id: 'business-1',
        name: 'Test Business',
        business_stats: [],
      };

      // Mock slug lookup
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      })
      // Mock business query
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockBusiness,
          error: null,
        }),
      })
      // Mock reviews query (error)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Review fetch error' },
        }),
      });

      const req = createTestRequest('/api/businesses/business-1');
      const params = Promise.resolve({ id: 'business-1' });

      const response = await GET(req, { params });
      const data = await response.json();

      // Should still return business even if reviews fail
      expect(response.status).toBe(200);
      expect(data.id).toBe('business-1');
      expect(data.reviews).toEqual([]);
    });
  });
});

describe('PUT /api/businesses/[id] - Update Business', () => {
  let mockSupabase: any;
  let mockFrom: jest.Mock;
  let mockAuth: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFrom = jest.fn();
    mockAuth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123', email: 'owner@example.com' } },
        error: null,
      }),
    };

    mockSupabase = {
      from: mockFrom,
      auth: mockAuth,
      update: jest.fn().mockReturnThis(),
    };

    (getServerSupabase as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('Authentication', () => {
    it('should require authentication to update business', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const req = createTestRequest('/api/businesses/business-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const params = Promise.resolve({ id: 'business-1' });

      const response = await PUT(req, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Authorization', () => {
    it('should require business ownership to update', async () => {
      // Mock owner check (not owner)
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      });

      const req = createTestRequest('/api/businesses/business-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const params = Promise.resolve({ id: 'business-1' });

      const response = await PUT(req, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have permission to edit this business');
    });

    it('should allow update when user is owner', async () => {
      const mockUpdatedBusiness = {
        id: 'business-1',
        name: 'Updated Name',
        description: 'Updated description',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock owner check (is owner)
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'owner-1' },
          error: null,
        }),
      })
      // Mock update query
      .mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUpdatedBusiness,
          error: null,
        }),
      });

      const req = createTestRequest('/api/businesses/business-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name', description: 'Updated description' }),
      });
      const params = Promise.resolve({ id: 'business-1' });

      const response = await PUT(req, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.business.name).toBe('Updated Name');
      expect(data.business.description).toBe('Updated description');
    });
  });

  describe('Field Updates', () => {
    it('should update only provided fields', async () => {
      const mockUpdatedBusiness = {
        id: 'business-1',
        name: 'Updated Name',
        description: 'Original description',
        category: 'Restaurant',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock owner check
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'owner-1' },
          error: null,
        }),
      })
      // Mock update query
      .mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUpdatedBusiness,
          error: null,
        }),
      });

      const req = createTestRequest('/api/businesses/business-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const params = Promise.resolve({ id: 'business-1' });

      const response = await PUT(req, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.business.name).toBe('Updated Name');
      // Description should remain unchanged
      expect(data.business.description).toBe('Original description');
    });

    it('should update all business fields', async () => {
      const mockUpdatedBusiness = {
        id: 'business-1',
        name: 'New Name',
        description: 'New Description',
        category: 'Cafe',
        address: '123 Main St',
        phone: '+27123456789',
        email: 'new@example.com',
        website: 'https://newwebsite.com',
        price_range: '$$$',
        hours: { monday: '9-5' },
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock owner check
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'owner-1' },
          error: null,
        }),
      })
      // Mock update query
      .mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUpdatedBusiness,
          error: null,
        }),
      });

      const req = createTestRequest('/api/businesses/business-1', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'New Name',
          description: 'New Description',
          category: 'Cafe',
          address: '123 Main St',
          phone: '+27123456789',
          email: 'new@example.com',
          website: 'https://newwebsite.com',
          priceRange: '$$$',
          hours: { monday: '9-5' },
        }),
      });
      const params = Promise.resolve({ id: 'business-1' });

      const response = await PUT(req, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.business.name).toBe('New Name');
      expect(data.business.description).toBe('New Description');
      expect(data.business.category).toBe('Cafe');
      expect(data.business.address).toBe('123 Main St');
      expect(data.business.phone).toBe('+27123456789');
      expect(data.business.email).toBe('new@example.com');
      expect(data.business.website).toBe('https://newwebsite.com');
      expect(data.business.price_range).toBe('$$$');
      expect(data.business.hours).toEqual({ monday: '9-5' });
    });
  });

  describe('Error Handling', () => {
    it('should handle update errors gracefully', async () => {
      // Mock owner check
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'owner-1' },
          error: null,
        }),
      })
      // Mock update query (error)
      .mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed', code: '500' },
        }),
      });

      const req = createTestRequest('/api/businesses/business-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const params = Promise.resolve({ id: 'business-1' });

      const response = await PUT(req, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update business');
    });
  });
});

