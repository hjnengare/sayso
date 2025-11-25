# Backend Implementation Plan - Reviewer End-User Features

This document focuses specifically on backend work needed for regular users who are reviewers (excluding business ownership/claiming features).

## 🎯 Critical Missing Features for Reviewers

### 1. Review Edit (Update) API ⚠️ MISSING
**Status:** Frontend may have UI, but no API endpoint  
**Priority:** HIGH

**Required Endpoint:**
- `PUT /api/reviews/[id]/route.ts` - Update existing review

**Implementation Details:**
```typescript
// Request body
{
  rating?: number (1-5)
  title?: string
  content?: string
  tags?: string[]
  images?: File[] // Optional: replace existing images
}

// Authorization:
// - User must own the review (user_id matches)
// - Check if review exists
// - Validate all input fields
```

**Database Actions:**
- Update `reviews` table with new data
- If images provided: delete old images from storage, upload new ones
- Update `business_stats` via RPC function
- Update `updated_at` timestamp

**Current State:**
- Database RLS policy exists for updating own reviews (migration 003_reviews/008_optimize-rls-policies.sql)
- No API endpoint exists
- Frontend `ReviewService.updateReview()` exists in client-side service but needs API

---

### 2. Review Delete API ⚠️ MISSING  
**Status:** Frontend simulates deletion  
**Priority:** HIGH

**Required Endpoint:**
- `DELETE /api/reviews/[id]/route.ts` - Delete review

**Implementation Details:**
```typescript
// Authorization:
// - User must own the review (user_id matches)
// - Check if review exists
```

**Database Actions:**
- Delete all associated `review_images` records
- Delete image files from Supabase Storage (`review_images` bucket)
- Delete the review from `reviews` table (cascade will handle related data)
- Update `business_stats` via RPC function (`update_business_stats`)

**Current State:**
- Database has RLS policy for deleting own reviews
- `ReviewService.deleteReview()` exists in client service but needs API
- Frontend `useReviews` hook simulates deletion (line 211-237)

---

### 3. Mark Review as Helpful (Vote) API ⚠️ MISSING
**Status:** Frontend simulates this feature  
**Priority:** HIGH

**Required Endpoints:**
- `POST /api/reviews/[id]/helpful/route.ts` - Toggle helpful vote
- `GET /api/reviews/[id]/helpful/route.ts` - Check if user voted helpful

**Implementation Details:**
```typescript
// POST /api/reviews/[id]/helpful
// Request: empty body (toggle action)
// Response: { has_voted: boolean, helpful_count: number }

// GET /api/reviews/[id]/helpful  
// Response: { has_voted: boolean }
```

**Database Schema Needed:**
```sql
CREATE TABLE review_helpful_votes (
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (review_id, user_id)
);

CREATE INDEX idx_review_helpful_votes_review ON review_helpful_votes(review_id);
CREATE INDEX idx_review_helpful_votes_user ON review_helpful_votes(user_id);

-- RLS Policies
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can vote on reviews"
  ON review_helpful_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their votes"
  ON review_helpful_votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can see all votes"
  ON review_helpful_votes
  FOR SELECT
  TO authenticated
  USING (true);
```

**Implementation Logic:**
- On POST: Check if vote exists
  - If exists: DELETE vote, decrement `helpful_count` in reviews table
  - If not exists: INSERT vote, increment `helpful_count`
- Update `reviews.helpful_count` accordingly
- Return current vote status and count

**Current State:**
- Frontend has `likeReview()` in `useReviews` hook (line 239-262) that simulates this
- `ReviewService` has `updateReviewHelpfulCount()` method but no API
- Database `reviews` table has `helpful_count` column but no vote tracking

---

### 4. Saved/Bookmarked Businesses API ⚠️ MISSING
**Status:** Frontend uses localStorage only, no persistence  
**Priority:** MEDIUM-HIGH

**Required Endpoints:**
- `POST /api/saved/businesses/route.ts` - Save business
- `DELETE /api/saved/businesses/[id]/route.ts` - Unsave business
- `GET /api/saved/businesses/route.ts` - List saved businesses (paginated)

**Implementation Details:**
```typescript
// POST /api/saved/businesses
// Request: { business_id: string }
// Response: { success: true, business_id: string }

// DELETE /api/saved/businesses/[id]
// Response: { success: true }

// GET /api/saved/businesses
// Query params: ?limit=20&offset=0
// Response: { businesses: Business[], count: number, total: number }
```

