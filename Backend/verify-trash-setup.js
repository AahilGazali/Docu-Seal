/**
 * Diagnostic script to verify trash/deleted documents functionality
 * Run with: node verify-trash-setup.js
 */

// Load environment variables from .env file
require('dotenv').config();

const { supabase } = require('./src/config/supabase');

async function verifyTrashSetup() {
  console.log('🔍 Verifying trash setup...\n');

  try {
    // 1. Check if deleted_at column exists
    console.log('1. Checking if deleted_at column exists...');
    const { data: testQuery, error: columnError } = await supabase
      .from('documents')
      .select('deleted_at')
      .limit(1);

    if (columnError && columnError.message.includes('deleted_at')) {
      console.error('❌ ERROR: deleted_at column does NOT exist!');
      console.error('   Please run this SQL in Supabase:');
      console.error('   ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;');
      return;
    }
    console.log('✅ deleted_at column exists\n');

    // 2. Count total documents
    console.log('2. Counting documents...');
    const { count: totalCount, error: countError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error counting documents:', countError.message);
      return;
    }
    console.log(`   Total documents: ${totalCount || 0}\n`);

    // 3. Count non-deleted documents
    console.log('3. Counting non-deleted documents...');
    const { count: activeCount, error: activeError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);
    
    if (activeError) {
      console.error('❌ Error counting active documents:', activeError.message);
    } else {
      console.log(`   Active documents: ${activeCount || 0}\n`);
    }

    // 4. Count deleted documents
    console.log('4. Counting deleted documents...');
    const { data: deletedDocs, error: deletedError } = await supabase
      .from('documents')
      .select('id, title, deleted_at')
      .not('deleted_at', 'eq', null)
      .order('deleted_at', { ascending: false });

    if (deletedError) {
      console.error('❌ Error querying deleted documents:', deletedError.message);
      console.error('   Full error:', deletedError);
    } else {
      console.log(`   Deleted documents: ${deletedDocs?.length || 0}`);
      if (deletedDocs && deletedDocs.length > 0) {
        console.log('\n   Sample deleted documents:');
        deletedDocs.slice(0, 5).forEach((doc, idx) => {
          console.log(`   ${idx + 1}. ${doc.title} (ID: ${doc.id})`);
          console.log(`      Deleted at: ${doc.deleted_at}`);
        });
      }
    }

    // 5. Sample a few documents to check their deleted_at status
    console.log('\n5. Sampling documents to check deleted_at values...');
    const { data: sampleDocs, error: sampleError } = await supabase
      .from('documents')
      .select('id, title, deleted_at')
      .limit(5);

    if (sampleError) {
      console.error('❌ Error sampling documents:', sampleError.message);
    } else if (sampleDocs && sampleDocs.length > 0) {
      console.log('   Sample documents:');
      sampleDocs.forEach((doc, idx) => {
        const status = doc.deleted_at ? 'DELETED' : 'ACTIVE';
        console.log(`   ${idx + 1}. ${doc.title} - ${status}`);
        if (doc.deleted_at) {
          console.log(`      deleted_at: ${doc.deleted_at}`);
        }
      });
    } else {
      console.log('   No documents found in database');
    }

    console.log('\n✅ Verification complete!');
    console.log('\n📝 Next steps:');
    console.log('   - If deleted_at column is missing, run the SQL migration');
    console.log('   - If documents exist but deleted_at is null, try deleting a document');
    console.log('   - Check backend logs when deleting/listing documents');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

verifyTrashSetup()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
