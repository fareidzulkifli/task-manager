const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env vars if using dotenv (not installed, so we rely on process.env being set)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Environment variables missing!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const tables = ['organizations', 'projects', 'tasks', 'task_attachments'];
  let allExist = true;

  console.log('Checking tables...');
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error && error.code === '42P01') { // undefined_table
      console.log(`❌ Table '${table}' does not exist.`);
      allExist = false;
    } else if (error) {
      console.log(`⚠️ Error checking '${table}': ${error.message}`);
    } else {
      console.log(`✅ Table '${table}' exists.`);
    }
  }
  return allExist;
}

async function main() {
  const schemaPath = path.join(__dirname, '../db/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('
=== Supabase Schema Setup ===
');
  console.log('Please run the following SQL in your Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/okvsnhmoqaulrbwrqifo/sql
');
  console.log('--------------------------------------------------');
  console.log(sql);
  console.log('--------------------------------------------------
');
  
  // Wait for user confirmation (basic simulation since this is non-interactive usually)
  console.log('Checking if tables are ready...');
  const ready = await checkTables();

  if (ready) {
    console.log('
🎉 Database schema is ready!');
  } else {
    console.log('
⚠️ Some tables are missing. Please run the SQL above manually.');
  }
}

main();
