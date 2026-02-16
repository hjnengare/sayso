/**
 * Apply migration to fix category column reference in update_business_stats function
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🔧 Applying migration to fix category column reference...\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260216_fix_category_column_in_update_business_stats.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Executing migration SQL...');
    
    // Execute the migration - note: this uses the raw SQL execution
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      // Try alternative approach - execute via direct connection
      console.log('⚠️  RPC method not available, trying direct execution...');
      
      // Split into individual statements and execute
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.includes('CREATE OR REPLACE FUNCTION')) {
          // For function creation, we need to use the full statement
          const { error: execError } = await supabase.rpc('exec', { 
            sql: statement + ';' 
          });
          
          if (execError) {
            console.error('❌ Error executing statement:', execError.message);
            console.log('\n📋 Statement that failed:', statement.substring(0, 200) + '...');
            throw execError;
          }
        }
      }
    }
    
    console.log('✅ Migration applied successfully!');
    console.log('\n🔄 Now run the percentile calculation script again:');
    console.log('   node scripts/recalculate-percentiles.js');
    
  } catch (error) {
    console.error('\n❌ Failed to apply migration:', error.message);
    console.log('\n📝 Manual steps:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Paste and execute the contents of:');
    console.log('   supabase/migrations/20260216_fix_category_column_in_update_business_stats.sql');
    process.exit(1);
  }
}

applyMigration();
