# Testing Guide: Business Claiming and Image Upload Workflow

## Prerequisites

1. **Supabase Setup**
   - Ensure Supabase project is running
   - Run all migrations (especially `20250114_append_business_images_function.sql`)
   - Verify `business-images` storage bucket exists and is public
   - Verify RLS policies are in place

2. **Test Accounts**
   - Create at least 2 test user accounts
   - One for business owner
   - One for admin (if testing approval flow)

3. **Test Images**
   - Prepare 5-10 test image files (JPG, PNG, WebP)
   - Mix of sizes: some < 1MB, some 2-4MB
   - At least one file > 5MB (for validation testing)

---

## Part 0: Testing Add New Business Flow

### Test 0.1: Create Business - Happy Path (No Images)

**Steps:**
1. Navigate to `/add-business`
2. Fill out required fields:
   - Business Name: "Test Restaurant"
   - Category: Select from dropdown (e.g., "Restaurant")
   - Location: "Cape Town, South Africa"
   - Business Type: "Physical Location"
3. Fill optional fields:
   - Description: "A test restaurant"
   - Address: "123 Test Street"
   - Phone: "+27 21 123 4567"
   - Email: "test@restaurant.com"
   - Website: "https://testrestaurant.com"
   - Price Range: "$$"
4. Click "Create Business" or "Submit"
5. Verify success message
6. Verify redirect to business profile or owner dashboard

**Expected Results:**
- ✅ Form validation passes
- ✅ Business created in database
- ✅ Business owner record created automatically
- ✅ Business stats initialized
- ✅ Slug generated from name
- ✅ Success toast appears
- ✅ Redirects to business page or owner dashboard

**Database Checks:**
```sql
-- Check business created
SELECT id, name, category, location, slug, owner_id, verified, status
FROM businesses
WHERE name = 'Test Restaurant'
ORDER BY created_at DESC
LIMIT 1;

-- Check owner record
SELECT * FROM business_owners
WHERE business_id = '<business_id>';

-- Check stats initialized
SELECT * FROM business_stats
WHERE business_id = '<business_id>';
```

---

### Test 0.2: Create Business with Images

**Steps:**
1. Navigate to `/add-business`
2. Fill out required fields (same as Test 0.1)
3. Select 3-5 images before submitting
4. Submit form
5. Monitor upload progress
6. Verify images uploaded and saved

**Expected Results:**
- ✅ Business created first
- ✅ Images uploaded to storage
- ✅ URLs saved to `uploaded_images` array
- ✅ First image is primary/cover image
- ✅ Images visible on business profile
- ✅ No orphaned files if DB update fails

**Database Check:**
```sql
SELECT uploaded_images, array_length(uploaded_images, 1) as image_count
FROM businesses
WHERE id = '<business_id>';
```

---

### Test 0.3: Form Validation - Required Fields

**Test 0.3a: Missing Business Name**

**Steps:**
1. Leave "Business Name" empty
2. Fill other required fields
3. Try to submit
4. Verify validation error

**Expected Results:**
- ✅ Error: "Business name is required"
- ✅ Form does not submit
- ✅ Error message visible

**Test 0.3b: Missing Category**

**Steps:**
1. Fill name but leave category empty
2. Try to submit
3. Verify validation error

**Expected Results:**
- ✅ Error: "Category is required"
- ✅ Form does not submit

**Test 0.3c: Missing Location (Physical Business)**

**Steps:**
1. Select "Physical Location" as business type
2. Leave location empty
3. Try to submit
4. Verify validation error

**Expected Results:**
- ✅ Error: "Location is required"
- ✅ Form does not submit

**Test 0.3d: Location Not Required (Online-Only Business)**

**Steps:**
1. Select "Online Only" as business type
2. Leave location empty
3. Fill other required fields
4. Submit form
5. Verify business created

**Expected Results:**
- ✅ No location error
- ✅ Business created successfully
- ✅ Location can be null for online-only businesses

---

### Test 0.4: Form Validation - Optional Fields

**Test 0.4a: Invalid Email Format**

**Steps:**
1. Enter invalid email (e.g., "notanemail")
2. Try to submit
3. Verify validation error

**Expected Results:**
- ✅ Error: "Please enter a valid email address"
- ✅ Form does not submit

**Test 0.4b: Invalid Website URL**

**Steps:**
1. Enter invalid website (e.g., "notawebsite")
2. Try to submit
3. Verify validation error

