const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  console.log('Connecting to Supabase at:', supabaseUrl);
  
  // We can't list tables directly with the JS client easily without SQL editor access or running a query
  // So we'll try to insert a dummy row into 'organizations' to see if it works, or just check if we can query it.
  
  const { data, error } = await supabase
    .from('organizations')
    .select('count', { count: 'exact', head: true });

  if (error) {
    console.error('Connection failed or error querying "organizations":', error.message);
  } else {
    console.log('Successfully connected! "organizations" table exists.');
    console.log(`Current organization count: ${data === null ? 0 : 'Available (Head request)'}`);
  }

  // Let's try to list all tables using a system query if the role allows
  // This usually requires high privs, but let's try.
  // Note: The JS client is an API client, not a full SQL client. 
  // To truly "manage" the DB schema, we usually use the Supabase CLI or raw SQL via the dashboard.
  // But for this app, we can run SQL via the "rpc" interface if we have a function set up, or just use standard CRUD.
}

listTables();
