/**
 * Unit tests for POST /api/onboarding/deal-breakers
 */

import { POST } from '@/app/api/onboarding/deal-breakers/route';
import { getServerSupabase } from '@/app/lib/supabase/server';

jest.mock('@/app/lib/supabase/server');

describe('POST /api/onboarding/deal-breakers', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    rpc: jest.fn(),
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSupabase as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('should save dealbreakers and mark onboarding complete', async () => {
    const user = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockSupabase.rpc.mockResolvedValue({ error: null });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'user_interests') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [{ interest_id: 'food-drink' }], error: null }),
            }),
          }),
        };
      }
      if (table === 'user_subcategories') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [{ subcategory_id: 'restaurants' }], error: null }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    const request = new Request('http://localhost/api/onboarding/deal-breakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealbreakers: ['trustworthiness', 'punctuality'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.onboarding_complete).toBe(true);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('replace_user_dealbreakers', {
      p_user_id: user.id,
      p_dealbreaker_ids: ['trustworthiness', 'punctuality'],
    });
  });

  it('should return 400 if interests are missing', async () => {
    const user = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'user_interests') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const request = new Request('http://localhost/api/onboarding/deal-breakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealbreakers: ['trustworthiness'] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Complete interests first');
  });

  it('should return 400 if subcategories are missing', async () => {
    const user = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'user_interests') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [{ interest_id: 'food-drink' }], error: null }),
            }),
          }),
        };
      }
      if (table === 'user_subcategories') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const request = new Request('http://localhost/api/onboarding/deal-breakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealbreakers: ['trustworthiness'] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Complete subcategories first');
  });

  it('should return 400 if dealbreakers array is empty', async () => {
    const user = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const request = new Request('http://localhost/api/onboarding/deal-breakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealbreakers: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Please select at least 1 dealbreaker');
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new Request('http://localhost/api/onboarding/deal-breakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealbreakers: ['trustworthiness'] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
});
