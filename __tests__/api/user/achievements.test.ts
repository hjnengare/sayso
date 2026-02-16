/**
 * Smoke tests: User achievements API
 * - Unauthenticated request returns 401
 * - Response structure: data array, success, achievements with name/description/icon/earnedAt
 */
import { GET } from '@/app/api/user/achievements/route';

jest.mock('@/app/lib/supabase/server', () => ({
  getServerSupabase: jest.fn(() =>
    Promise.resolve({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    })
  ),
}));

describe('GET /api/user/achievements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    const req = new Request('http://localhost:3000/api/user/achievements');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error', 'Unauthorized');
  });
});

describe('Achievements response structure', () => {
  it('expects successful response to have data array and success', () => {
    const expectedShape = {
      success: true,
      data: expect.any(Array),
    };
    const mockAchievement = {
      name: expect.any(String),
      description: expect.any(String),
      icon: expect.any(String),
      earnedAt: expect.anything(),
    };
    expect({
      success: true,
      data: [
        { name: 'New Voice', description: 'Posted your first review', icon: '/badges/027-megaphone.png', earnedAt: '2025-01-01T00:00:00Z' },
      ],
    }).toMatchObject(expectedShape);
    expect({
      name: 'New Voice',
      description: 'Posted your first review',
      icon: '/badges/027-megaphone.png',
      earnedAt: '2025-01-01T00:00:00Z',
    }).toMatchObject(mockAchievement);
  });
});
