const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const password = '@Cik1991!@#123';
const projectRef = 'okvsnhmoqaulrbwrqifo';

async function applyRLS() {
  const client = new Client({
    connectionString: `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully.');

    const rlsSql = fs.readFileSync(path.join(__dirname, '../db/rls_policies.sql'), 'utf8');
    
    console.log('Applying RLS policies...');
    await client.query(rlsSql);
    console.log('RLS policies applied successfully!');

  } catch (err) {
    console.error('Failed to apply RLS:', err.message);
  } finally {
    await client.end();
  }
}

applyRLS();
