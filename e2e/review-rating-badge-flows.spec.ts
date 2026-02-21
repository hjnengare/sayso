import { test as base, expect, type Locator, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type JsonObject = Record<string, unknown>;

interface SeededUser {
  id: string;
  email: string;
  password: string;
  username: string;
  displayName: string;
}

interface SeededBusiness {
  id: string;
  name: string;
  slug: string;
  primaryCategorySlug: string;
  primarySubcategorySlug: string;
}

interface BusinessStatsRow {
  business_id: string;
  total_reviews: number;
  average_rating: number;
  rating_distribution: JsonObject | null;
  percentiles: JsonObject | null;
}

interface SeedFactory {
  admin: SupabaseClient;
  createUser: (label?: string) => Promise<SeededUser>;
  createBusiness: (
    label?: string,
    overrides?: Partial<{
      primaryCategorySlug: string;
      primarySubcategorySlug: string;
      name: string;
      slug: string;
    }>
  ) => Promise<SeededBusiness>;
}

interface ReviewPayload {
  businessId: string;
  rating: number;
  content: string;
  title?: string;
  tags?: string[];
}

interface ReviewApiResult {
  status: number;
  body: any;
}

const DEFAULT_PRIMARY_CATEGORY = "food-drink";
const DEFAULT_PRIMARY_SUBCATEGORY = "cafes";
const QUICK_TAGS = ["Trustworthy", "On Time", "Friendly", "Good Value"];
const PERSONAL_EMAIL = process.env.E2E_PERSONAL_ACCOUNT_EMAIL;
const PERSONAL_PASSWORD = process.env.E2E_PERSONAL_ACCOUNT_PASSWORD;

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9b2xQAAAAASUVORK5CYII=";
const TINY_PNG_BUFFER = Buffer.from(TINY_PNG_BASE64, "base64");

function nowKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 55);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function distributionCount(distribution: JsonObject | null, rating: number): number {
  if (!distribution) return 0;
  const key = String(rating);
  const value = distribution[key];
  return typeof value === "number" ? value : Number(value || 0);
}

function asNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value || 0);
}

async function ensureBasicPreferences(admin: SupabaseClient, userId: string): Promise<void> {
  try {
    const { data: interestRows } = await admin
      .from("user_interests")
      .select("interest_id")
      .eq("user_id", userId)
      .limit(1);

    const { data: subcategoryRows } = await admin
      .from("user_subcategories")
      .select("subcategory_id")
      .eq("user_id", userId)
      .limit(1);

    const interestId = interestRows?.[0]?.interest_id || DEFAULT_PRIMARY_CATEGORY;
    const subcategoryId = subcategoryRows?.[0]?.subcategory_id || DEFAULT_PRIMARY_SUBCATEGORY;

    await admin
      .from("user_interests")
      .upsert({ user_id: userId, interest_id: interestId }, { onConflict: "user_id,interest_id" });

    await admin
      .from("user_subcategories")
      .upsert({ user_id: userId, subcategory_id: subcategoryId }, { onConflict: "user_id,subcategory_id" });
  } catch {
    // best-effort; missing preferences will keep For You hidden but shouldn't break the spec
  }
}

async function getOrCreatePersonalUser(admin: SupabaseClient): Promise<SeededUser | null> {
  if (!PERSONAL_EMAIL || !PERSONAL_PASSWORD) return null;

  const { data: profileRow } = await admin
    .from("profiles")
    .select("user_id, username, display_name")
    .eq("email", PERSONAL_EMAIL)
    .maybeSingle();

  let userId = profileRow?.user_id || null;
  const username = profileRow?.username || PERSONAL_EMAIL.split("@")[0];
  const displayName = profileRow?.display_name || "E2E Personal";

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: PERSONAL_EMAIL,
      password: PERSONAL_PASSWORD,
      email_confirm: true,
      user_metadata: {
        username,
        display_name: displayName,
      },
    });

    if (error || !data?.user?.id) {
      throw new Error(`Failed to ensure personal account exists: ${error?.message || "unknown error"}`);
    }

    userId = data.user.id;
  }

  await admin
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        email: PERSONAL_EMAIL,
        username,
        display_name: displayName,
        role: "user",
        account_role: "user",
        onboarding_step: "complete",
        onboarding_complete: true,
        onboarding_completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  await ensureBasicPreferences(admin, userId);

  return {
    id: userId,
    email: PERSONAL_EMAIL,
    password: PERSONAL_PASSWORD,
    username,
    displayName,
  };
}