**Expected Results:**
- ✅ Error: "Please enter a valid website URL"
- ✅ Form does not submit

**Test 0.4c: Invalid Phone Number**

**Steps:**
1. Enter invalid phone (e.g., "abc123")
2. Try to submit
3. Verify validation error

**Expected Results:**
- ✅ Error: "Please enter a valid phone number"
- ✅ Form does not submit

**Test 0.4d: Invalid Coordinates**

**Steps:**
1. Enter latitude > 90 or < -90
2. Enter longitude > 180 or < -180
3. Try to submit
4. Verify validation error

**Expected Results:**
- ✅ Error: "Latitude must be between -90 and 90"
- ✅ Error: "Longitude must be between -180 and 180"
- ✅ Form does not submit

---

### Test 0.5: Slug Generation and Uniqueness

**Test 0.5a: Simple Slug Generation**

**Steps:**
1. Create business with name: "My Awesome Restaurant"
2. Verify slug generated
3. Check database

**Expected Results:**
- ✅ Slug: "my-awesome-restaurant"
- ✅ Special characters removed
- ✅ Spaces converted to hyphens
- ✅ Lowercase

**Test 0.5b: Duplicate Slug Handling**

**Steps:**
1. Create business: "Test Business"
2. Create another business: "Test Business"
3. Verify second business gets unique slug

**Expected Results:**
- ✅ First business: slug = "test-business"
- ✅ Second business: slug = "test-business-1"
- ✅ Third business: slug = "test-business-2"
- ✅ No duplicate slugs

**Database Check:**
```sql
SELECT name, slug FROM businesses
WHERE name LIKE 'Test Business%'
ORDER BY created_at;
```

**Test 0.5c: Special Characters in Name**

**Steps:**
1. Create business: "Joe's Café & Bar!"
2. Verify slug generation

**Expected Results:**
- ✅ Slug: "joes-cafe-bar"
- ✅ Special characters removed
- ✅ Apostrophes removed

---

### Test 0.6: Business Types

**Test 0.6a: Physical Location Business**

**Steps:**
1. Select "Physical Location" as business type
2. Fill location (required)
3. Fill address (optional)
4. Submit form
5. Verify business created

**Expected Results:**
- ✅ Location required
- ✅ Business created with location
- ✅ Can have address
- ✅ Can have coordinates

**Test 0.6b: Service Area Business**

**Steps:**
1. Select "Service Area" as business type
2. Fill location (required)
3. Submit form
4. Verify business created

**Expected Results:**
- ✅ Location required
- ✅ Business created
- ✅ May not have specific address

**Test 0.6c: Online-Only Business**

**Steps:**
1. Select "Online Only" as business type
2. Leave location empty
3. Fill other required fields
4. Submit form
5. Verify business created

**Expected Results:**
- ✅ Location not required
- ✅ Business created successfully
- ✅ Location can be null

---

### Test 0.7: Owner Assignment

**Steps:**
1. Create business as authenticated user
2. Verify owner automatically assigned
3. Check database records

**Expected Results:**
- ✅ `businesses.owner_id` = current user ID
- ✅ `business_owners` record created
- ✅ `business_owners.role` = 'owner'
- ✅ `business_owners.verified_at` = current timestamp
- ✅ User can immediately access owner dashboard

**Database Check:**
```sql
SELECT 
  b.id,
  b.name,
  b.owner_id,
  bo.user_id as owner_user_id,
  bo.role,
  bo.verified_at
FROM businesses b
JOIN business_owners bo ON b.id = bo.business_id
WHERE b.id = '<business_id>';
```

---

### Test 0.8: Business Stats Initialization

**Steps:**
1. Create new business
2. Check business_stats record

**Expected Results:**
- ✅ `business_stats` record created
- ✅ `total_reviews` = 0
- ✅ `average_rating` = 0.0
- ✅ `rating_distribution` = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
- ✅ `percentiles` = {}

**Database Check:**
```sql
SELECT * FROM business_stats
WHERE business_id = '<business_id>';
```

---

### Test 0.9: Image Upload During Business Creation

**Test 0.9a: Upload Valid Images**

**Steps:**
1. Create business form
2. Select 5 valid images (< 5MB each, JPG/PNG/WebP)
3. Submit form
4. Monitor upload progress

