/**
 * Quick Badge Test
 * Run this after applying the SQL fix to verify badges are working
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testBadgeFix() {
  console.log('🔍 Testing Badge System Fix...\n');

  try {
    // Check badge distribution
    const { data: userBadges, error } = await supabase
      .from('user_badges')
      .select('badge_id, badges(name)');

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    const badgeCounts = {};
    for (const ub of userBadges || []) {
      const badgeName = ub.badges?.name || ub.badge_id;
      badgeCounts[badgeName] = (badgeCounts[badgeName] || 0) + 1;
    }

    console.log('📊 Current Badge Distribution:');
    Object.entries(badgeCounts).forEach(([name, count]) => {
      console.log(`  ${name}: ${count} users`);
    });

    // Check specifically for New Voice badge
    const newVoiceCount = badgeCounts['New Voice'] || 0;
    if (newVoiceCount > 0) {
      console.log(`\n✅ SUCCESS: ${newVoiceCount} users now have the "New Voice" badge!`);
    } else {
      console.log('\n❌ No "New Voice" badges found. The fix may not have worked.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testBadgeFix().then(() => {
  console.log('\n🏁 Badge test complete!');
  process.exit(0);
}).catch(console.error);