async function getBusinessStats(admin: SupabaseClient, businessId: string): Promise<BusinessStatsRow> {
  const { data, error } = await admin
    .from("business_stats")
    .select("business_id,total_reviews,average_rating,rating_distribution,percentiles")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Failed to fetch business_stats for ${businessId}: ${error?.message || "not found"}`);
  }

  return data as BusinessStatsRow;
}

async function waitForStats(
  admin: SupabaseClient,
  businessId: string,
  predicate: (row: BusinessStatsRow) => boolean,
  timeoutMs = 25_000
): Promise<BusinessStatsRow> {
  const start = Date.now();
  let latest: BusinessStatsRow | null = null;

  while (Date.now() - start < timeoutMs) {
    latest = await getBusinessStats(admin, businessId);
    if (predicate(latest)) return latest;
    await sleep(400);
  }

  throw new Error(`Timed out waiting for stats update for ${businessId}. Last row: ${JSON.stringify(latest)}`);
}

async function forceStatsRecalc(admin: SupabaseClient, businessId: string): Promise<void> {
  for (let i = 0; i < 3; i += 1) {
    const { error } = await admin.rpc("update_business_stats", { p_business_id: businessId });
    if (!error) return;
    await sleep(300);
  }
}

async function loginAsPersonal(page: Page, user: SeededUser): Promise<void> {
  await page.goto("/login");

  const personalToggle = page.getByRole("button", { name: /Personal Account/i });
  if (await personalToggle.isVisible().catch(() => false)) {
    await personalToggle.click();
  }

  const loginToggle = page.getByRole("button", { name: /^Login$/i });
  if (await loginToggle.isVisible().catch(() => false)) {
    await loginToggle.click();
  }

  await page.locator('input[type="email"]').first().fill(user.email);
  await page.locator('input[type="password"]').first().fill(user.password);

  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 30_000 }),
    page.locator("form button[type='submit']").first().click(),
  ]);
}

async function openReviewForm(page: Page, business: SeededBusiness): Promise<void> {
  await page.goto(`/business/${business.slug}`);
  await expect(page.getByText(business.name).first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: /Leave a Review/i }).click();
  await expect(page.getByRole("heading", { name: /Write a Review/i }).first()).toBeVisible({ timeout: 15_000 });
}

async function submitReviewViaApi(page: Page, payload: ReviewPayload): Promise<ReviewApiResult> {
  return page.evaluate(async (input) => {
    const formData = new FormData();
    formData.append("business_id", input.businessId);
    formData.append("rating", String(input.rating));
    if (input.title) formData.append("title", input.title);
    formData.append("content", input.content);
    for (const tag of input.tags || []) formData.append("tags", tag);

    const response = await fetch("/api/reviews", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    let body: any = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    return { status: response.status, body };
  }, payload);
}

async function triggerBadgeCheck(page: Page): Promise<any> {
  const response = await page.request.post("/api/badges/check-and-award");
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function getUserBadges(page: Page, userId: string): Promise<any[]> {
  const response = await page.request.get(`/api/badges/user?user_id=${userId}`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return Array.isArray(body?.badges) ? body.badges : [];
}

async function waitForEarnedBadge(
  page: Page,
  userId: string,
  badgeName: RegExp,
  timeoutMs = 20_000
): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const badges = await getUserBadges(page, userId);
    const found = badges.find((badge) => badge?.earned && badgeName.test(String(badge?.name || "")));
    if (found) return found;
    await sleep(500);
  }
  throw new Error(`Timed out waiting for earned badge: ${badgeName}`);
}

async function setSearchQuery(page: Page, placeholder: RegExp, query: string): Promise<void> {
  const preferred = page.getByPlaceholder(placeholder).first();
  const input = (await preferred.isVisible().catch(() => false))
    ? preferred
    : page.locator("main input[type='text']").first();

  await input.fill(query);
  await input.press("Enter").catch(() => {});
}

async function findBusinessCard(page: Page, businessName: string): Promise<{ detailsButton: Locator; card: Locator }> {
  const detailsButton = page
    .getByRole("button", { name: new RegExp(`View ${escapeRegex(businessName)} details`, "i") })
    .first();

  await expect(detailsButton).toBeVisible({ timeout: 20_000 });
  const card = detailsButton.locator("xpath=ancestor::li[1]");
  return { detailsButton, card };
}

async function readPercentileChipLabels(card: Locator): Promise<string[]> {
  return card.locator("[aria-label]").evaluateAll((nodes) =>
    nodes
      .map((node) => node.getAttribute("aria-label") || "")
      .filter((label) =>
        /(Punctuality|Cost Effectiveness|Friendliness|Trustworthiness|insights coming soon)/i.test(label)
      )
  );
}

async function cleanupSeedData(
  admin: SupabaseClient,
  userIdsInput: string[],
  businessIdsInput: string[]
): Promise<void> {
  const userIds = Array.from(new Set(userIdsInput.filter(Boolean)));
  const businessIds = Array.from(new Set(businessIdsInput.filter(Boolean)));
  const reviewIdSet = new Set<string>();

  if (businessIds.length > 0) {
    const { data } = await admin.from("reviews").select("id").in("business_id", businessIds);
    for (const row of data || []) {
      if (row?.id) reviewIdSet.add(row.id);
    }
  }

  if (userIds.length > 0) {
    const { data } = await admin.from("reviews").select("id").in("user_id", userIds);
    for (const row of data || []) {
      if (row?.id) reviewIdSet.add(row.id);
    }
  }

  const reviewIds = Array.from(reviewIdSet);

  if (reviewIds.length > 0) {
    const { data: imageRows } = await admin
      .from("review_images")
      .select("storage_path")
      .in("review_id", reviewIds);

    const storagePaths = (imageRows || [])
      .map((row) => row?.storage_path)
      .filter((path): path is string => typeof path === "string" && path.length > 0);

    if (storagePaths.length > 0) {
      await admin.storage.from("review_images").remove(storagePaths);
    }

    await admin.from("review_images").delete().in("review_id", reviewIds);
    await admin.from("review_helpful_votes").delete().in("review_id", reviewIds);
    await admin.from("reviews").delete().in("id", reviewIds);
  }

  if (businessIds.length > 0) {
    await admin.from("business_images").delete().in("business_id", businessIds);
    await admin.from("businesses").delete().in("id", businessIds);
  }

  if (userIds.length > 0) {
    await admin.from("user_badges").delete().in("user_id", userIds);
    await admin.from("profiles").delete().in("user_id", userIds);

    for (const userId of userIds) {
      await admin.auth.admin.deleteUser(userId);
    }
  }
}

type Fixtures = {
  admin: SupabaseClient;
  seedFactory: SeedFactory;
  seededUser: SeededUser;
  seededBusiness: SeededBusiness;
};

const test = base.extend<Fixtures>({
  admin: async ({}, use) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for this spec.");
    }

    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    await use(client);
  },

  seedFactory: async ({ admin }, use) => {
    const createdUserIds: string[] = [];
    const createdBusinessIds: string[] = [];

    const createUser = async (label = "user"): Promise<SeededUser> => {
      const key = nowKey();
      const username = `${slugify(label)}_${key.replace(/-/g, "")}`.slice(0, 20);
      const email = `e2e.${slugify(label)}.${key}@example.test`;
      const password = `Pass_${key}!Aa1`;
      const displayName = `E2E ${label} ${key.slice(-4)}`;

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          display_name: displayName,
        },
      });

      if (error || !data?.user?.id) {
        throw new Error(`Failed to create seeded user (${label}): ${error?.message || "unknown error"}`);
      }

      const userId = data.user.id;
      createdUserIds.push(userId);

      const { error: profileError } = await admin.from("profiles").upsert(
        {
          user_id: userId,
          email,
          username,
          display_name: displayName,
          role: "user",
          account_role: "user",
          onboarding_step: "complete",
          onboarding_complete: true,
          onboarding_completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (profileError) {
        throw new Error(`Failed to create profile for seeded user (${label}): ${profileError.message}`);
      }

      return {
        id: userId,
        email,
        password,
        username,
        displayName,
      };
    };

    const createBusiness = async (
      label = "business",
      overrides: Partial<{
        primaryCategorySlug: string;
        primarySubcategorySlug: string;
        name: string;
        slug: string;
      }> = {}
    ): Promise<SeededBusiness> => {
      const key = nowKey();
      const name = overrides.name || `E2E ${label} ${key}`;
      const slug = overrides.slug || `${slugify(label)}-${key}`;
      const primaryCategorySlug = overrides.primaryCategorySlug || DEFAULT_PRIMARY_CATEGORY;
      const primarySubcategorySlug = overrides.primarySubcategorySlug || DEFAULT_PRIMARY_SUBCATEGORY;

      const { data, error } = await admin
        .from("businesses")
        .insert({
          name,
          slug,
          primary_category_slug: primaryCategorySlug,
          primary_subcategory_slug: primarySubcategorySlug,
          primary_subcategory_label: "Cafes",
          location: "Cape Town",
          description: `Seeded business for ${label}`,
          status: "active",
          is_hidden: false,
          verified: true,
          price_range: "$$",
        })
        .select("id,name,slug,primary_category_slug,primary_subcategory_slug")
        .single();

      if (error || !data?.id) {
        throw new Error(`Failed to create seeded business (${label}): ${error?.message || "unknown error"}`);
      }

      createdBusinessIds.push(data.id);
      await waitForStats(admin, data.id, () => true, 10_000);

      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        primaryCategorySlug: data.primary_category_slug,
        primarySubcategorySlug: data.primary_subcategory_slug,
      };
    };

    await use({
      admin,
      createUser,
      createBusiness,
    });

    await cleanupSeedData(admin, createdUserIds, createdBusinessIds);
  },

  seededUser: async ({ seedFactory, admin }, use) => {
    const personal = await getOrCreatePersonalUser(admin);
    const user = personal ?? (await seedFactory.createUser("seed-user"));
    await use(user);
  },

  seededBusiness: async ({ seedFactory }, use) => {
    const business = await seedFactory.createBusiness("seed-business");
    await use(business);
  },
});

test.describe("Review submission flow", () => {
  test("smoke: personal user submits a full review and sees immediate updates", async ({
    page,
    admin,
    seededUser,
    seededBusiness,
  }) => {
    test.setTimeout(180_000);

    await loginAsPersonal(page, seededUser);
    const beforeStats = await getBusinessStats(admin, seededBusiness.id);

    const reviewTitle = `Amazing visit ${nowKey()}`;
    const reviewContent = `E2E full-flow review ${nowKey()}: staff were super friendly and service was excellent.`;

    await openReviewForm(page, seededBusiness);

    await page.getByRole("button", { name: /Rate 4 stars/i }).click();
    await page.getByPlaceholder("Summarize your experience...").fill(reviewTitle);
    await page.getByPlaceholder("Share your experience with others...").fill(reviewContent);

    for (const tag of QUICK_TAGS) {
      await page.getByRole("button", { name: new RegExp(`\\b${escapeRegex(tag)}\\b`, "i") }).click();
    }

    await page.locator('input[type="file"][accept="image/*"]').first().setInputFiles([
      {
        name: "review-image-1.png",
        mimeType: "image/png",
        buffer: TINY_PNG_BUFFER,
      },
    ]);

    const submitButton = page.getByRole("button", { name: /Submit Review/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Critical assertion: confetti canvas is part of the success UX after submission.
    await expect
      .poll(async () => page.locator("canvas").count(), { timeout: 7_000 })
      .toBeGreaterThan(0);

    await page.waitForURL(new RegExp(`/business/${escapeRegex(seededBusiness.slug)}(?:/)?(?:\\?|$)`), {
      timeout: 20_000,
    });

    // Critical assertion: newly submitted review is visible without hard-refreshing.
    await expect(page.getByText(reviewTitle)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(reviewContent.slice(0, 30))).toBeVisible({ timeout: 20_000 });

    await page.goto("/profile");
    await expect(page.getByText("Your Contributions")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(seededBusiness.name)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(reviewContent.slice(0, 35))).toBeVisible({ timeout: 20_000 });

    const afterStats = await waitForStats(
      admin,
      seededBusiness.id,
      (row) => row.total_reviews === beforeStats.total_reviews + 1
    );

    const expectedAverage =
      (beforeStats.average_rating * beforeStats.total_reviews + 4) / (beforeStats.total_reviews + 1);

    expect(afterStats.total_reviews).toBe(beforeStats.total_reviews + 1);
    expect(Math.abs(afterStats.average_rating - expectedAverage)).toBeLessThan(0.01);
    expect(distributionCount(afterStats.rating_distribution, 4)).toBeGreaterThan(0);
  });

  test("edge cases: rating bounds, empty content, duplicate prevention", async ({
    page,
    admin,
    seededUser,
    seededBusiness,
  }) => {
    test.setTimeout(140_000);

    await loginAsPersonal(page, seededUser);

    const invalidRating = await submitReviewViaApi(page, {
      businessId: seededBusiness.id,
      rating: 7,
      content: `Invalid rating payload ${nowKey()}`,
      tags: [],
    });

    expect(invalidRating.status).toBe(400);
    expect(["INVALID_RATING", "VALIDATION_FAILED"]).toContain(String(invalidRating.body?.code));

    await openReviewForm(page, seededBusiness);
    await page.getByRole("button", { name: /Rate 5 stars/i }).click();
    await expect(page.getByRole("button", { name: /Submit Review/i })).toBeDisabled();

    const firstSubmission = await submitReviewViaApi(page, {
      businessId: seededBusiness.id,
      rating: 5,
      content: `Duplicate-check review ${nowKey()} with enough characters.`,
      tags: ["Trustworthy"],
    });

    expect(firstSubmission.status).toBe(200);
    expect(firstSubmission.body?.success).toBeTruthy();

    const duplicateSubmission = await submitReviewViaApi(page, {
      businessId: seededBusiness.id,
      rating: 4,
      content: `Duplicate-check second attempt ${nowKey()} should fail.`,
      tags: ["Friendly"],
    });

    expect([200, 409]).toContain(duplicateSubmission.status);
    if (duplicateSubmission.status === 409) {
      expect(String(duplicateSubmission.body?.code)).toContain("DUPLICATE");
    }

    const { count } = await admin
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("business_id", seededBusiness.id)
      .eq("user_id", seededUser.id);

    // Critical assertion: duplicate prevention leaves only one persisted review per user/business.
    expect(count).toBe(1);
  });

  test("anonymous submission + image upload limits", async ({ browser, admin, seededBusiness }) => {
    test.setTimeout(160_000);

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(`/business/${seededBusiness.slug}/review`);
      await expect(page.getByText(/Posting as Anonymous/i)).toBeVisible({ timeout: 15_000 });

      const fileInput = page.locator('input[type="file"][accept="image/*"]').first();

      const oversizeDialog = page.waitForEvent("dialog");
      await fileInput.setInputFiles([
        {
          name: "too-large.png",
          mimeType: "image/png",
          buffer: Buffer.alloc(1_150_000, 1),
        },
      ]);
      const dialog = await oversizeDialog;
      expect(dialog.message().toLowerCase()).toContain("maximum size is 1mb");
      await dialog.accept();

      await fileInput.setInputFiles([
        { name: "img-1.png", mimeType: "image/png", buffer: TINY_PNG_BUFFER },
        { name: "img-2.png", mimeType: "image/png", buffer: TINY_PNG_BUFFER },
        { name: "img-3.png", mimeType: "image/png", buffer: TINY_PNG_BUFFER },
      ]);

      await expect(page.getByRole("button", { name: /Remove image/i })).toHaveCount(2);

      const anonymousContent = `Anonymous review ${nowKey()} says this place is great.`;
      await page.getByRole("button", { name: /Rate 4 stars/i }).click();
      await page.getByPlaceholder("Share your experience with others...").fill(anonymousContent);

      await page.getByRole("button", { name: /Submit Review/i }).click();
      await page.waitForURL(new RegExp(`/business/${escapeRegex(seededBusiness.slug)}(?:/)?(?:\\?|$)`), {
        timeout: 20_000,
      });

      await expect(page.getByText(anonymousContent.slice(0, 20))).toBeVisible({ timeout: 20_000 });

      const { data, error } = await admin
        .from("reviews")
        .select("id,user_id,anonymous_id")
        .eq("business_id", seededBusiness.id)
        .eq("content", anonymousContent)
        .limit(1);

      expect(error).toBeNull();
      expect((data || []).length).toBe(1);
      expect(data?.[0]?.user_id).toBeNull();
      expect(data?.[0]?.anonymous_id).toBeTruthy();
    } finally {
      await context.close();
    }
  });
});

test.describe("Rating calculation and metrics", () => {
  test("average, distribution, percentile chips, and stale-navigation checks", async ({
    browser,
    page,
    admin,
    seedFactory,
    seededUser,
    seededBusiness,
  }) => {
    test.setTimeout(220_000);

    const secondUser = await seedFactory.createUser("second-rater");
    const noReviewBusiness = await seedFactory.createBusiness("no-review-business", {
      primaryCategorySlug: seededBusiness.primaryCategorySlug,
      primarySubcategorySlug: seededBusiness.primarySubcategorySlug,
    });

    await loginAsPersonal(page, seededUser);

    const firstReview = await submitReviewViaApi(page, {
      businessId: seededBusiness.id,
      rating: 5,
      content: `Metrics review A ${nowKey()} long enough content.`,
      tags: ["Trustworthy", "Friendly"],
    });
    expect(firstReview.status).toBe(200);

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    try {
      await loginAsPersonal(pageB, secondUser);
      const secondReview = await submitReviewViaApi(pageB, {
        businessId: seededBusiness.id,
        rating: 3,
        content: `Metrics review B ${nowKey()} long enough content.`,
        tags: ["On Time"],
      });
      expect(secondReview.status).toBe(200);
    } finally {
      await contextB.close();
    }

    await forceStatsRecalc(admin, seededBusiness.id);
    const stats = await waitForStats(admin, seededBusiness.id, (row) => row.total_reviews >= 2, 30_000);

    expect(stats.total_reviews).toBeGreaterThanOrEqual(2);
    expect(Math.abs(stats.average_rating - 4)).toBeLessThan(0.1);
    expect(distributionCount(stats.rating_distribution, 5)).toBeGreaterThan(0);
    expect(distributionCount(stats.rating_distribution, 3)).toBeGreaterThan(0);

    await page.goto("/home");

    await page.getByRole("button", { name: /See More: Trending Now/i }).click();
    await expect(page.getByRole("heading", { name: /Trending Now/i })).toBeVisible({ timeout: 20_000 });
    await setSearchQuery(page, /Search trending businesses/i, seededBusiness.name);

    const { card: trendingCard } = await findBusinessCard(page, seededBusiness.name);
    await expect(trendingCard).toContainText(/Reviews/i);
    await expect(trendingCard).toContainText(/\b2\b|\b3\b|\b4\b|\b5\b/);
    await expect(trendingCard).toContainText(/4\.0|3\.[5-9]|4\.[0-5]/);

    const trendingPercentileLabels = await readPercentileChipLabels(trendingCard);
    expect(trendingPercentileLabels.length).toBeGreaterThan(0);
    expect(trendingPercentileLabels.some((label) => /%/.test(label))).toBeTruthy();

    await page.reload();
    await expect(page.getByRole("heading", { name: /Trending Now/i })).toBeVisible({ timeout: 15_000 });
    await setSearchQuery(page, /Search trending businesses/i, seededBusiness.name);
    await findBusinessCard(page, seededBusiness.name);

    await page.goto("/home");
    await page.getByRole("button", { name: /See More: For You/i }).click();
    await expect(page.getByRole("heading", { name: /Curated Just For You/i })).toBeVisible({ timeout: 20_000 });
    await setSearchQuery(page, /Discover exceptional local hidden gems/i, seededBusiness.name);

    const { card: forYouCard } = await findBusinessCard(page, seededBusiness.name);
    await expect(forYouCard).toContainText(/Reviews/i);
    await expect(forYouCard).toContainText(/4\.0|3\.[5-9]|4\.[0-5]/);

    await page.reload();
    await expect(page.getByRole("heading", { name: /Curated Just For You/i })).toBeVisible({ timeout: 15_000 });
    await setSearchQuery(page, /Discover exceptional local hidden gems/i, seededBusiness.name);
    await findBusinessCard(page, seededBusiness.name);

    await page.goto("/home");
    await page.getByRole("button", { name: /See more: Events & Specials/i }).click();
    await expect(page.getByRole("heading", { name: /Events & Specials/i })).toBeVisible({ timeout: 20_000 });

    await page.goto("/trending");
    await setSearchQuery(page, /Search trending businesses/i, noReviewBusiness.name);
    const { card: zeroCard } = await findBusinessCard(page, noReviewBusiness.name);
    await expect(zeroCard).toContainText(/Be the first to review/i);

    const zeroPercentileLabels = await readPercentileChipLabels(zeroCard);
    expect(zeroPercentileLabels.length).toBeGreaterThan(0);
    expect(zeroPercentileLabels.every((label) => /coming soon|—/i.test(label))).toBeTruthy();

    const featuredResponse = await page.request.get("/api/featured?limit=50");
    expect(featuredResponse.ok()).toBeTruthy();
    const featuredBody = await featuredResponse.json();
    const featuredData = Array.isArray(featuredBody?.data) ? featuredBody.data : [];
    const featuredMatch = featuredData.find((row: any) => row?.id === seededBusiness.id);
    if (featuredMatch) {
      expect(Math.abs(asNumber(featuredMatch.average_rating) - stats.average_rating)).toBeLessThan(0.2);
    }
  });
});

test.describe("Badge earning logic", () => {
  test("New Voice badge: award, sync, persistence, and dedupe", async ({
    page,
    admin,
    seededUser,
    seededBusiness,
  }) => {
    test.setTimeout(180_000);

    await loginAsPersonal(page, seededUser);

    const beforeBadges = await getUserBadges(page, seededUser.id);
    expect(beforeBadges.some((badge) => badge?.earned && /New Voice/i.test(String(badge?.name || "")))).toBeFalsy();

    const reviewContent = `Badge test review ${nowKey()} with enough text to pass validation.`;
    const submission = await submitReviewViaApi(page, {
      businessId: seededBusiness.id,
      rating: 5,
      content: reviewContent,
      tags: ["Trustworthy"],
    });
    expect(submission.status).toBe(200);

    await triggerBadgeCheck(page);
    await triggerBadgeCheck(page);

    await waitForEarnedBadge(page, seededUser.id, /New Voice/i, 25_000);

    const { data: badgeRows } = await admin
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", seededUser.id);

    const newVoiceCount = (badgeRows || []).filter((row) => /new_voice/i.test(String(row.badge_id))).length;
    expect(newVoiceCount).toBeLessThanOrEqual(1);

    await page.goto("/profile");
    await expect(page.getByText(/New Voice/i)).toBeVisible({ timeout: 20_000 });

    await page.reload();
    await expect(page.getByText(/New Voice/i)).toBeVisible({ timeout: 20_000 });

    await page.goto(`/business/${seededBusiness.slug}`);
    await expect(page.getByText(reviewContent.slice(0, 24))).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/New Voice/i)).toBeVisible({ timeout: 20_000 });

    await triggerBadgeCheck(page);
    const { data: dedupeRows } = await admin
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", seededUser.id);
    const dedupeNewVoiceCount = (dedupeRows || []).filter((row) =>
      /new_voice/i.test(String(row.badge_id))
    ).length;
    expect(dedupeNewVoiceCount).toBeLessThanOrEqual(1);
  });

  test("Top Contributor + milestone/category badges and regression guards", async ({
    page,
    admin,
    seedFactory,
    seededUser,
  }) => {
    test.setTimeout(240_000);

    const noReviewUser = await seedFactory.createUser("no-review-check");
    const beforeNoReviewBadges = await getUserBadges(page, noReviewUser.id);
    expect(
      beforeNoReviewBadges.some((badge) => badge?.earned && /New Voice|Rookie Reviewer|Top Reviewer/i.test(String(badge?.name || "")))
    ).toBeFalsy();

    const categoryBusinesses: SeededBusiness[] = [];
    for (let i = 0; i < 5; i += 1) {
      categoryBusinesses.push(
        await seedFactory.createBusiness(`milestone-${i + 1}`, {
          primaryCategorySlug: DEFAULT_PRIMARY_CATEGORY,
          primarySubcategorySlug: DEFAULT_PRIMARY_SUBCATEGORY,
        })
      );
    }

    await loginAsPersonal(page, seededUser);

    for (let i = 0; i < categoryBusinesses.length; i += 1) {
      const business = categoryBusinesses[i];
      const result = await submitReviewViaApi(page, {
        businessId: business.id,
        rating: i % 2 === 0 ? 5 : 4,
        content: `Badge progression review ${i + 1} ${nowKey()} with valid length.`,
        tags: ["Trustworthy", "Friendly"],
      });
      expect(result.status).toBe(200);
    }

    await triggerBadgeCheck(page);
    await triggerBadgeCheck(page);

    const earnedBadges = (await getUserBadges(page, seededUser.id)).filter((badge) => badge?.earned);
    const earnedNames = earnedBadges.map((badge) => String(badge?.name || ""));
    const earnedGroups = earnedBadges.map((badge) => String(badge?.badge_group || ""));

    expect(earnedNames.some((name) => /New Voice/i.test(name))).toBeTruthy();
    expect(earnedNames.some((name) => /Rookie Reviewer|Level Up|Review Machine|Century Club/i.test(name))).toBeTruthy();
    expect(earnedGroups.some((group) => /specialist/i.test(group))).toBeTruthy();

    const topResponse = await page.request.get("/api/reviewers/top?limit=100");
    expect(topResponse.ok()).toBeTruthy();
    const topBody = await topResponse.json();
    const topReviewers = Array.isArray(topBody?.reviewers) ? topBody.reviewers : [];
    expect(topReviewers.some((reviewer: any) => reviewer?.id === seededUser.id)).toBeTruthy();

    await page.goto("/profile");
    await expect(page.getByText(/Badges/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/New Voice|Rookie Reviewer|Level Up!/i)).toBeVisible({ timeout: 20_000 });

    const { data: rowsBeforeDelete } = await admin
      .from("reviews")
      .select("id,business_id")
      .eq("user_id", seededUser.id);

    const businessIds = Array.from(
      new Set((rowsBeforeDelete || []).map((row) => row.business_id).filter((value): value is string => !!value))
    );
    await admin.from("reviews").delete().eq("user_id", seededUser.id);
    for (const businessId of businessIds) {
      await forceStatsRecalc(admin, businessId);
    }

    await expect
      .poll(
        async () => {
          const response = await page.request.get("/api/reviewers/top?limit=100");
          const body = await response.json();
          const reviewers = Array.isArray(body?.reviewers) ? body.reviewers : [];
          return reviewers.some((reviewer: any) => reviewer?.id === seededUser.id);
        },
        { timeout: 20_000 }
      )
      .toBeFalsy();

    const { data: dedupeRows } = await admin.from("user_badges").select("badge_id").eq("user_id", seededUser.id);
    const counts = new Map<string, number>();
    for (const row of dedupeRows || []) {
      const key = String(row.badge_id || "");
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const duplicateEntries = Array.from(counts.values()).filter((value) => value > 1);
    expect(duplicateEntries.length).toBe(0);
  });
});