**Expected Results:**
- ✅ Images upload successfully
- ✅ URLs saved to `uploaded_images` array
- ✅ First image is primary
- ✅ All images visible on profile

**Test 0.9b: Upload Too Many Images**

**Steps:**
1. Create business form
2. Select 12 images (exceeds 10 limit)
3. Submit form
4. Verify limit enforcement

**Expected Results:**
- ✅ Only first 10 images uploaded
- ✅ Warning message: "Maximum 10 images allowed. Only the first 10 images were saved."
- ✅ Excess images not uploaded

**Test 0.9c: Upload Invalid Images**

**Steps:**
1. Create business form
2. Select invalid files (.pdf, .txt, >5MB)
3. Try to submit
4. Verify validation

**Expected Results:**
- ✅ Invalid files rejected
- ✅ Error message shown
- ✅ Only valid images uploaded (if any)

**Test 0.9d: Storage Upload Succeeds, DB Update Fails**

**Steps:**
1. Create business with images
2. Manually delete business record during upload (simulate DB failure)
3. Verify rollback behavior

**Expected Results:**
- ✅ Storage files cleaned up
- ✅ Error message: "Images uploaded but failed to save to database. Uploaded files have been removed."
- ✅ No orphaned files

---

### Test 0.10: Unauthorized Access

**Steps:**
1. Log out or use unauthenticated session
2. Try to access `/add-business`
3. Verify redirect or error

**Expected Results:**
- ✅ Redirects to login page
- ✅ Or shows "Unauthorized" error
- ✅ Cannot create business without authentication

**API Test:**
```bash
POST /api/businesses
# Without authentication token
```

**Expected Results:**
- ✅ 401 Unauthorized
- ✅ Error: "Unauthorized. Please log in to create a business."

---

### Test 0.11: Business Creation Failure Scenarios

**Test 0.11a: Database Insert Failure**

**Steps:**
1. Create business with invalid data (e.g., too long name)
2. Try to submit
3. Verify error handling

**Expected Results:**
- ✅ Error message shown
- ✅ No partial business created
- ✅ User can retry

**Test 0.11b: Owner Record Creation Failure**

**Steps:**
1. Create business successfully
2. Simulate `business_owners` insert failure
3. Verify cleanup

**Expected Results:**
- ✅ Business record deleted (rollback)
- ✅ Error: "Failed to assign ownership"
- ✅ No orphaned business record

**Note:** This is handled in API code (lines 1583-1590)

---

### Test 0.12: Business Hours and Specials

**Steps:**
1. Create business form
2. Fill business hours for each day
3. Add specials/offers
4. Submit form
5. Verify data saved

**Expected Results:**
- ✅ Hours saved correctly
- ✅ Specials saved
- ✅ Data visible on business profile

**Database Check:**
```sql
SELECT hours FROM businesses
WHERE id = '<business_id>';
-- Should return JSON object with hours
```

---

### Test 0.13: Redirect After Creation

**Test 0.13a: Owner Intent**

**Steps:**
1. Create business with `intent: 'owner'`
2. Submit form
3. Verify redirect

**Expected Results:**
- ✅ Redirects to `/owners/businesses/{businessId}`
- ✅ Owner dashboard loads

**Test 0.13b: Public Intent**

**Steps:**
1. Create business with `intent: 'public'` or no intent
2. Submit form
3. Verify redirect

**Expected Results:**
- ✅ Redirects to `/business/{businessId}`
- ✅ Public business profile loads

---

### Test 0.14: Complete Workflow - Business Creation with Images

**Steps:**
1. Navigate to `/add-business`
2. Fill all required fields
3. Fill optional fields (email, phone, website)
4. Select 5 images
5. Add business hours
6. Add 2 specials
7. Submit form
8. Verify:
   - Business created
   - Images uploaded
   - Owner assigned
   - Stats initialized
   - Redirect works
   - All data visible on profile

**Expected Results:**
- ✅ All steps complete successfully
- ✅ All data saved correctly
- ✅ Images display properly
- ✅ Business profile shows all information
- ✅ Owner can access dashboard

---

## Part 1: Testing Business Claiming Flow

### Test 1.1: Search and Claim Business (Happy Path)

**Steps:**
1. Navigate to `/claim-business` or `/for-businesses`
2. Search for an existing business (type at least 2 characters)
3. Verify business appears in results
4. Click "Claim this business" button
5. Fill out claim form:
   - Select role: "Owner" or "Manager"
   - Enter email (required)
   - Enter phone (optional)
   - Add notes (optional)
