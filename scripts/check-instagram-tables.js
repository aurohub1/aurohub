require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  console.log('URL:', supabaseUrl ? 'set' : 'missing');
  console.log('Key:', supabaseKey ? 'set' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function run() {
  // Method 1: Try to get all tables and filter
  console.log('\n=== Checking for Instagram/Token tables ===\n');

  const tables = [
    'instagram_credentials',
    'instagram_tokens',
    'tokens',
    'social_tokens',
    'oauth_tokens'
  ];

  for (const tableName of tables) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (!error) {
      console.log(`✓ Table "${tableName}" exists`);
      if (data && data.length > 0) {
        console.log('  Sample columns:', Object.keys(data[0]).join(', '));
      }
    }
  }

  console.log('\n=== Columns in "stores" table ===\n');

  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('*')
    .limit(1);

  if (storesError) {
    console.error('Error querying stores:', storesError.message);
  } else if (stores && stores.length > 0) {
    const columns = Object.keys(stores[0]);
    console.log('Columns:', columns.join(', '));
    console.log('\nTotal columns:', columns.length);
  } else {
    console.log('No data in stores table');
  }
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
