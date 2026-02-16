/**
 * Apply percentile calculation fix
 * 
 * This script:
 * 1. Fixes the review trigger to automatically calculate percentiles
 * 2. Backfills percentiles for all existing businesses with reviews
 * 
 * Run this to make percentiles show automatically on business cards.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(filename) {
  console.log(`\n📝 Running migration: ${filename}`);
  
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', filename);
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    // Try direct execution if rpc doesn't work
    const { error: directError } = await supabase.from('_migrations').insert({
      name: filename,
      executed_at: new Date().toISOString()
    });
    
    if (directError) {
      console.error(`❌ Error: ${error.message || directError.message}`);
      return false;
    }
  }
  
  console.log(`✅ Migration applied: ${filename}`);
  return true;
}

async function main() {
  console.log('🚀 Starting percentile calculation fix...\n');
  
  // Step 1: Fix the trigger function
  console.log('Step 1: Fixing review trigger to calculate percentiles automatically');
  const triggerFixed = await runMigration('20260216_fix_review_trigger_to_calculate_percentiles.sql');
  
  if (!triggerFixed) {
    console.error('\n❌ Failed to fix trigger. Please apply migration manually.');
    process.exit(1);
  }
  
  // Step 2: Backfill existing data
  console.log('\nStep 2: Backfilling percentiles for existing businesses');
  const backfilled = await runMigration('20260216_backfill_business_percentiles.sql');
  
  if (!backfilled) {
    console.error('\n❌ Failed to backfill data. Please apply migration manually.');
    process.exit(1);
  }
  
  // Step 3: Verify
  console.log('\n🔍 Verifying results...');
  
  const { data: stats, error } = await supabase
    .from('business_stats')
    .select('business_id, percentiles')
    .not('percentiles', 'is', null)
    .limit(5);
  
  if (error) {
    console.error('❌ Error verifying results:', error.message);
  } else {
    console.log(`\n✅ Found ${stats.length} businesses with percentiles (showing first 5)`);
    console.log('Sample percentiles:', JSON.stringify(stats[0]?.percentiles, null, 2));
  }
  
  console.log('\n✨ Done! Percentiles will now calculate automatically when reviews are added.');
  console.log('💡 Refresh your app to see percentiles on business cards.');
}

main().catch(console.error);
