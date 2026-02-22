// Run this script to verify Supabase tables are set up correctly
// Usage: node verify-supabase-setup.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTables() {
  console.log('🔍 Verifying Supabase tables...\n');

  const tables = ['users', 'documents', 'signatures', 'audit_logs'];
  const results = {};

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error(`❌ Table "${table}": ERROR - ${error.message}`);
        results[table] = { exists: false, error: error.message };
      } else {
        const { count: rowCount } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        console.log(`✅ Table "${table}": EXISTS (${rowCount || 0} rows)`);
        results[table] = { exists: true, rowCount: rowCount || 0 };
      }
    } catch (err) {
      console.error(`❌ Table "${table}": EXCEPTION - ${err.message}`);
      results[table] = { exists: false, error: err.message };
    }
  }

  console.log('\n📊 Summary:');
  console.log('─'.repeat(50));
  for (const [table, result] of Object.entries(results)) {
    if (result.exists) {
      console.log(`✅ ${table}: ${result.rowCount} rows`);
    } else {
      console.log(`❌ ${table}: ${result.error || 'Not accessible'}`);
    }
  }

  // Check signatures table structure
  console.log('\n🔍 Checking signatures table structure...');
  try {
    const { data: sample, error } = await supabase
      .from('signatures')
      .select('*')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      console.log('⚠️  Signatures table is empty (this is OK if you haven\'t placed signatures yet)');
    } else if (error) {
      console.error(`❌ Error checking signatures: ${error.message}`);
    } else {
      console.log('✅ Signatures table structure is correct');
      if (sample && sample.length > 0) {
        console.log('   Sample signature:', JSON.stringify(sample[0], null, 2));
      }
    }
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
  }

  // Check storage bucket
  console.log('\n🔍 Checking storage bucket...');
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error(`❌ Error listing buckets: ${error.message}`);
    } else {
      const documentsBucket = buckets?.find(b => b.name === 'documents');
      if (documentsBucket) {
        console.log('✅ Storage bucket "documents" exists');
      } else {
        console.log('❌ Storage bucket "documents" NOT FOUND');
        console.log('   Available buckets:', buckets?.map(b => b.name).join(', ') || 'none');
      }
    }
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
  }

  console.log('\n' + '─'.repeat(50));
  console.log('✅ Verification complete!');
  console.log('\nIf tables are missing or have errors, run the SQL in supabase-schema.sql');
  console.log('in Supabase Dashboard → SQL Editor → New query');
}

verifyTables().catch(console.error);
