import { test, expect } from "@playwright/test";

/**
 * Duplicate business name prevention: non-chain businesses must have unique names.
 * Chains (is_chain = true) are exempt.
 *
 * Requires: E2E_BUSINESS_ACCOUNT_EMAIL, E2E_BUSINESS_ACCOUNT_PASSWORD
 * Tests run via API; login first to get session cookies.
 */
const businessEmail = process.env.E2E_BUSINESS_ACCOUNT_EMAIL;
const businessPassword = process.env.E2E_BUSINESS_ACCOUNT_PASSWORD;

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";

async function loginAsBusiness(page: import("@playwright/test").Page) {
  await page.goto(`${baseURL}/login`);
  await page.getByRole("textbox", { name: /email/i }).fill(businessEmail!);
  await page.getByRole("textbox", { name: /password/i }).fill(businessPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 20000 });
}

async function createBusiness(
  request: import("@playwright/test").APIRequestContext,
  overrides: Record<string, string | boolean> = {}
) {
  const payload: Record<string, string> = {
    name: `E2E Duplicate Test ${Date.now()}`,
    mainCategory: "food-drink",
    category: "restaurants",
    subcategory: "restaurants",
    businessType: "physical",
    location: "9 garnet road lansdowne cape town",
    priceRange: "$$",
    ...Object.fromEntries(
      Object.entries(overrides).map(([k, v]) => [k, String(v)])
    ),
  };
  return request.post(`${baseURL}/api/businesses`, {
    multipart: payload,
    timeout: 15000,
  });
}

test.describe("Duplicate business name prevention", () => {
  test.beforeEach(async ({ page }) => {
    if (!businessEmail || !businessPassword) {
      test.skip(true, "E2E_BUSINESS_ACCOUNT_EMAIL and E2E_BUSINESS_ACCOUNT_PASSWORD required");
    }
    await page.goto(baseURL);
  });

  test("creating non-chain duplicate returns 409", async ({ page, request }) => {
    test.setTimeout(60000);
    await loginAsBusiness(page);

    const uniqueName = `E2E Duplicate Unique ${Date.now()}`;
    const res1 = await createBusiness(request, { name: uniqueName });
    expect(res1.ok()).toBe(true);

    const res2 = await createBusiness(request, { name: uniqueName });
    expect(res2.status()).toBe(409);
    const body = await res2.json();
    expect(body.error === "BUSINESS_ALREADY_EXISTS" || body.code === "BUSINESS_ALREADY_EXISTS").toBe(true);
    expect(body.message ?? body.error).toMatch(/already exists|name already exists/i);
  });

  test("creating same name with different casing fails", async ({ page, request }) => {
    test.setTimeout(60000);
    await loginAsBusiness(page);

    const uniqueName = `E2E Duplicate Case ${Date.now()}`;
    const res1 = await createBusiness(request, { name: uniqueName });
    expect(res1.ok()).toBe(true);

    const res2 = await createBusiness(request, { name: uniqueName.toLowerCase() });
    expect(res2.status()).toBe(409);
    const body = await res2.json();
    expect(body.error === "BUSINESS_ALREADY_EXISTS" || body.code === "BUSINESS_ALREADY_EXISTS").toBe(true);
  });

  test("creating same name with extra spaces fails", async ({ page, request }) => {
    test.setTimeout(60000);
    await loginAsBusiness(page);

    const uniqueName = `E2E Duplicate Spaces ${Date.now()}`;
    const res1 = await createBusiness(request, { name: uniqueName });
    expect(res1.ok()).toBe(true);

    const res2 = await createBusiness(request, { name: `  ${uniqueName}  ` });
    expect(res2.status()).toBe(409);
    const body = await res2.json();
    expect(body.error === "BUSINESS_ALREADY_EXISTS" || body.code === "BUSINESS_ALREADY_EXISTS").toBe(true);
  });

  test("creating same name marked as chain succeeds", async ({ page, request }) => {
    test.setTimeout(60000);
    await loginAsBusiness(page);

    const uniqueName = `E2E Chain Name ${Date.now()}`;
    const res1 = await createBusiness(request, { name: uniqueName });
    expect(res1.ok()).toBe(true);

    const res2 = await createBusiness(request, { name: uniqueName, isChain: true });
    expect(res2.ok()).toBe(true);
    const body = await res2.json();
    expect(body.business?.id).toBeDefined();
  });

  test("check-name API returns available: false for duplicate non-chain", async ({ page, request }) => {
    test.setTimeout(60000);
    await loginAsBusiness(page);

    const uniqueName = `E2E Check Name ${Date.now()}`;
    const createRes = await createBusiness(request, { name: uniqueName });
    expect(createRes.ok()).toBe(true);

    const checkRes = await request.get(
      `${baseURL}/api/businesses/check-name?name=${encodeURIComponent(uniqueName)}&isChain=false`
    );
    expect(checkRes.ok()).toBe(true);
    const checkBody = await checkRes.json();
    expect(checkBody.available).toBe(false);
  });

  test("check-name API returns available: true for chain with same name", async ({ page, request }) => {
    test.setTimeout(60000);
    await loginAsBusiness(page);

    const uniqueName = `E2E Chain Check ${Date.now()}`;
    const createRes = await createBusiness(request, { name: uniqueName });
    expect(createRes.ok()).toBe(true);

    const checkRes = await request.get(
      `${baseURL}/api/businesses/check-name?name=${encodeURIComponent(uniqueName)}&isChain=true`
    );
    expect(checkRes.ok()).toBe(true);
    const checkBody = await checkRes.json();
    expect(checkBody.available).toBe(true);
  });
});