6. Click "Submit Claim"
7. Verify success message appears
8. Verify claim request created in database

**Expected Results:**
- ✅ Business search returns results
- ✅ Claim modal opens
- ✅ Form validation works (email required)
- ✅ Success toast appears
- ✅ `business_ownership_requests` table has new record with status='pending'

**Database Check:**
```sql
SELECT * FROM business_ownership_requests 
WHERE user_id = '<test_user_id>' 
ORDER BY created_at DESC 
LIMIT 1;
```

---

### Test 1.2: Claim Already Claimed Business

**Steps:**
1. Search for a business that's already claimed
2. Verify status badge shows "Business already claimed"
3. Click "Claim this business"
4. Verify appropriate message/behavior

**Expected Results:**
- ✅ Status badge visible
- ✅ Claim button disabled or shows appropriate message
- ✅ Cannot submit duplicate claim

---

### Test 1.3: Claim Business You Already Own

**Steps:**
1. As a user who already owns a business
2. Search for that business
3. Verify button shows "Go to dashboard"
4. Click button
5. Verify redirects to `/owners/businesses/{businessId}`

**Expected Results:**
- ✅ Button text changes to "Go to dashboard"
- ✅ Redirects to owner dashboard
- ✅ No duplicate claim created

---

### Test 1.4: Claim with Pending Request

**Steps:**
1. Submit a claim request for a business
2. Try to claim the same business again
3. Verify "Claim pending review" message

**Expected Results:**
- ✅ Cannot create duplicate pending request
- ✅ Shows "Claim pending review" status
- ✅ Button disabled

---

### Test 1.5: Admin Approval Flow

**Steps:**
1. As admin, find pending claim request
2. Approve the claim via API or admin panel
3. Verify `business_owners` record created
4. Verify claim status updated to 'approved'
5. As business owner, verify access to dashboard

**API Test:**
```bash
POST /api/businesses/claims/{claim_id}/approve
Authorization: Bearer <admin_token>
```

**Expected Results:**
- ✅ `business_owners` table has new record
- ✅ `business_ownership_requests.status` = 'approved'
- ✅ Owner can access `/owners/businesses/{businessId}`
- ✅ Approval email sent (check logs)

**Database Check:**
```sql
-- Check business owner created
SELECT * FROM business_owners 
WHERE business_id = '<business_id>' 
AND user_id = '<owner_user_id>';

-- Check claim status
SELECT status FROM business_ownership_requests 
WHERE id = '<claim_id>';
```

---

## Part 2: Testing Image Upload Flow

### Test 2.1: Upload Images During Business Creation (Happy Path)

**Steps:**
1. Navigate to `/add-business`
2. Fill out business form
3. Select 3-5 images (all valid, < 5MB each)
4. Submit form
5. Monitor network tab for upload progress
6. Verify success message
7. Check business profile page for images

**Expected Results:**
- ✅ Images upload successfully
- ✅ URLs saved to `businesses.uploaded_images` array
- ✅ Images visible on business profile
- ✅ First image is primary/cover image
- ✅ No orphaned files in storage

**Database Check:**
```sql
SELECT uploaded_images FROM businesses 
WHERE id = '<business_id>';
-- Should return array of URLs
```

**Storage Check:**
- Verify files exist in `business-images` bucket
- Path format: `{businessId}/{businessId}_{index}_{timestamp}.{ext}`

---

### Test 2.2: Upload Images After Claiming (Owner Dashboard)

**Steps:**
1. As business owner, navigate to `/owners/businesses/{businessId}`
2. Go to edit page or image upload section
3. Select 2-3 images
4. Upload images
5. Verify images appear in gallery
6. Verify images saved to database

**API Test:**
```bash
POST /api/businesses/{businessId}/images
Authorization: Bearer <owner_token>
Content-Type: application/json

{
  "images": [
    { "url": "https://..." },
    { "url": "https://..." }
  ]
}
```

**Expected Results:**
- ✅ Images appended to existing array
- ✅ All images visible (old + new)
- ✅ No duplicates
- ✅ Images ordered correctly

---

### Test 2.3: Image Limit Enforcement (10 Images Max)

**Test 2.3a: Try to Upload More Than 10 Images**

