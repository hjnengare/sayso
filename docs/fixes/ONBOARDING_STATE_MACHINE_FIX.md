# Onboarding State Machine Fix

## Problem

The onboarding flow had a critical bug where:
1. Users could navigate through onboarding pages
2. But `onboarding_complete` was never set to `true`
3. Middleware kept redirecting `/home` → `/onboarding` even after users completed all steps
4. State was stuck at `subcategories` step

## Root Cause

**No single authoritative place to mark onboarding as complete.**

- Subcategories API set `onboarding_step: 'deal-breakers'` but didn't check completion
- Complete page tried to mark completion but logic was complex and could fail
- Middleware was too permissive - allowed pages to load but didn't enforce completion

## Solution

### 1. Defined Completion Criteria

**Single source of truth:**
```typescript
const onboardingIsComplete = 
  interests_count > 0 && 
  subcategories_count > 0 &&
  dealbreakers_count > 0;
```

**ALL THREE STEPS ARE REQUIRED:**
- Interests (required)
- Subcategories (required)
- Deal-breakers (required)

### 2. Mark Completion in ONE Place

**Option A: After subcategories are saved** (NOT used - deal-breakers required)
- When subcategories API saves data, it checks completion criteria
- Since deal-breakers are required, it will always set `onboarding_step: 'deal-breakers'`
- User must complete deal-breakers before completion can be marked

**Option B: On /complete page load** (fallback)
- `/complete` page calls API with `markComplete: true`
- API verifies completion criteria before marking complete
- Ensures completion is only marked when criteria are met

### 3. Strict Middleware

**Before (permissive):**
- Allowed pages to load based on step
- Checked cookies and complex logic
- Could allow access without completion

**After (strict):**
```typescript
// SINGLE SOURCE OF TRUTH
if (profile?.onboarding_complete === true) {
  // Allow access
} else {
  // Redirect to onboarding
}
```

### 4. Enhanced Logging

Added debug-safe logging to detect inconsistent states:
- Logs completion criteria check
- Warns if user meets criteria but `onboarding_complete` is false
- Includes pathname in all logs for debugging

## Files Changed

1. **`src/app/api/onboarding/subcategories/route.ts`**
   - Checks completion criteria after saving subcategories
   - Marks completion if criteria met

2. **`src/app/api/user/onboarding/route.ts`**
   - Enhanced `markComplete: true` handler
   - Verifies completion criteria before marking complete
   - Returns error if criteria not met

3. **`src/app/complete/page.tsx`**
   - Simplified to call API with `markComplete: true`
   - Removed complex data fetching logic

4. **`src/middleware.ts`**
   - Strict check: only allow `/home` if `onboarding_complete === true`
   - Removed cookie-based logic
   - Enhanced logging for debugging

## Testing

### Test Completion Flow

1. User saves interests (sets `onboarding_step: 'subcategories'`)
2. User saves subcategories (sets `onboarding_step: 'deal-breakers'`)
3. User saves deal-breakers (sets `onboarding_step: 'deal-breakers'`, but NOT complete yet)
4. User reaches `/complete` page
5. **Expected:** If `interests_count > 0 && subcategories_count > 0 && dealbreakers_count > 0`:
   - API marks `onboarding_step: 'complete'`
   - API marks `onboarding_complete: true`
6. User can access `/home` without redirect

### Test Completion on /complete Page

1. User reaches `/complete` page
2. Page calls API with `markComplete: true`
3. API verifies criteria before marking complete
4. **Expected:** If criteria met, `onboarding_complete: true`
5. User can access `/home`

### Test Incomplete State

1. User has interests but no subcategories
2. **Expected:** `onboarding_complete: false`
3. Middleware redirects to `/subcategories`

## Prevention

The enhanced logging will detect inconsistent states:
- If user meets criteria but `onboarding_complete` is false → warning logged
- All profile fetches include completion criteria check
- Pathname included in all logs for debugging

## Future Improvements

1. **Atomic completion check**: Use database function to ensure atomicity
2. **Completion webhook**: Notify other systems when onboarding completes
3. **Completion analytics**: Track completion rates and drop-off points
4. **Retry logic**: Auto-retry completion check if criteria met but not marked

