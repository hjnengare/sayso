# Backend Implementation Plan - Making KLIO Fully Functional

This document outlines all backend work required to make the application fully functional.

## 🎯 Critical Missing Features

### 1. Business Claim API Endpoint ⚠️ CRITICAL
**Status:** Frontend exists, no API endpoint  
**Priority:** HIGH  
**Location:** `src/app/claim-business/page.tsx` uses client-side service

**Required:**
- `POST /api/businesses/claim` - Create ownership claim request
- `GET /api/businesses/claim/status` - Check claim status
- `GET /api/businesses/my-claims` - List user's claims
- Database: `business_ownership_requests` table (check if exists in migrations)

**Implementation:**
- Verify ownership request creation
- Handle document uploads for verification
- Email verification flow for business email/phone
- Return claim request ID and status

---

### 2. Review Management for Business Owners ⚠️ INCOMPLETE
**Status:** Partially implemented (mark helpful exists in UI)  
**Priority:** HIGH  
**Current:** Review display works, but business owner actions missing

**Required Endpoints:**
- `POST /api/reviews/[id]/response` - Business owner responds to review
- `POST /api/reviews/[id]/helpful` - Mark review as helpful (vote)
- `GET /api/reviews/helpful/[id]` - Check if user marked helpful
- `POST /api/reviews/[id]/flag` - Flag inappropriate review
- `GET /api/businesses/[id]/reviews` - Get all reviews for business owner's businesses

**Database Schema Needed:**
- `review_responses` table:
  ```sql
  id UUID PRIMARY KEY
  review_id UUID REFERENCES reviews(id)
  business_owner_id UUID REFERENCES profiles(user_id)
  response_text TEXT
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
  ```
- `review_helpful_votes` table:
  ```sql
  review_id UUID REFERENCES reviews(id)
  user_id UUID REFERENCES profiles(user_id)
  created_at TIMESTAMPTZ
  PRIMARY KEY (review_id, user_id)
  ```
- `review_flags` table:
  ```sql
  id UUID PRIMARY KEY
  review_id UUID REFERENCES reviews(id)
  flagged_by UUID REFERENCES profiles(user_id)
  reason TEXT
  status TEXT ('pending', 'reviewed', 'dismissed')
  admin_notes TEXT
  created_at TIMESTAMPTZ
  ```

---

### 3. Admin APIs for Business Approval 🔮 PLANNED
**Status:** No implementation  
**Priority:** MEDIUM-HIGH

**Required Endpoints:**
- `GET /api/admin/business-claims` - List pending claims (admin only)
- `POST /api/admin/business-claims/[id]/approve` - Approve ownership claim
- `POST /api/admin/business-claims/[id]/reject` - Reject with reason
- `GET /api/admin/review-flags` - List flagged reviews
- `POST /api/admin/review-flags/[id]/resolve` - Resolve flag (remove/dismiss)
- `POST /api/admin/reviews/[id]/remove` - Remove inappropriate review
- `POST /api/admin/users/[id]/ban` - Ban abusive user

**Database Schema:**
- Add `admin_notes` to `business_ownership_requests`
- Create `admin_actions` audit log table

**Authorization:**
- Implement admin role check
- Use Supabase RLS policies for admin access

---

### 4. Email Notification System 📧 MISSING
**Status:** Not implemented  
**Priority:** MEDIUM

**Required:**
- Email service integration (SendGrid/Resend/Supabase Auth emails)
- Notification templates
- Queue system for async email sending

**Notification Types:**
- Welcome email after signup
- Email verification reminder
- Review received notification (business owners)
- Business claim approved/rejected
- Review response notification (to reviewer)
- Weekly digest (optional)

**Endpoints:**
- `POST /api/notifications/send` - Trigger notification (internal)
- Background job/trigger for automated emails

---

### 5. Review Update/Delete ⚠️ MISSING
**Status:** Users can edit/delete in UI but no API  
**Priority:** MEDIUM

**Required Endpoints:**
- `PUT /api/reviews/[id]` - Update review (owner only)
- `DELETE /api/reviews/[id]` - Delete review (owner only)
- `PUT /api/reviews/[id]/images` - Update review images
- Recalculate business stats after update/delete

