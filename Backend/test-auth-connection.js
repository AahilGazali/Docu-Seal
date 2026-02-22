/**
 * Quick test script to verify auth database connection
 * Run with: node test-auth-connection.js
 */

require('dotenv').config();

async function testAuthConnection() {
  try {
    console.log('🔍 Testing auth database connection...\n');
    
    const { supabase } = require('./src/config/supabase');
    
    // Test 1: Check if users table exists
    console.log('1. Checking if users table exists...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersError) {
      console.error('❌ ERROR: Cannot access users table');
      console.error('   Error:', usersError.message);
      console.error('   Code:', usersError.code);
      
      if (usersError.code === '42P01' || usersError.message?.includes('does not exist')) {
        console.error('\n   💡 SOLUTION: Run the SQL schema in Supabase SQL Editor:');
        console.error('   File: Backend/supabase-schema.sql');
      }
      return;
    }
    
    console.log('✅ Users table exists');
    console.log(`   Found ${users?.length || 0} user(s)\n`);
    
    // Test 2: Try a simple query
    console.log('2. Testing database query...');
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ ERROR querying users:', countError.message);
      return;
    }
    
    console.log(`✅ Database query successful`);
    console.log(`   Total users: ${count || 0}\n`);
    
    console.log('✅ All tests passed! Auth database connection is working.\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    console.error('   Stack:', error.stack);
  }
}

testAuthConnection()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
