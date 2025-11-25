# Review Submission Error Fix

## Problem
You were getting this error:
```
Error creating review: {
  code: 'PGRST200',
  details: "Searched for a foreign key relationship between 'reviews' and 'users'...",
  message: "Could not find a relationship between 'reviews' and 'users' in the schema cache"
}
```

## Root Causes
1. **Wrong Foreign Key Reference**: Reviews table referenced `auth.users` instead of `profiles`
2. **Wrong Join in Queries**: Code tried to join with non-existent `users` table
3. **Wrong Storage Bucket Name**: Code used `review-images` instead of `review_images`

## Fixes Applied

### 1. ✅ Updated Service Layer Queries
**Files Changed:**
- `src/app/lib/services/reviewService.ts`
- `src/app/lib/services/businessService.ts`

**What Changed:**
```typescript
// OLD (wrong)
user:users (
  id,
  name,
  avatar_url
)

// NEW (correct)
profile:profiles!reviews_user_id_fkey (
  user_id,
  display_name,
  avatar_url
)
```

### 2. ✅ Fixed Storage Bucket Name
**File Changed:** `src/app/lib/services/reviewService.ts`

**What Changed:**
```typescript
// OLD
.from('review-images')

// NEW  
.from('review_images')
```

Also updated file path structure:
```typescript
// OLD: review-images/reviewId_0.jpg
// NEW: reviewId/reviewId_0.jpg  (organized by review ID)
```

### 3. 📋 Database Migration Needed
**Run these SQL scripts in your Supabase SQL Editor:**

#### Step 1: Fix Foreign Key Constraint
**File:** `src/app/lib/migrations/003_reviews/002_fix-reviews-foreign-key.sql`

```sql
-- Drop the old foreign key constraint to auth.users
ALTER TABLE reviews 
DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;

-- Add new foreign key constraint to profiles table
ALTER TABLE reviews 
ADD CONSTRAINT reviews_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(user_id) 
ON DELETE CASCADE;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
```

#### Step 2: Update Storage Bucket Configuration
**File:** `src/app/lib/migrations/003_reviews/003_update-bucket-name.sql`

This ensures your `review_images` bucket has the correct policies and configuration.

## Steps to Fix Your Database

### Option A: Run Migration Files (Recommended)
1. Open your Supabase SQL Editor
2. Copy and run `002_fix-reviews-foreign-key.sql`
3. Copy and run `003_update-bucket-name.sql`
4. Restart your Next.js dev server

### Option B: Quick Fix (Manual)
1. Open Supabase SQL Editor
2. Run this command:
```sql
-- Fix the foreign key
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
```

3. Verify your storage bucket is named `review_images` (with underscore) in Storage dashboard
4. Restart your Next.js dev server

## Verify the Fix

### Test Review Submission:
1. Navigate to a business page
2. Click "Write Review"
3. Fill out the review form
4. Optionally add images
5. Submit

### Expected Result:
✅ Review submits successfully
✅ Images upload to `review_images` bucket
✅ Success toast notification appears
✅ Redirect to business page
✅ Review appears in the reviews list

## Additional Notes

### Storage Bucket Structure
```
review_images/
  ├── {review-id-1}/
  │   ├── {review-id-1}_0.jpg
  │   ├── {review-id-1}_1.png
  │   └── ...
  ├── {review-id-2}/
  │   └── {review-id-2}_0.webp
  └── ...
```

### RLS Policies
Make sure these policies exist on `storage.objects`:
- ✅ Public can view review images
- ✅ Authenticated users can upload review images  
- ✅ Users can delete their own review images

### Foreign Key Relationship
```
reviews.user_id → profiles.user_id → auth.users.id
```

This ensures proper cascading and relationship handling.

## Troubleshooting

### Still Getting Errors?

1. **Check profiles table exists:**
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'profiles';
```

2. **Check foreign key constraint:**
```sql
SELECT constraint_name, table_name 
FROM information_schema.table_constraints 
WHERE constraint_name = 'reviews_user_id_fkey';
```

3. **Check bucket exists:**
- Go to Supabase Dashboard → Storage
- Verify bucket named `review_images` exists
- Check it's set to Public

4. **Clear Supabase cache:**
```sql
NOTIFY pgrst, 'reload schema';
```

Then restart your dev server.

## Summary
✅ Code updated to use `profiles` instead of `users`  
✅ Storage bucket name corrected to `review_images`  
✅ File organization improved  
📋 Database migration scripts ready to run  

**Next Step:** Run the migration SQL scripts in your Supabase SQL Editor!