**Database Schema Needed:**
```sql
CREATE TABLE saved_businesses (
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, business_id)
);

CREATE INDEX idx_saved_businesses_user ON saved_businesses(user_id);
CREATE INDEX idx_saved_businesses_business ON saved_businesses(business_id);
CREATE INDEX idx_saved_businesses_created ON saved_businesses(created_at DESC);

-- RLS Policies
ALTER TABLE saved_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can save businesses"
  ON saved_businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave businesses"
  ON saved_businesses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their saved businesses"
  ON saved_businesses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

**Implementation Logic:**
- POST: Check if already saved, if not insert
- DELETE: Remove record
- GET: Join with businesses table, return full business data

**Current State:**
- `SavedItemsContext` exists but uses localStorage only (line 34-58)
- No API endpoints exist
- No database table exists

---

### 5. Get User's Own Reviews API 🔍 NEEDS VERIFICATION
**Status:** May exist but needs verification  
**Priority:** MEDIUM

**Required Endpoint:**
- `GET /api/reviews?user_id=<current_user_id>` - Should already work

**Current State:**
- `GET /api/reviews/route.ts` exists (line 180-234)
- Has `businessId` filter but needs to verify `user_id` filter works
- Profile page shows empty reviews array (line 405)

**Action Needed:**
- Verify if `GET /api/reviews?user_id=X` works
- If not, add `user_id` query param support
- Update profile page to fetch user's reviews

---

### 6. Get User's Saved Businesses Count 🔍 NEEDS VERIFICATION
**Status:** Count displayed in UI but may not be accurate  
**Priority:** LOW

**Required:**
- When saved businesses API is implemented, ensure count is accurate
- Update `SavedItemsContext` to sync with backend

---

## 🛠️ Supporting Infrastructure

### 7. Input Validation for Review Endpoints ⚠️ PARTIAL
**Status:** Basic validation exists, needs enhancement  
**Priority:** MEDIUM

**Required:**
- Add Zod schema validation for:
  - `PUT /api/reviews/[id]` - Review update payload
  - `POST /api/reviews/[id]/helpful` - Ensure review exists
  - `POST /api/saved/businesses` - Business ID validation
- Validate:
  - Rating: 1-5 integer
  - Content: min length, max length (e.g., 10-5000 chars)
  - Title: max length (e.g., 200 chars)
  - Tags: array of strings, max items
  - Image files: type, size limits

---

### 8. Error Handling & Response Standardization ⚠️ INCONSISTENT
**Status:** Some endpoints have good error handling, others don't  
**Priority:** MEDIUM

**Required:**
- Standardize all API responses:
  ```typescript
  {
    success: boolean
    data?: any
    error?: string
    message?: string
  }
  ```
- Consistent error codes:
  - 400: Bad request (validation errors)
  - 401: Unauthorized
  - 403: Forbidden (not owner)
  - 404: Not found
  - 500: Internal server error

---

### 9. Rate Limiting for Review Endpoints ⚠️ MISSING
**Status:** No rate limiting on review operations  
**Priority:** HIGH

**Required:**
- Rate limit `POST /api/reviews` - Prevent spam
- Rate limit `POST /api/reviews/[id]/helpful` - Prevent vote manipulation
- Rate limit `PUT /api/reviews/[id]` - Prevent abuse
- Rate limit `DELETE /api/reviews/[id]` - Prevent mass deletion

**Suggested Limits:**
- Create review: 10 per hour
- Update review: 20 per hour
- Delete review: 5 per hour
- Vote helpful: 100 per hour
- Save business: 50 per hour

---

## 📊 Database Migrations Needed

### Migration 1: Review Helpful Votes Table
**File:** `src/app/lib/migrations/003_reviews/006_review-helpful-votes.sql`

```sql
-- Create review_helpful_votes table
-- Add indexes and RLS policies
-- Update reviews.helpful_count to be calculated from votes (or keep both)
```

### Migration 2: Saved Businesses Table  
**File:** `src/app/lib/migrations/004_user/001_saved-businesses.sql`

```sql
-- Create saved_businesses table
-- Add indexes and RLS policies
```

---

## ✅ Testing Requirements

### Unit Tests Needed:
- Review update endpoint
- Review delete endpoint
- Review helpful vote endpoint
- Saved businesses CRUD endpoints

### Integration Tests Needed:
- User can only edit/delete their own reviews
- Review stats update correctly after edit/delete
- Helpful votes increment/decrement correctly
- Saved businesses persist across sessions

---

## 📝 Implementation Priority

### Phase 1: Critical (Week 1) - Must Have
1. ✅ Review Delete API (`DELETE /api/reviews/[id]`)
2. ✅ Review Edit API (`PUT /api/reviews/[id]`)
3. ✅ Review Helpful Votes API (`POST /api/reviews/[id]/helpful`)
4. ✅ Rate limiting on review endpoints

### Phase 2: High Priority (Week 2) - Should Have
5. ✅ Saved Businesses API (all endpoints)
6. ✅ Verify user's reviews endpoint works
7. ✅ Input validation with Zod
8. ✅ Error response standardization

### Phase 3: Nice to Have (Week 3) - Could Have
9. ✅ Enhanced error messages
10. ✅ Better logging
11. ✅ Performance optimizations

---

## 🎯 Summary

**Total Missing Endpoints:** 6 endpoints
- `PUT /api/reviews/[id]` - Edit review
- `DELETE /api/reviews/[id]` - Delete review  
- `POST /api/reviews/[id]/helpful` - Vote helpful
- `GET /api/reviews/[id]/helpful` - Check vote status
- `POST /api/saved/businesses` - Save business
- `DELETE /api/saved/businesses/[id]` - Unsave business
- `GET /api/saved/businesses` - List saved

**Database Tables Needed:** 2 tables
- `review_helpful_votes`
- `saved_businesses`

**Estimated Timeline:** 1-2 weeks for Phase 1 & 2 with 1 developer

---

## 📚 Related Files

**Frontend Files Using These Features:**
- `src/app/hooks/useReviews.ts` - Review operations (delete, like)
- `src/app/components/Reviews/ReviewCard.tsx` - Delete review button
- `src/app/contexts/SavedItemsContext.tsx` - Saved businesses (localStorage)
- `src/app/profile/page.tsx` - User's reviews display

**Backend Files to Create/Modify:**
- `src/app/api/reviews/[id]/route.ts` - NEW: PUT and DELETE
- `src/app/api/reviews/[id]/helpful/route.ts` - NEW: POST and GET
- `src/app/api/saved/businesses/route.ts` - NEW: POST and GET
- `src/app/api/saved/businesses/[id]/route.ts` - NEW: DELETE

Here’s your entire backend implementation plan turned into a **clean, high-level TODO list** you can paste directly into Linear / Jira / Notion.

---

# ✅ **HIGH-LEVEL BACKEND TODO LIST – Reviewer Features**

## **🔵 Phase 1 — Critical (Week 1)**

### **Implement Missing Review Endpoints**

* [ ] **Create Edit Review API** (`PUT /api/reviews/[id]`)
* [ ] **Create Delete Review API** (`DELETE /api/reviews/[id]`)
* [ ] **Create Helpful Vote Toggle API** (`POST /api/reviews/[id]/helpful`)
* [ ] **Create Helpful Vote Status API** (`GET /api/reviews/[id]/helpful`)

### **Add Rate Limiting**

* [ ] Add rate limits for:

  * Creating reviews
  * Updating reviews
  * Deleting reviews
  * Helpful votes
  * Saving businesses

---

## **🟡 Phase 2 — High Priority (Week 2)**

### **Saved Businesses (Bookmarks) System**

* [ ] Create `saved_businesses` table + RLS policies
* [ ] Implement Save API (`POST /api/saved/businesses`)
* [ ] Implement Unsave API (`DELETE /api/saved/businesses/[id]`)
* [ ] Implement List Saved API (`GET /api/saved/businesses`)

### **Fix/Verify Existing Endpoints**

* [ ] Verify `GET /api/reviews?user_id=` returns current user's reviews
* [ ] Update Profile page query if needed
* [ ] Sync saved items count with backend instead of localStorage

### **Input Validation**

* [ ] Add Zod schemas for review update
* [ ] Add Zod schemas for helpful vote
* [ ] Add Zod schemas for saving businesses
* [ ] Add Zod schemas for image uploads & rating rules

### **Error Response Standardization**

* [ ] Refactor all endpoints to use consistent response structure
* [ ] Add clear HTTP error codes across all review endpoints

---

## **🟢 Phase 3 — Supporting Infrastructure (Week 3)**

### **DX & API Consistency**

* [ ] Improve error message clarity
* [ ] Add structured logging
* [ ] Add performance checks for review endpoints
* [ ] Refactor common DB operations into helpers

---

## **🧱 Database Work (Migrations)**

* [ ] Migration: `review_helpful_votes` table + indexes + policies
* [ ] Migration: `saved_businesses` table + indexes + policies

---

## **🧪 Testing Work**

### Unit Tests

* [ ] Edit review
* [ ] Delete review
* [ ] Helpful vote toggle
* [ ] Saved business CRUD

### Integration Tests

* [ ] User can only edit/delete own reviews
* [ ] Helpful count updates properly
* [ ] Saved businesses persist
* [ ] Business stats update after review edit/delete

---

# 🧩 **TOTAL NEW ENDPOINTS TO BUILD**

### **6 New Endpoints**

* `PUT /api/reviews/[id]`
* `DELETE /api/reviews/[id]`
* `POST /api/reviews/[id]/helpful`
* `GET /api/reviews/[id]/helpful`
* `POST /api/saved/businesses`
* `DELETE /api/saved/businesses/[id]`
* `GET /api/saved/businesses`

---

# 🕒 **ESTIMATED TIME**

* **Phase 1:** 5–7 days
* **Phase 2:** 5–7 days
* **Phase 3:** 3–5 days

---

If you want, I can turn this into a **beautiful Notion page**, **GitHub Project board**, or **Linear issue list**.