---

### 6. Saved/Bookmarked Businesses 🔖 MISSING
**Status:** Frontend context exists (`SavedItemsContext`) but no backend  
**Priority:** MEDIUM

**Required Endpoints:**
- `POST /api/saved/businesses` - Save business
- `DELETE /api/saved/businesses/[id]` - Unsave business
- `GET /api/saved/businesses` - List saved businesses

**Database Schema:**
```sql
CREATE TABLE saved_businesses (
  user_id UUID REFERENCES profiles(user_id),
  business_id UUID REFERENCES businesses(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, business_id)
);
```

---

### 7. Business Hours Management 📅 MISSING
**Status:** Not implemented  
**Priority:** LOW-MEDIUM

**Required:**
- `GET /api/businesses/[id]/hours` - Get business hours
- `PUT /api/businesses/[id]/hours` - Update hours (owner only)

**Database Schema:**
```sql
CREATE TABLE business_hours (
  business_id UUID PRIMARY KEY REFERENCES businesses(id),
  monday_open TIME,
  monday_close TIME,
  tuesday_open TIME,
  tuesday_close TIME,
  -- ... for all days
  is_24_hours BOOLEAN DEFAULT FALSE,
  special_hours JSONB, -- For holidays, special events
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 8. Enhanced Search & Filtering 🔍 PARTIAL
**Status:** Basic search exists  
**Priority:** LOW-MEDIUM

**Missing Features:**
- Distance-based search (requires user location)
- "Open now" filter (requires business hours)
- Advanced sorting (by distance, price, rating combo)
- Full-text search improvements

**Endpoints:**
- Enhance `GET /api/businesses` with:
  - `lat`, `lng` query params for location
  - `radius_km` for distance filter
  - `open_now` boolean filter
  - Better text search ranking

---

## 🛠️ Backend Infrastructure Improvements

### 9. Rate Limiting ⚠️ PARTIAL
**Status:** Basic rate limiting exists for auth  
**Priority:** HIGH

**Required:**
- Comprehensive rate limiting on all public endpoints
- Per-user rate limits for authenticated endpoints
- IP-based rate limiting for public endpoints
- Rate limit headers in responses
- Error handling for rate limit exceeded

**Endpoints to Protect:**
- `/api/reviews` - Limit review submissions
- `/api/businesses/claim` - Prevent spam
- `/api/reviews/[id]/helpful` - Prevent vote manipulation
- All search endpoints

---

### 10. Input Validation & Sanitization ✅ PARTIAL
**Status:** Basic validation exists  
**Priority:** HIGH

**Required:**
- Zod schema validation for all API endpoints
- SQL injection prevention (Supabase handles this, but verify)
- XSS prevention in text inputs
- File upload validation (type, size limits)
- Email format validation
- Phone number validation

---

### 11. Error Handling & Logging 📊 MISSING
**Status:** Console.log used throughout  
**Priority:** MEDIUM

**Required:**
- Structured logging system (Winston/Pino)
- Error tracking (Sentry)
- Request/response logging middleware
- Error notification system
- Remove all `console.log` statements (362 instances found)

---

### 12. Database Functions & Triggers 🔧 PARTIAL
**Status:** Some RPC functions exist  
**Priority:** MEDIUM

**Check/Implement:**
- `update_business_stats` - Verify it updates correctly
- `complete_onboarding_atomic` - Verify exists and works
- `list_businesses_optimized` - Verify performance
- Trigger for auto-updating business stats on review changes
- Trigger for updating `updated_at` timestamps

**Missing Functions:**
- Function to calculate review percentiles
- Function to update trending businesses materialized view
- Function to handle review flagging workflow

---

### 13. API Response Standardization 📐 MISSING
**Status:** Inconsistent response formats  
**Priority:** LOW-MEDIUM

**Required:**
- Standardize all API responses:
  ```typescript
  {
    success: boolean
    data?: any
    error?: string
    message?: string
    meta?: { pagination, etc }
  }
  ```
- Consistent error codes
- API versioning strategy

---

## 🔐 Security Enhancements

### 14. Row Level Security (RLS) Audit 🔒 PARTIAL
**Status:** Some RLS policies exist  
**Priority:** HIGH

**Required:**
- Audit all tables for proper RLS policies
- Ensure users can only edit their own data
- Ensure business owners can only edit their businesses
- Ensure admins have proper access
- Test RLS policies in production-like environment

**Tables to Verify:**
- `profiles`
- `reviews`
- `review_images`
- `businesses`
- `business_owners`
- `business_ownership_requests`
- `user_interests`
- `user_subcategories`
- `user_dealbreakers`

---

### 15. API Authentication & Authorization 🔐 PARTIAL
**Status:** Basic auth exists  
**Priority:** HIGH

**Required:**
- Verify all protected endpoints check authentication
- Implement role-based access control (RBAC)
- Admin role verification helper
- Business owner verification helper
- Proper error messages for unauthorized access

---

## 📊 Analytics & Monitoring

### 16. Analytics Endpoints 📈 MISSING
**Status:** Not implemented  
**Priority:** LOW

**Required (for business owners):**
- `GET /api/businesses/[id]/analytics` - Business stats
  - Review trends over time
  - Rating distribution
  - Review response rate
  - Traffic/views (if tracking implemented)

---

## 🗄️ Database Schema Updates

### 17. Missing Tables ⚠️
**Priority:** HIGH

**Required:**
1. `review_responses` - Business owner responses
2. `review_helpful_votes` - User votes on reviews
3. `review_flags` - Flagged reviews for moderation
4. `saved_businesses` - User bookmarks
5. `business_hours` - Operating hours
6. `admin_actions` - Audit log for admin actions
7. `notifications` - User notifications (optional, for in-app)

### 18. Index Optimization 🗂️
**Priority:** MEDIUM

**Check:**
- Review query performance
- Add indexes on frequently queried columns:
  - `reviews.business_id`
  - `reviews.user_id`
  - `businesses.category`
  - `businesses.location`
  - `business_ownership_requests.status`

---

## 🚀 Deployment & Production Readiness

### 19. Environment Configuration 🌍
**Priority:** HIGH

**Required:**
- Production environment variables
- Staging environment setup
- Secrets management
- Database connection pooling
- CDN configuration for images

### 20. Database Migrations 🗄️
**Priority:** HIGH

**Required:**
- Migration scripts for all new tables
- Rollback scripts
- Migration testing in staging
- Data migration for existing data (if any)

---

## 📝 Implementation Priority

### Phase 1: Critical (Week 1-2)
1. Business Claim API endpoint
2. Review helpful votes backend
3. Rate limiting on all endpoints
4. RLS policy audit and fixes
5. Input validation with Zod

### Phase 2: High Priority (Week 3-4)
6. Review responses for business owners
7. Review flagging system
8. Admin APIs for business approval
9. Review update/delete endpoints
10. Structured logging system

### Phase 3: Medium Priority (Week 5-6)
11. Email notification system
12. Saved/bookmarked businesses
13. Business hours management
14. Analytics endpoints
15. API response standardization

### Phase 4: Nice to Have (Week 7-8)
16. Enhanced search with location
17. Database function optimizations
18. Advanced analytics
19. Notification system improvements

---

## ✅ Testing Requirements

### Unit Tests
- API endpoint tests
- Service layer tests
- Database function tests

### Integration Tests
- Authentication flows
- Business ownership workflow
- Review submission and management
- Admin actions

### E2E Tests
- Complete user journeys
- Business owner workflows
- Admin workflows

---

## 📚 Documentation Needed

- API endpoint documentation (OpenAPI/Swagger)
- Database schema documentation updates
- Deployment guide
- Environment setup guide
- Testing guide

---

## 🔍 Code Quality

### Current Issues Found:
- 362 `console.log` statements need replacement
- Inconsistent error handling
- Missing TypeScript types in some places
- No API versioning
- Mixed client/server code in services (need to separate)

---

## 📊 Summary

**Total Missing Features:** ~20 major backend features  
**Critical:** 5 features  
**High Priority:** 5 features  
**Medium Priority:** 7 features  
**Low Priority:** 3 features  

**Estimated Timeline:** 6-8 weeks for full implementation with 1 developer  
**Risk Areas:** Security (RLS), Rate limiting, Email system integration