**Steps:**
1. Business already has 8 images
2. Try to upload 5 more images (would be 13 total)
3. Verify error message
4. Verify only 2 images added (to reach 10)

**Expected Results:**
- ✅ Error: "Only 2 image(s) can be added. Maximum limit is 10 images."
- ✅ Only 2 images added
- ✅ Total remains at 10 images

**Test 2.3b: Business Already Has 10 Images**

**Steps:**
1. Business has exactly 10 images
2. Try to upload 1 more image
3. Verify error message

**Expected Results:**
- ✅ Error: "Maximum image limit reached (10 images). Please delete some images before adding new ones."
- ✅ No new images added

**Database Check:**
```sql
SELECT array_length(uploaded_images, 1) as image_count 
FROM businesses 
WHERE id = '<business_id>';
-- Should never exceed 10
```

---

### Test 2.4: Invalid Image Files

**Test 2.4a: File Too Large (> 5MB)**

**Steps:**
1. Select image file > 5MB
2. Try to upload
3. Verify validation error

**Expected Results:**
- ✅ Error: "File size exceeds 5MB limit"
- ✅ File not uploaded
- ✅ No storage file created

**Test 2.4b: Invalid File Type**

**Steps:**
1. Select non-image file (e.g., .pdf, .txt)
2. Try to upload
3. Verify validation error

**Expected Results:**
- ✅ Error: "Invalid file type. Only JPG, PNG, WebP, GIF allowed"
- ✅ File not uploaded

**Test 2.4c: Corrupted Image File**

**Steps:**
1. Select corrupted image file (rename .txt to .jpg)
2. Try to upload
3. Verify behavior

**Expected Results:**
- ✅ May pass client validation
- ✅ Upload may succeed but image won't display
- ✅ Browser shows broken image icon

---

### Test 2.5: Storage Upload Succeeds, Database Update Fails

**Steps:**
1. Upload images normally
2. Manually delete business record from database (simulate DB failure)
3. Try to save images
4. Verify rollback behavior

**Expected Results:**
- ✅ Storage files deleted (rollback)
- ✅ Error message: "Business was deleted during upload. Uploaded files have been removed."
- ✅ No orphaned files in storage

**Storage Check:**
```bash
# Check storage bucket - should be empty for this business
# Or verify files were removed
```

---

### Test 2.6: Concurrent Image Uploads (Race Condition Test)

**Steps:**
1. Open two browser tabs/windows
2. As same user, upload different images to same business simultaneously
3. Submit both requests at nearly the same time
4. Verify both images saved
5. Verify no data loss

**Expected Results:**
- ✅ Both images appear in array
- ✅ No images lost
- ✅ Array contains all uploaded images
- ✅ If using `append_business_images()` function, should work perfectly
- ✅ If using fallback, may have minor race condition (acceptable)

**Database Check:**
```sql
-- Check final array length
SELECT array_length(uploaded_images, 1) as count, uploaded_images 
FROM businesses 
WHERE id = '<business_id>';
-- Should have both images
```

---

### Test 2.7: Business Deleted During Upload

**Steps:**
1. Start uploading images
2. In another session, delete the business
3. Complete image upload
4. Verify cleanup behavior

**Expected Results:**
- ✅ Business existence check catches deletion
- ✅ Storage files cleaned up
- ✅ Error message shown to user
- ✅ No orphaned files or URLs

---

### Test 2.8: Delete Image

**Steps:**
1. Business has multiple images
2. Delete one image (not primary)
3. Verify image removed from array
4. Verify storage file deleted
5. Verify other images still present

**API Test:**
```bash
DELETE /api/businesses/{businessId}/images/{imageUrl}
Authorization: Bearer <owner_token>
```

**Expected Results:**
- ✅ Image URL removed from array
- ✅ Storage file deleted
- ✅ Other images remain
- ✅ Primary image unchanged (if not deleted)

**Database Check:**
```sql
SELECT uploaded_images FROM businesses 
WHERE id = '<business_id>';
-- Should have one less URL
```

---

### Test 2.9: Delete Primary Image

**Steps:**
1. Business has multiple images
2. Delete the first image (primary)
3. Verify next image becomes primary
4. Verify array updated correctly

**Expected Results:**
- ✅ First image removed
- ✅ Second image becomes primary (index 0)
- ✅ All other images shift down
- ✅ Business card/profile shows new primary image

---

### Test 2.10: Network Interruption During Upload

