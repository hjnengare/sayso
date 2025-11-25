# User Interest-Based Business Filtering Implementation

## Overview

This implementation tracks user selected interests and subcategories from the onboarding flow and uses them to filter businesses shown in the "FOR YOU" section of the app.

## Components

### 1. **useUserPreferences Hook** (`src/app/hooks/useUserPreferences.ts`)

A custom React hook that fetches and manages user preferences.

**Features:**
- Fetches user's interests, subcategories, and deal-breakers from the API
- Handles loading states and error management
- Provides a refetch function for manual updates
- Exports a helper hook `useUserInterestIds()` that returns combined interest IDs

**Usage:**
```typescript
import { useUserPreferences } from '@/app/hooks/useUserPreferences';

function MyComponent() {
  const { interests, subcategories, dealbreakers, loading, error } = useUserPreferences();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <p>Selected Interests: {interests.length}</p>
      <p>Selected Subcategories: {subcategories.length}</p>
    </div>
  );
}
```

### 2. **User Preferences API Endpoint** (`src/app/api/user/preferences/route.ts`)

REST API endpoint that fetches the current authenticated user's preferences.

**Endpoint:** `GET /api/user/preferences`

**Returns:**
```json
{
  "interests": [
    { "id": "food-drink", "name": "Food & Drink" },
    ...
  ],
  "subcategories": [
    { "id": "italian-restaurants", "name": "Italian Restaurants" },
    ...
  ],
  "dealbreakers": [
    { "id": "no-delivery", "name": "No Delivery" },
    ...
  ]
}
```

**Database Queries:**
- Fetches from `user_interests` table
- Fetches from `user_subcategories` table
- Fetches from `user_dealbreakers` table
- Joins with interest/subcategory/dealbreaker names

### 3. **Enhanced Businesses API** (`src/app/api/businesses/route.ts`)

Updated to support interest-based filtering.

**New Query Parameter:**
- `interest_ids`: Comma-separated list of interest/subcategory IDs to filter by

**Example:**
```
GET /api/businesses?limit=20&sort_by=total_rating&sort_order=desc&interest_ids=food-drink,beauty-wellness
```

**Filtering Logic:**
- Filters businesses to only show those that match the provided interest IDs
- Can be combined with other filters (category, location, price_range, etc.)

### 4. **Enhanced useBusinesses Hook** (`src/app/hooks/useBusinesses.ts`)

Updated to support interest-based filtering.

**New Option:**
```typescript
interface UseBusinessesOptions {
  // ... existing options ...
  interestIds?: string[]; // IDs of interests/subcategories to filter by
}
```

**Usage:**
```typescript
// Fetch businesses with interest filtering
const { businesses } = useBusinesses({
  limit: 20,
  sortBy: 'total_rating',
  sortOrder: 'desc',
  interestIds: ['food-drink', 'beauty-wellness']
});
```

### 5. **Updated useForYouBusinesses Hook** (`src/app/hooks/useBusinesses.ts`)

Now automatically filters businesses based on user's selected interests and subcategories.

**Implementation:**
- Calls `useUserPreferences()` internally
- Extracts all interest and subcategory IDs
- Passes them to `useBusinesses()` for filtering
- Falls back to unfiltered results if user has no preferences

**Before:**
```typescript
export function useForYouBusinesses(limit: number = 10): UseBusinessesResult {
  return useBusinesses({
    limit,
    sortBy: 'total_rating',
    sortOrder: 'desc',
  });
}
```

**After:**
```typescript
export function useForYouBusinesses(limit: number = 10): UseBusinessesResult {
  const { interests, subcategories } = useUserPreferences();
  
  const interestIds = interests.map((i) => i.id).concat(
    subcategories.map((s) => s.id)
  );

  return useBusinesses({
    limit,
    sortBy: 'total_rating',
    sortOrder: 'desc',
    interestIds: interestIds.length > 0 ? interestIds : undefined,
  });
}
```

## Data Flow

```
1. User completes onboarding (interests/subcategories selection)
   ↓
2. Selected interests/subcategories are saved to database
   ↓
3. User navigates to "FOR YOU" section
   ↓
4. useForYouBusinesses() hook is called
   ↓
5. useUserPreferences() fetches user's preferences from /api/user/preferences
   ↓
6. useBusinesses() adds interest_ids to query parameters
   ↓
7. API endpoint /api/businesses?interest_ids=... is called
   ↓
8. Businesses are filtered and returned
   ↓
9. Only businesses matching user's interests are displayed
```

## Database Tables Required

The implementation assumes the following database tables exist:

```
user_interests
├── id (primary key)
├── user_id
├── interest_id
└── created_at

user_subcategories
├── id (primary key)
├── user_id
├── subcategory_id
└── created_at

user_dealbreakers
├── id (primary key)
├── user_id
├── dealbreaker_id
└── created_at

interests
├── id (primary key)
├── name
└── created_at

subcategories
├── id (primary key)
├── name
├── interest_id
└── created_at

dealbreakers
├── id (primary key)
├── name
└── created_at
```

## How Interests Map to Businesses

The implementation assumes businesses have associated interests/categories. The filtering works by:

1. **Interest-to-Business Mapping**: Businesses have a `category` field that corresponds to interest IDs
2. **Subcategory-to-Business Mapping**: Businesses may also have subcategory mappings (if available in database)
3. **Dynamic Filtering**: The API endpoint filters businesses where their category/subcategory matches user's selected interests/subcategories

## Future Enhancements

1. **Deal-Breaker Filtering**: Exclude businesses tagged with user's selected deal-breakers
2. **Weighted Scoring**: Prioritize businesses matching more interests
3. **Machine Learning**: Learn from user behavior to improve recommendations
4. **Caching**: Cache user preferences to reduce API calls
5. **Real-Time Updates**: Update preferences across devices in real-time
6. **Personalized Trending**: Show trending businesses only within user's interests

## Testing

To test the implementation:

1. **Set User Preferences:**
   ```bash
   curl -X POST http://localhost:3000/api/user/onboarding \
     -H "Content-Type: application/json" \
     -d '{
       "interests": ["food-drink", "beauty-wellness"],
       "subcategories": ["italian-restaurants"]
     }'
   ```

2. **Fetch User Preferences:**
   ```bash
   curl http://localhost:3000/api/user/preferences
   ```

3. **Fetch Filtered Businesses:**
   ```bash
   curl "http://localhost:3000/api/businesses?interest_ids=food-drink,beauty-wellness&limit=20"
   ```

4. **Check FOR YOU Page:**
   Navigate to `/for-you` to see filtered businesses based on your interests

## Error Handling

- If user has no preferences, all businesses are shown (fallback behavior)
- If preferences API fails, the FOR YOU section shows all businesses
- Invalid interest IDs are silently ignored
- Database errors are logged and returned as 500 responses

## Performance Considerations

1. **Caching**: User preferences are cached by the hook (refetch only when user ID changes)
2. **Query Efficiency**: The API uses indexed lookups on user_id and IDs
3. **Pagination**: Businesses API supports cursor-based pagination for efficient data fetching
4. **Lazy Loading**: Preferences are only fetched when needed (on mount)

## Security

- All endpoints require authentication (`getServerSupabase()` validates user session)
- Users can only access their own preferences
- Invalid or unauthorized requests return 401 Unauthorized

