const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const password = '@Cik1991!@#123';
const projectRef = 'okvsnhmoqaulrbwrqifo';

// Variants to try
const variants = [
  // 1. Direct Connection (Legacy)
  {
    connectionString: `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`,
    label: 'Direct Connection'
  },
  // 2. Transaction Pooler (Standard for many projects - testing common hosts)
  {
    connectionString: `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    label: 'Transaction Pooler (US-East-1)'
  }
];

async function tryConnection(variant) {
  const client = new Client({
    connectionString: variant.connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log(`Trying ${variant.label}...`);
    await client.connect();
    console.log(`Connected successfully via ${variant.label}!`);

    const schemaSql = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
    
    console.log('Executing schema migration...');
    await client.query(schemaSql);
    console.log('Migration completed successfully!');
    return true;

  } catch (err) {
    console.error(`${variant.label} failed:`, err.message);
    return false;
  } finally {
    await client.end();
  }
}

async function main() {
  for (const variant of variants) {
    if (await tryConnection(variant)) {
      break;
    }
  }
}

main();