**Steps:**
1. Start uploading large image
2. Disconnect network mid-upload
3. Verify error handling
4. Reconnect and verify state

**Expected Results:**
- ✅ Upload fails gracefully
- ✅ Error message shown
- ✅ No partial state saved
- ✅ Can retry upload

---

## Part 3: Edge Cases and Error Scenarios

### Test 3.1: Unauthorized Access

**Steps:**
1. As non-owner, try to upload images to business
2. Verify 403 error

**API Test:**
```bash
POST /api/businesses/{businessId}/images
Authorization: Bearer <non_owner_token>
```

**Expected Results:**
- ✅ 403 Forbidden error
- ✅ Error: "You do not have permission to add images to this business"
- ✅ No images uploaded

---

### Test 3.2: Business Not Found

**Steps:**
1. Try to upload images to non-existent business ID
2. Verify 404 error

**Expected Results:**
- ✅ 404 Not Found error
- ✅ Error: "Business not found"
- ✅ No images uploaded

---

### Test 3.3: Empty Image Array

**Steps:**
1. Try to upload empty array
2. Verify validation error

**Expected Results:**
- ✅ 400 Bad Request
- ✅ Error: "Images array is required"

---

### Test 3.4: Invalid Image URLs

**Steps:**
1. Try to upload with invalid/malformed URLs
2. Verify validation

**Expected Results:**
- ✅ Invalid URLs filtered out
- ✅ Only valid URLs saved
- ✅ Error if no valid URLs remain

---

## Part 4: Performance Testing

### Test 4.1: Upload Multiple Large Images

**Steps:**
1. Upload 5 images, each ~4MB
2. Monitor upload time
3. Verify all upload successfully

**Expected Results:**
- ✅ All images upload within reasonable time
- ✅ Progress indicators work (if implemented)
- ✅ No timeout errors

---

### Test 4.2: Rapid Sequential Uploads

**Steps:**
1. Upload image
2. Immediately upload another
3. Repeat 5 times
4. Verify all saved correctly

**Expected Results:**
- ✅ All images saved
- ✅ No race conditions
- ✅ Array contains all images in order

---

## Part 5: Integration Testing

### Test 5.1: Complete Workflow - Add Business

**Steps:**
1. Create new user account
2. Navigate to `/add-business`
3. Fill out complete business form
4. Upload 5 images
5. Submit form
6. Verify business created
7. Verify owner assigned
8. Verify images uploaded
9. Edit business details
10. Delete 1 image
11. Upload 2 more images
12. Verify final state

**Expected Results:**
- ✅ All steps complete successfully
- ✅ Business has correct owner
- ✅ Images display correctly (6 total after delete/add)
- ✅ Business profile shows updated info
- ✅ Owner can access dashboard

### Test 5.2: Complete Workflow - Claim Existing Business

**Steps:**
1. Create new business account
2. Search for existing business
3. Claim business
4. Wait for/admin approves claim
5. Upload 5 images
6. Edit business details
7. Delete 1 image
8. Upload 2 more images
9. Verify final state

**Expected Results:**
- ✅ All steps complete successfully
- ✅ Business has correct owner
- ✅ Images display correctly
- ✅ Business profile shows updated info

---

## Part 6: Database Verification Queries

### Useful SQL Queries for Testing

```sql
-- Check business ownership
SELECT 
  b.id,
  b.name,
  b.uploaded_images,
  array_length(b.uploaded_images, 1) as image_count,
  bo.user_id as owner_id,
  bo.role,
  bo.verified_at
FROM businesses b
LEFT JOIN business_owners bo ON b.id = bo.business_id
WHERE b.id = '<business_id>';

-- Check pending claims
SELECT 
  bor.id,
  bor.business_id,
  bor.user_id,
  bor.status,
  bor.created_at,
  b.name as business_name
FROM business_ownership_requests bor
JOIN businesses b ON bor.business_id = b.id
WHERE bor.status = 'pending'
ORDER BY bor.created_at DESC;

-- Check image count per business
SELECT 
  id,
  name,
  array_length(uploaded_images, 1) as image_count,
  uploaded_images
FROM businesses
WHERE uploaded_images IS NOT NULL
ORDER BY array_length(uploaded_images, 1) DESC;

-- Find businesses with too many images (shouldn't happen)
SELECT 
  id,
  name,
  array_length(uploaded_images, 1) as image_count
FROM businesses
WHERE array_length(uploaded_images, 1) > 10;
```

