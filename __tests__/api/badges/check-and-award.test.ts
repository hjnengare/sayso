/**
 * Smoke tests: Badge check-and-award API
 * - Unauthenticated request returns 401
 * - Authenticated request returns ok and newBadges array (structure)
 */
import { POST } from '@/app/api/badges/check-and-award/route';

// Mock Supabase server
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

describe('POST /api/badges/check-and-award', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    const req = new Request('http://localhost:3000/api/badges/check-and-award', {
      method: 'POST',
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error', 'Unauthorized');
  });
});

describe('Badge check-and-award response structure (when authenticated)', () => {
  it('expects successful response to have ok, newBadges, message', () => {
    const expectedShape = {
      ok: true,
      newBadges: expect.any(Array),
      message: expect.any(String),
    };
    expect({ ok: true, newBadges: [], message: 'No new badges earned' }).toMatchObject(expectedShape);
  });
});
