# Badge System Implementation Summary

## What Was Created

A complete badge system for Sayso that automatically awards badges to users based on their activities (reviews, photos, helpful votes).

## Files Created

### Database Migrations

1. **`supabase/migrations/20250127_create_badge_system.sql`**
   - Creates `badges`, `user_badges`, and `user_badge_progress` tables
   - Implements badge awarding function (`award_badges_for_user`)
   - Creates triggers for automatic badge awarding
   - Seeds initial badges (milestones, photos, helpful votes, category badges)

2. **`supabase/migrations/20250127_create_badge_system_helpers.sql`**
   - Helper functions for badge management
   - `check_user_badges()` - Manual badge check
   - `get_user_badges()` - Get user's earned badges
   - `get_user_badge_progress()` - Get badge progress
   - `get_user_badge_stats()` - Get badge statistics

### API Routes

1. **`src/app/api/user/badges/route.ts`**
   - GET endpoint to fetch user badges
   - Supports `?progress=true` and `?stats=true` query params

2. **`src/app/api/user/badges/check/route.ts`**
   - POST endpoint to manually trigger badge check
   - Useful for backfilling badges

### Type Definitions

1. **`src/app/lib/types/badges.ts`**
   - TypeScript types for badges, user badges, progress, and stats

### Documentation

1. **`docs/features/BADGE_SYSTEM.md`**
   - Complete documentation of the badge system
   - API usage examples
   - How to add new badges

## How It Works

### Automatic Badge Awarding

1. **When a review is created:**
   - Trigger `trigger_award_badges_on_review` fires
   - Calls `award_badges_for_user()` with event type `'review_created'`
   - Checks for: milestone badges, category badges, early bird, discoverer

2. **When a photo is added:**
   - Trigger `trigger_award_badges_on_photo` fires
   - Checks for: photo count badges

3. **When a helpful vote is received:**
   - Trigger `trigger_award_badges_on_helpful_vote` fires
   - Checks for: helpful vote badges

### Badge Types Implemented

#### Milestone Badges
- New Voice (1 review)
- Contributor (5 reviews)
- Reviewer (10 reviews)
- Expert Reviewer (50 reviews)
- Review Legend (100 reviews)

#### Photo Badges
- Take a Pic! (1 photo)
- Visual Storyteller (15 photos)

#### Helpful Vote Badges
- Helpful Reviewer (10 helpful votes)
- Helpful Hero (100 helpful votes)
- Helpful Legend (500 helpful votes)

#### Category Explorer Badges
- Category Explorer (3 different categories)
- Category Master (10 different categories)

#### Special Event Badges
- Early Bird (first review for a business)
- Discoverer (review a business with <3 reviews)

#### Category Specialist Badges (Food & Drink example)
- Food Enthusiast (3 reviews)
- Food Expert (10 reviews)
- Food Master (25 reviews)

## Next Steps

### 1. Run the Migrations

Run the SQL migrations in your Supabase SQL Editor:

1. `supabase/migrations/20250127_create_badge_system.sql`
2. `supabase/migrations/20250127_create_badge_system_helpers.sql`

### 2. Test Badge Awarding

Create a test review and verify badges are awarded:

```sql
-- Check if badges were awarded
SELECT * FROM user_badges WHERE user_id = 'your-user-id';
```

### 3. Backfill Badges for Existing Users

Run badge check for all existing users:

```sql
-- Backfill badges for all users
SELECT check_user_badges(id) FROM auth.users;
```

### 4. Add More Category Specialist Badges

Add badges for other categories (Shopping, Entertainment, etc.):

```sql
INSERT INTO public.badges (id, name, description, badge_group, category_key, rule_type, threshold, icon_name)
VALUES (
  'specialist_shopping_beginner',
  'Shopping Enthusiast',
  'Write 3 reviews in Shopping',
  'category_specialist',
  'shopping',
  'category_review_count',
  3,
  'shopping-bag'
);
```

### 5. Frontend Integration

Create UI components to display badges:

- Badge list on user profile
- Badge progress indicators
- Badge notifications when earned
- Badge leaderboards

### 6. Add More Badge Types

Based on your PDF spec, you can add:

- **Streak badges** (`streak_days`, `weekly_streak`)
- **Neighborhood badges** (`distinct_businesses_in_suburb`)
- **Loyal reviewer** (`loyal_reviewer` - same business reviewed twice)

## Important Notes

### Security

- Badges can only be awarded through database triggers/functions
- Client applications cannot directly insert into `user_badges`
- All functions use `SECURITY DEFINER` to bypass RLS when needed

### Performance

- Badge checks run asynchronously via triggers
- Progress is cached in `user_badge_progress` table
- Indexes on `user_id` and `badge_id` for fast lookups

### RLS Policies

The RLS policies block direct client inserts but allow `SECURITY DEFINER` functions to insert. If you encounter issues, you may need to:

1. Ensure functions are owned by a user with proper permissions
2. Or temporarily disable RLS in the function: `SET LOCAL row_security = off;`

## Testing

### Test Badge Awarding

```sql
-- Create a test review
INSERT INTO reviews (business_id, user_id, rating, content)
VALUES ('business-uuid', 'user-uuid', 5, 'Great place!');

-- Check if badges were awarded
SELECT ub.*, b.name, b.description
FROM user_badges ub
JOIN badges b ON b.id = ub.badge_id
WHERE ub.user_id = 'user-uuid';
```

### Test Badge Progress

```sql
-- Get badge progress for a user
SELECT * FROM get_user_badge_progress('user-uuid');
```

### Test API Endpoints

```bash
# Get user badges
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/user/badges?progress=true&stats=true

# Manually check badges
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/user/badges/check
```

## Troubleshooting

### Badges Not Being Awarded

1. Check if triggers are enabled:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname LIKE '%badge%';
   ```

2. Check function permissions:
   ```sql
   SELECT proname, prosecdef FROM pg_proc WHERE proname LIKE '%badge%';
   ```

3. Check RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'user_badges';
   ```

### Performance Issues

- Ensure indexes are created
- Consider batching badge checks for backfilling
- Monitor trigger execution times

## Future Enhancements

- Badge notifications when earned
- Badge leaderboards
- Badge sharing
- Badge categories/collections
- Badge rarity levels
- Badge expiration (for time-limited badges)