---

## Part 7: Automated Testing (Optional)

### API Test Script Example

```typescript
// test-business-claim-and-images.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Business Claim and Image Upload', () => {
  test('complete workflow', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // 2. Search for business
    await page.goto('/claim-business');
    await page.fill('input[type="text"]', 'Test Business');
    await page.waitForSelector('.business-result');
    
    // 3. Claim business
    await page.click('button:has-text("Claim this business")');
    await page.fill('[name="email"]', 'owner@business.com');
    await page.click('button:has-text("Submit Claim")');
    await expect(page.locator('.toast-success')).toBeVisible();
    
    // 4. Upload images (after approval)
    await page.goto('/owners/businesses/{businessId}');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(['test-image-1.jpg', 'test-image-2.jpg']);
    await page.click('button:has-text("Upload")');
    await expect(page.locator('.image-gallery img')).toHaveCount(2);
  });
});
```

---

## Part 8: Manual Testing Checklist

### Quick Smoke Test Checklist

**Add Business:**
- [ ] Can access `/add-business` page
- [ ] Form validation works (required fields)
- [ ] Can create business without images
- [ ] Can create business with images
- [ ] Slug generation works correctly
- [ ] Owner automatically assigned
- [ ] Business stats initialized
- [ ] Redirect works after creation

**Claim Business:**
- [ ] Can search for businesses
- [ ] Can submit claim request
- [ ] Claim approval works

**Image Upload:**
- [ ] Can upload images during business creation
- [ ] Can upload images after claiming
- [ ] Image limit (10) enforced
- [ ] Invalid files rejected
- [ ] Images display correctly
- [ ] Can delete images
- [ ] Storage cleanup works on errors
- [ ] Concurrent uploads don't lose data

---

## Troubleshooting

### Common Issues

1. **Images not uploading**
   - Check storage bucket exists and is public
   - Check RLS policies allow uploads
   - Check file size limits
   - Check network connectivity

2. **Images not displaying**
   - Check URLs are valid
   - Check storage bucket is public
   - Check CORS settings
   - Check image URLs in database

3. **Race condition issues**
   - Verify `append_business_images()` function exists
   - Check function is being called
   - Review database logs

4. **Limit not enforced**
   - Verify function has correct limit (10)
   - Check API validation
   - Check frontend validation

---

## Test Data Setup

### Create Test Business

```sql
-- Option 1: Create via API (recommended - includes owner and stats)
-- Use POST /api/businesses endpoint

-- Option 2: Create manually (for testing edge cases)
INSERT INTO businesses (
  id,
  name,
  category,
  location,
  address,
  owner_id,
  slug,
  verified,
  status
) VALUES (
  gen_random_uuid(),
  'Test Business',
  'Restaurant',
  'Cape Town, South Africa',
  '123 Test Street',
  '<test_user_id>',
  'test-business',
  false,
  'active'
);

-- Create owner record
INSERT INTO business_owners (
  business_id,
  user_id,
  role,
  verified_at
) VALUES (
  '<business_id>',
  '<test_user_id>',
  'owner',
  NOW()
);

-- Initialize stats
INSERT INTO business_stats (
  business_id,
  total_reviews,
  average_rating,
  rating_distribution,
  percentiles
) VALUES (
  '<business_id>',
  0,
  0.0,
  '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb,
  '{}'::jsonb
);
```

### Create Test Claim Request

```sql
INSERT INTO business_ownership_requests (
  business_id,
  user_id,
  status,
  verification_method,
  verification_data
) VALUES (
  '<business_id>',
  '<user_id>',
  'pending',
  'manual',
  '{"role": "owner", "email": "test@example.com"}'::jsonb
);
```

---

## Success Criteria

**Add Business:**
✅ All form validations work
✅ Business created with correct data
✅ Owner automatically assigned
✅ Stats initialized
✅ Slug generation unique
✅ Images upload correctly
✅ Redirect works after creation

**Claim Business:**
✅ Claim requests created correctly
✅ Approval flow works
✅ Owner assigned after approval

**Image Upload:**
✅ All tests pass
✅ No orphaned files in storage
✅ No data loss in concurrent scenarios
✅ Image limit enforced consistently
✅ Error messages are user-friendly
✅ Database state is consistent
✅ Storage cleanup works correctly

