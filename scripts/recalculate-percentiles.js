/**
 * Recalculate percentiles for all businesses with reviews
 * 
 * This directly calls update_business_stats() for each business to calculate percentiles
 * based on review tags (On Time, Friendly, Trustworthy, Good Value)
 */

const { createClient } = require('@supabase/supabase-js');
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

async function recalculatePercentiles() {
  console.log('🚀 Starting percentile calculation for all businesses with reviews...\n');
  
  try {
    // Step 1: Get all businesses that have reviews
    console.log('📊 Finding businesses with reviews...');
    const { data: businesses, error: fetchError } = await supabase
      .from('reviews')
      .select('business_id, businesses(id, name)')
      .not('businesses', 'is', null);
    
    if (fetchError) {
      console.error('❌ Error fetching businesses:', fetchError.message);
      process.exit(1);
    }
    
    // Get unique business IDs
    const uniqueBusinesses = [...new Map(
      businesses
        .filter(r => r.businesses)
        .map(r => [r.businesses.id, r.businesses])
    ).values()];
    
    console.log(`✅ Found ${uniqueBusinesses.length} businesses with reviews\n`);
    
    // Step 2: Process each business
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < uniqueBusinesses.length; i++) {
      const business = uniqueBusinesses[i];
      
      try {
        // Call update_business_stats RPC function
        const { error: updateError } = await supabase.rpc('update_business_stats', {
          p_business_id: business.id
        });
        
        if (updateError) {
          console.error(`❌ Error processing ${business.name}: ${updateError.message}`);
          errorCount++;
        } else {
          successCount++;
          
          // Show progress every 10 businesses
          if ((i + 1) % 10 === 0) {
            console.log(`📈 Progress: ${i + 1}/${uniqueBusinesses.length} businesses processed`);
          }
        }
      } catch (err) {
        console.error(`❌ Exception processing ${business.name}:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n✨ Recalculation complete!');
    console.log(`✅ Success: ${successCount} businesses`);
    console.log(`❌ Errors: ${errorCount} businesses`);
    
    // Step 3: Verify results
    console.log('\n🔍 Verifying percentile data...');
    const { data: statsCheck, error: checkError } = await supabase
      .from('business_stats')
      .select('business_id, percentiles')
      .not('percentiles', 'is', null);
    
    if (checkError) {
      console.error('❌ Error checking stats:', checkError.message);
    } else {
      console.log(`✅ ${statsCheck.length} businesses now have percentiles calculated`);
      
      // Show a sample
      if (statsCheck.length > 0) {
        console.log('\n📊 Sample percentiles:');
        console.log(JSON.stringify(statsCheck[0].percentiles, null, 2));
      }
    }
    
    console.log('\n💡 Refresh your app to see the percentiles on business cards!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

recalculatePercentiles();
