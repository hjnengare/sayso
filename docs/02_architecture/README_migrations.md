# Database Migrations

This directory contains all SQL migration files organized by functionality.

## Directory Structure

```
migrations/
Γö£ΓöÇΓöÇ 001_core/           # Core database setup (profiles, auth, users)
Γö£ΓöÇΓöÇ 002_business/       # Business-related tables and features
Γö£ΓöÇΓöÇ 003_reviews/        # Review system tables and features
Γö£ΓöÇΓöÇ 004_storage/        # Storage buckets and file management
ΓööΓöÇΓöÇ 005_functions/      # Database functions and utilities
```

## Migration Order

Run migrations in the following order:

### 1. Core Setup (`001_core/`)
1. `001_setup-database.sql` - Initial database setup with profiles, interests, and RLS policies
2. `002_add-profile-fields.sql` - Add additional profile fields
3. `003_add-role-to-profiles.sql` - Add user roles to profiles table

### 2. Business Schema (`002_business/`)
1. `001_businesses-schema.sql` - Create businesses and business_stats tables
2. `002_businesses-osm-columns.sql` - Add OSM-related columns (source, source_id, lat, lng)
3. `003_business-ownership.sql` - Add business ownership verification system
4. `004_auto-assign-images.sql` - Auto-assign category images to businesses
5. `005_update-image-urls.sql` - Function to update business image URLs
6. `006_performance-indexes.sql` - Add composite indexes and geospatial indexes
7. `007_trending-materialized-view.sql` - Create materialized views for trending/top businesses
8. `008_optimize-rls-policies.sql` - Optimize RLS policies to use indexed columns

### 3. Reviews System (`003_reviews/`)
1. `001_reviews-schema.sql` - Create reviews and review_images tables
2. `002_review-images-storage.sql` - Setup storage bucket for review images

### 4. Storage (`004_storage/`)
1. `001_setup-storage.sql` - Setup Supabase storage buckets and policies

### 5. Database Functions (`005_functions/`)
1. `001_database-functions.sql` - General database helper functions
2. `002_delete-user-account.sql` - User account deletion function
3. `003_list-businesses-rpc.sql` - Optimized RPC function for business listings with filtering and pagination

## How to Run Migrations

### Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of each migration file
4. Run them in order (starting with 001_core)

### Using Supabase CLI
```bash
# Connect to your database
supabase db reset

# Or run individual migrations
psql $DATABASE_URL < src/app/lib/migrations/001_core/001_setup-database.sql
```

## Notes

- **Order Matters**: Always run migrations in numerical order
- **Idempotent**: Most migrations use `IF NOT EXISTS` or `DROP ... IF EXISTS` to be safe for re-runs
- **RLS Policies**: Most tables have Row Level Security enabled for data protection
- **Functions**: Database functions are marked as `SECURITY DEFINER` where needed
- **Dependencies**: Later migrations may depend on tables/functions from earlier ones

## Adding New Migrations

When adding new migrations:
1. Choose the appropriate category folder
2. Use the next sequential number (e.g., `006_new-feature.sql`)
3. Include comments explaining what the migration does
4. Test the migration in a development environment first
5. Update this README with the new migration details

