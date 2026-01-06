# Badge System Documentation

## Overview

The Sayso badge system rewards users for various activities including writing reviews, uploading photos, receiving helpful votes, and exploring different categories. Badges are automatically awarded through database triggers when qualifying events occur.

## Architecture

### Database Tables

1. **`badges`** - Badge catalog/definitions
   - Contains all available badges with their rules and thresholds
   - Public read access

2. **`user_badges`** - Awarded badges
   - Tracks which badges each user has earned
   - Only database triggers/functions can insert (no direct client inserts)

3. **`user_badge_progress`** - Progress tracking
   - Tracks progress for badges not yet earned
   - Used for UI display and performance optimization

### Badge Groups

- **Milestone**: Review count milestones (1, 5, 10, 50, 100 reviews)
- **Category Explorer**: Reviewing businesses across different categories
- **Category Specialist**: Deep expertise in specific categories (e.g., Food & Drink)
- **Community**: Helpful votes, photos, early reviews
- **Personality**: Special achievements (streaks, neighborhood expertise)

### Badge Rule Types

- `review_count` - Total number of reviews written
- `category_review_count` - Reviews in a specific category
- `distinct_category_count` - Number of different categories reviewed
- `photo_count` - Total number of photos uploaded
- `helpful_votes_received` - Helpful votes received on user's reviews
- `helpful_votes_total` - Total helpful votes given by user
- `first_review_for_business` - First review for a business
- `review_low_review_business_count` - Reviewing businesses with few reviews
- `distinct_businesses_in_suburb` - Reviewing multiple businesses in a suburb
- `streak_days` - Consecutive days of reviewing
- `weekly_streak` - Weekly consistency
- `loyal_reviewer` - Reviewing the same business multiple times

## Automatic Badge Awarding

Badges are automatically awarded through database triggers:

1. **Review Created** (`trigger_award_badges_on_review`)
   - Triggers when a new review is inserted
   - Checks for: milestone badges, category badges, early bird, discoverer, neighborhood plug

2. **Photo Added** (`trigger_award_badges_on_photo`)
   - Triggers when a review image is inserted
   - Checks for: photo count badges

3. **Helpful Vote Received** (`trigger_award_badges_on_helpful_vote`)
   - Triggers when a helpful vote is added
   - Checks for: helpful vote badges

## API Endpoints

### GET `/api/user/badges`

Get badges for the authenticated user.

**Query Parameters:**
- `progress` (boolean): Include progress for badges not yet earned
- `stats` (boolean): Include badge statistics

**Response:**
```json
{
  "badges": [
    {
      "badge_id": "milestone_new_voice",
      "badge_name": "New Voice",
      "badge_description": "Write your first review",
      "badge_group": "milestone",
      "category_key": null,
      "icon_name": "mic",
      "awarded_at": "2025-01-27T10:00:00Z"
    }
  ],
  "progress": [
    {
      "badge_id": "milestone_contributor",
      "badge_name": "Contributor",
      "progress": 3,
      "target": 5,
      "percentage_complete": 60,
      "is_earned": false
    }
  ],
  "stats": {
    "total_badges": 5,
    "badges_by_group": {
      "milestone": 2,
      "community": 3
    },
    "recent_badges": [...]
  }
}
```

### POST `/api/user/badges/check`

Manually trigger badge check for the authenticated user. Useful for backfilling badges or testing.

**Response:**
```json
{
  "success": true,
  "awarded_badges": [
    {
      "awarded_badge_id": "milestone_contributor",
      "badge_name": "Contributor"
    }
  ],
  "message": "Awarded 1 new badge(s)"
}
```

## Database Functions

### `award_badges_for_user(user_id, event_type, event_data)`

Main badge awarding function called by triggers.

**Parameters:**
- `user_id` (UUID): User to check badges for
- `event_type` (TEXT): 'review_created', 'photo_added', 'helpful_vote_received'
- `event_data` (JSONB): Event-specific data (business_id, category_key, etc.)

**Returns:** Table of awarded badges

### `check_user_badges(user_id)`

Manually check and award badges for a user. Useful for backfilling.

### `get_user_badges(user_id)`

Get all badges earned by a user with full badge details.

### `get_user_badge_progress(user_id)`

Get progress for all badges (earned and in-progress) for a user.

### `get_user_badge_stats(user_id)`

Get badge statistics including total count, breakdown by group, and recent badges.

## Adding New Badges

To add a new badge, insert into the `badges` table:

```sql
INSERT INTO public.badges (id, name, description, badge_group, rule_type, threshold, icon_name)
VALUES (
  'milestone_200',                    -- Unique ID
  'Review Master',                    -- Display name
  'Write 200 reviews',                -- Description
  'milestone',                        -- Badge group
  'review_count',                     -- Rule type
  200,                                -- Threshold
  'star'                              -- Icon name
);
```

The badge will be automatically awarded when users meet the criteria.

## Badge Categories

### Milestone Badges
- **New Voice** (1 review)
- **Contributor** (5 reviews)
- **Reviewer** (10 reviews)
- **Expert Reviewer** (50 reviews)
- **Review Legend** (100 reviews)

### Photo Badges
- **Take a Pic!** (1 photo)
- **Visual Storyteller** (15 photos)

### Helpful Vote Badges
- **Helpful Reviewer** (10 helpful votes)
- **Helpful Hero** (100 helpful votes)
- **Helpful Legend** (500 helpful votes)

### Category Explorer Badges
- **Category Explorer** (3 different categories)
- **Category Master** (10 different categories)

### Special Event Badges
- **Early Bird** - First review for a business
- **Discoverer** - Review a business with <3 reviews

### Category Specialist Badges
- **Food Enthusiast** (3 Food & Drink reviews)
- **Food Expert** (10 Food & Drink reviews)
- **Food Master** (25 Food & Drink reviews)

## Frontend Integration

### Fetching User Badges

```typescript
import { getServerSupabase } from '@/app/lib/supabase/server';

const supabase = await getServerSupabase();
const { data: badges } = await supabase
  .rpc('get_user_badges', { p_user_id: user.id });
```

### Displaying Badge Progress

```typescript
const { data: progress } = await supabase
  .rpc('get_user_badge_progress', { p_user_id: user.id });

// Filter for in-progress badges
const inProgress = progress.filter(b => !b.is_earned);
```

## Security

- Badges can only be awarded through database triggers/functions
- Client applications cannot directly insert into `user_badges`
- All functions use `SECURITY DEFINER` to bypass RLS when needed
- Users can only read their own badges and progress

## Performance Considerations

- Badge checks run asynchronously via triggers
- Progress is cached in `user_badge_progress` table
- Indexes on `user_id` and `badge_id` for fast lookups
- Badge awarding is idempotent (won't award duplicates)

## Future Enhancements

- Streak tracking (daily/weekly consistency)
- Neighborhood expertise badges
- Category-specific specialist badges for all categories
- Badge notifications
- Badge leaderboards
- Badge sharing

