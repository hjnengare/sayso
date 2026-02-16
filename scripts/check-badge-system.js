/**
 * Badge System Health Check
 * 
 * This script checks if the badge system is working correctly:
 * 1. Finds users who have reviews but no badges
 * 2. Shows what badges they should have earned
 * 3. Provides commands to manually fix missing badges
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBadgeSystem() {
  console.log('🔍 Checking Badge System Health...\n');

  try {
    // 1. Get all users who have written reviews (using RPC for aggregation)
    console.log('📊 Finding users with reviews...');
    const { data: reviews, error: reviewError } = await supabase
      .from('reviews')
      .select('user_id');

    if (reviewError) {
      console.error('❌ Error fetching reviews:', reviewError);
      return;
    }

    // Aggregate review counts by user 
    const reviewStats = {};
    for (const review of reviews || []) {
      if (review.user_id) {
        reviewStats[review.user_id] = (reviewStats[review.user_id] || 0) + 1;
      }
    }

    const userReviewCounts = Object.entries(reviewStats).map(([user_id, count]) => ({
      user_id,
      count
    })).sort((a, b) => b.count - a.count);

    console.log(`Found ${userReviewCounts.length} users with reviews\n`);

    // 2. Check which users have badges
    const { data: usersWithBadges, error: badgeError } = await supabase
      .from('user_badges')
      .select('user_id, badge_id')
      .order('user_id');

    if (badgeError) {
      console.error('❌ Error fetching user badges:', badgeError);
      return;
    }

    // Get badge names separately
    const { data: allBadges, error: allBadgeError } = await supabase
      .from('badges')
      .select('id, name');

    if (allBadgeError) {
      console.error('❌ Error fetching badge definitions:', allBadgeError);
      return;
    }

    // Create a badge lookup map
    const badgeNameMap = new Map();
    for (const badge of allBadges || []) {
      badgeNameMap.set(badge.id, badge.name);
    }

    const badgeMap = new Map();
    for (const userBadge of usersWithBadges || []) {
      if (!badgeMap.has(userBadge.user_id)) {
        badgeMap.set(userBadge.user_id, []);
      }
      badgeMap.get(userBadge.user_id).push({
        badge_id: userBadge.badge_id,
        badge_name: badgeNameMap.get(userBadge.badge_id) || userBadge.badge_id
      });
    }

    console.log(`Found ${badgeMap.size} users with badges\n`);

    // 3. Find users who should have badges but don't
    const problemUsers = [];
    for (const stat of userReviewCounts) {
      const userId = stat.user_id;
      const reviewCount = stat.count;
      const userBadges = badgeMap.get(userId) || [];

      // Check if they should have the "New Voice" badge (1+ reviews) but don't
      const hasNewVoiceBadge = userBadges.some(b => b.badge_id === 'milestone_new_voice');
      
      if (reviewCount >= 1 && !hasNewVoiceBadge) {
        problemUsers.push({
          userId,
          reviewCount,
          currentBadges: userBadges.length,
          missingBadges: ['milestone_new_voice']  // Should have New Voice
        });
      }
    }

    console.log('🔍 Analysis Results:');
    console.log(`- ${userReviewCounts.length} users have written reviews`);
    console.log(`- ${badgeMap.size} users have received badges`);
    console.log(`- ${problemUsers.length} users are missing expected badges\n`);

    if (problemUsers.length > 0) {
      console.log('❌ Users Missing Expected Badges:');
      console.log('┌─────────┬─────────────┬────────────┬──────────────────────┐');
      console.log('│ User ID │ Review Cnt  │ Badge Cnt  │ Missing Badges       │');
      console.log('├─────────┼─────────────┼────────────┼──────────────────────┤');
      
      for (const user of problemUsers.slice(0, 10)) { // Show first 10
        const userId = user.userId.substring(0, 8) + '...';
        console.log(`│ ${userId.padEnd(7)} │ ${user.reviewCount.toString().padStart(11)} │ ${user.currentBadges.toString().padStart(10)} │ ${'New Voice'.padEnd(20)} │`);
      }
      console.log('└─────────┴─────────────┴────────────┴──────────────────────┘');
      
      if (problemUsers.length > 10) {
        console.log(`... and ${problemUsers.length - 10} more users\n`);
      } else {
        console.log('');
      }

      // 4. Check if badge awarding functions exist
      console.log('🔧 Checking badge system functions...');
      const { data: functions, error: funcError } = await supabase.rpc('check_user_badges', {
        p_user_id: problemUsers[0].userId 
      });

      if (funcError) {
        console.error('❌ Badge function test failed:', funcError.message);
        console.log('\nThe badge system functions may not be properly installed.');
        console.log('Run the badge system migrations to fix this.\n');
      } else {
        console.log('✅ Badge functions are working');
        
        // 5. Suggest manual fix
        console.log('\n🔧 To fix missing badges, you can:');
        console.log('1. Run the manual badge check for affected users:');
        console.log('2. Or use the API endpoint: POST /api/badges/check-and-award');
        console.log('\n📋 SQL to manually award missing "New Voice" badges:');
        console.log('```sql');
        console.log(`INSERT INTO public.user_badges (user_id, badge_id, awarded_at)`);
        console.log(`SELECT DISTINCT r.user_id, 'milestone_new_voice', NOW()`);
        console.log(`FROM reviews r`);
        console.log(`LEFT JOIN user_badges ub ON r.user_id = ub.user_id AND ub.badge_id = 'milestone_new_voice'`);
        console.log(`WHERE ub.user_id IS NULL`);
        console.log(`ON CONFLICT (user_id, badge_id) DO NOTHING;`);
        console.log('```\n');
      }

    } else {
      console.log('✅ All users with reviews have appropriate badges!');
    }

    // 6. Show badge distribution
    const badgeCounts = {};
    for (const userBadges of badgeMap.values()) {
      for (const badge of userBadges) {
        const badgeName = badge.badge_name || badge.badge_id;
        badgeCounts[badgeName] = (badgeCounts[badgeName] || 0) + 1;
      }
    }

    console.log('\n📈 Badge Distribution:');
    const sortedBadges = Object.entries(badgeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    for (const [badgeName, count] of sortedBadges) {
      console.log(`  ${badgeName}: ${count} users`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the check
checkBadgeSystem().then(() => {
  console.log('\n🏁 Badge system check complete!');
  process.exit(0);
}).catch(console.error);