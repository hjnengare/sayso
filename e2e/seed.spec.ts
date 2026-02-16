import { test, expect } from '@playwright/test';

test.describe('Business Upload → Admin Approval → Goes Live', () => {
  const businessEmail = process.env.E2E_BUSINESS_ACCOUNT_EMAIL;
  const businessPassword = process.env.E2E_BUSINESS_ACCOUNT_PASSWORD;
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  const baseURL = 'https://sayso.co.za';
  
  test.beforeEach(async ({ page }) => {
    // Skip tests if required environment variables are not set
    if (!businessEmail || !businessPassword || !adminEmail || !adminPassword) {
      test.skip(true, 'E2E_BUSINESS_ACCOUNT_EMAIL, E2E_BUSINESS_ACCOUNT_PASSWORD, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD required');
      return;
    }
    await page.goto(baseURL);
  });

  test('Business account can create and submit business for approval', async ({ page }) => {
    test.setTimeout(90000);
    
    const uniqueName = `E2E Test Business ${Date.now()}`;
    
    // Login as business account
    await page.goto(`${baseURL}/login`);
    await page.getByRole('textbox', { name: /email/i }).fill(businessEmail!);
    await page.getByRole('textbox', { name: /password/i }).fill(businessPassword!);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for login to complete
    await page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 20000 });
    
    // Navigate to business creation page
    await page.goto(`${baseURL}/add-business`);
    
    // Fill business creation form
    await page.getByRole('textbox', { name: /business name/i }).fill(uniqueName);
    
    // Select category
    await page.getByPlaceholder(/select.*category/i).click();
    await page.getByText(/food.*drink|restaurant/i).first().click();
    
    // Select subcategory
    await page.getByPlaceholder(/select.*subcategory/i).click();
    await page.getByText(/cafe|restaurant/i).first().click();
    
    // Fill location
    await page.getByRole('textbox', { name: /location/i }).fill('Cape Town, V&A Waterfront');
    
    // Submit business
    await page.getByRole('button', { name: /submit|create|add business/i }).click();
    
    // Verify submission success
    await expect(page.getByText(/submitted for review|submitted for approval/i)).toBeVisible({ timeout: 15000 });
    
    // Store business name for later tests
    await page.addInitScript(`window.testBusinessName = "${uniqueName}";`);
  });

  test('Admin can view pending business and approve it', async ({ page }) => {
    test.setTimeout(90000);
    
    // Get business name from previous test
    const testBusinessName = await page.evaluate(() => window.testBusinessName).catch(() => 'E2E Test Business');
    
    // Login as admin
    await page.goto(`${baseURL}/login`);
    await page.getByRole('textbox', { name: /email/i }).fill(adminEmail!);
    await page.getByRole('textbox', { name: /password/i }).fill(adminPassword!);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for login to complete
    await page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 20000 });
    
    // Navigate to admin pending businesses
    await page.goto(`${baseURL}/admin/pending-businesses`);
    await expect(page).toHaveURL(/\/admin\/pending-businesses/);
    
    // Find the test business in pending list
    const businessRow = page.locator('table tbody tr').filter({ hasText: testBusinessName });
    await expect(businessRow).toBeVisible({ timeout: 10000 });
    
    // Click review/approve button
    await businessRow.getByRole('button', { name: /review|approve/i }).first().click();
    
    // If redirected to review page, approve from there
    if (await page.getByRole('button', { name: /approve/i }).isVisible()) {
      await page.getByRole('button', { name: /approve/i }).click();
    }
    
    // Verify approval success
    await expect(page.getByText(/approved|success/i)).toBeVisible({ timeout: 15000 });
    
    // Verify business no longer in pending list
    await page.reload();
    await expect(businessRow).not.toBeVisible({ timeout: 5000 });
  });

  test('Approved business becomes publicly accessible and discoverable', async ({ page }) => {
    test.setTimeout(60000);
    
    const testBusinessName = await page.evaluate(() => window.testBusinessName).catch(() => 'E2E Test Business');
    
    // Navigate to homepage without login (public access)
    await page.goto(baseURL);
    
    // Test business is searchable
    if (await page.getByPlaceholder(/search/i).first().isVisible()) {
      await page.getByPlaceholder(/search/i).first().fill(testBusinessName);
      await page.getByPlaceholder(/search/i).first().press('Enter');
      
      // Should find the business in search results
      await expect(page.getByText(testBusinessName)).toBeVisible({ timeout: 10000 });
    }
    
    // Test direct business access via API to get business slug/ID
    const businessResponse = await page.request.get(`${baseURL}/api/businesses?search=${encodeURIComponent(testBusinessName)}`);
    
    if (businessResponse.ok()) {
      const businessData = await businessResponse.json();
      const business = businessData.businesses?.find((b: any) => b.name.includes('E2E Test Business'));
      
      if (business) {
        // Test direct business page access
        const businessSlug = business.slug || business.id;
        await page.goto(`${baseURL}/business/${businessSlug}`);
        
        // Verify business page loads correctly
        await expect(page.getByText(business.name)).toBeVisible();
        await expect(page.getByText(/food.*drink|restaurant/i)).toBeVisible();
        await expect(page.getByText(/cape town/i)).toBeVisible();
        
        // Verify review functionality is available
        await expect(page.getByRole('button', { name: /write.*review/i })).toBeVisible();
      }
    }
  });

  test('Business owner can submit review on approved business', async ({ page }) => {
    test.setTimeout(60000);
    
    const testBusinessName = await page.evaluate(() => window.testBusinessName).catch(() => 'E2E Test Business');
    
    // Get approved business details
    const businessResponse = await page.request.get(`${baseURL}/api/businesses?search=${encodeURIComponent(testBusinessName)}`);
    
    if (businessResponse.ok()) {
      const businessData = await businessResponse.json();
      const business = businessData.businesses?.find((b: any) => b.name.includes('E2E Test Business'));
      
      if (business) {
        const businessSlug = business.slug || business.id;
        
        // Navigate to business page
        await page.goto(`${baseURL}/business/${businessSlug}`);
        
        // Login for review (can be any user, not necessarily business owner)
        await page.goto(`${baseURL}/login`);
        await page.getByRole('textbox', { name: /email/i }).fill(businessEmail!);
        await page.getByRole('textbox', { name: /password/i }).fill(businessPassword!);
        await page.getByRole('button', { name: /sign in/i }).click();
        
        await page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 20000 });
        
        // Return to business page
        await page.goto(`${baseURL}/business/${businessSlug}`);
        
        // Click write review
        await page.getByRole('button', { name: /write.*review/i }).click();
        
        // Fill review form
        await page.getByRole('radio', { name: '5' }).click(); // 5-star rating
        await page.getByRole('textbox', { name: /review/i }).fill('Excellent new business! Great to see it live on Sayso.');
        
        // Submit review
        await page.getByRole('button', { name: /submit|post/i }).click();
        
        // Verify review submission success
        await expect(page.getByText(/review.*submitted|thank you/i)).toBeVisible({ timeout: 15000 });
        
        // Verify review appears on business page
        await page.goto(`${baseURL}/business/${businessSlug}`);
        await expect(page.getByText(/excellent new business/i)).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('Business workflow state management validation', async ({ page }) => {
    test.setTimeout(60000);
    
    // Login as business owner to check dashboard
    await page.goto(`${baseURL}/login`);
    await page.getByRole('textbox', { name: /email/i }).fill(businessEmail!);
    await page.getByRole('textbox', { name: /password/i }).fill(businessPassword!);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 20000 });
    
    // Navigate to business dashboard
    await page.goto(`${baseURL}/business-dashboard`);
    
    // Verify business appears in owner's dashboard
    const testBusinessName = await page.evaluate(() => window.testBusinessName).catch(() => 'E2E Test Business');
    await expect(page.getByText(testBusinessName)).toBeVisible({ timeout: 10000 });
    
    // Verify business status shows as approved/live
    const businessCard = page.locator('.business-card', { has: page.getByText(testBusinessName) });
    await expect(businessCard).toBeVisible();
    
    // Check for approved/live status indicators
    const statusIndicators = ['approved', 'live', 'active', 'published'];
    let statusFound = false;
    
    for (const status of statusIndicators) {
      if (await businessCard.getByText(new RegExp(status, 'i')).isVisible()) {
        statusFound = true;
        break;
      }
    }
    
    if (!statusFound) {
      // Check for visual indicators like green badges, checkmarks, etc.
      const positiveIndicators = businessCard.locator('.bg-green, .text-green, .approved, .live');
      await expect(positiveIndicators.first()).toBeVisible();
    }
  });

  test('Admin dashboard business management functionality', async ({ page }) => {
    test.setTimeout(60000);
    
    // Login as admin
    await page.goto(`${baseURL}/login`);
    await page.getByRole('textbox', { name: /email/i }).fill(adminEmail!);
    await page.getByRole('textbox', { name: /password/i }).fill(adminPassword!);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 20000 });
    
    // Navigate to admin business management
    await page.goto(`${baseURL}/admin/businesses`);
    
    // Verify approved businesses section
    const testBusinessName = await page.evaluate(() => window.testBusinessName).catch(() => 'E2E Test Business');
    
    // Look for the test business in approved/live businesses list
    await expect(page.getByText(testBusinessName)).toBeVisible({ timeout: 10000 });
    
    // Test search functionality in admin
    if (await page.getByPlaceholder(/search/i).isVisible()) {
      await page.getByPlaceholder(/search/i).fill(testBusinessName);
      await page.getByPlaceholder(/search/i).press('Enter');
      await expect(page.getByText(testBusinessName)).toBeVisible();
    }
    
    // Test business details access
    const businessRow = page.locator('tr', { has: page.getByText(testBusinessName) });
    if (await businessRow.getByRole('button', { name: /view|details|edit/i }).isVisible()) {
      await businessRow.getByRole('button', { name: /view|details|edit/i }).first().click();
      
      // Verify business details page loads
      await expect(page.getByText(testBusinessName)).toBeVisible();
    }
  });
});