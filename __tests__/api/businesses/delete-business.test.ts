/**
 * Smoke tests: DELETE /api/businesses/[id]
 * - Unauthenticated request returns 401
 */
import { DELETE } from "@/app/api/businesses/[id]/route";

jest.mock("@/app/lib/supabase/server", () => ({
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

describe("DELETE /api/businesses/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    const req = new Request("http://localhost:3000/api/businesses/some-id", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "some-id" }) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error", "Unauthorized");
  });
});
