/**
 * Setup pgvector columns and RPC functions in Supabase
 * Usage: npm run db:setup-vectors
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function runSQL(sql: string, label: string): Promise<boolean> {
  console.log(`  Running: ${label}...`);

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  // The REST API doesn't support raw SQL. Use the SQL endpoint instead.
  // Supabase exposes a /pg endpoint for service role SQL execution.
  const sqlResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!sqlResponse.ok) {
    // Fallback: try using the pg-meta endpoint
    const metaResponse = await fetch(`${SUPABASE_URL.replace('.supabase.co', '.supabase.co')}/pg/query`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!metaResponse.ok) {
      console.error(`  FAILED: ${label}`);
      console.error(`  Status: ${metaResponse.status}`);
      const text = await metaResponse.text().catch(() => '');
      if (text) console.error(`  Response: ${text.substring(0, 200)}`);
      return false;
    }
  }

  console.log(`  OK: ${label}`);
  return true;
}

async function main() {
  console.log('============================================');
  console.log('  Setup pgvector for Talent Content');
  console.log('============================================\n');

  // Read the migration SQL file
  const sqlPath = resolve(__dirname, '..', 'supabase-vector-migration.sql');
  let fullSQL: string;

  try {
    fullSQL = readFileSync(sqlPath, 'utf-8');
  } catch {
    console.error(`Could not read ${sqlPath}`);
    process.exit(1);
  }

  // Try running the full SQL
  const success = await runSQL(fullSQL, 'Full migration');

  if (!success) {
    console.log('\n  Automated SQL execution failed.');
    console.log('  Please run the SQL manually in the Supabase Dashboard:');
    console.log(`  1. Go to ${SUPABASE_URL.replace('.supabase.co', '.supabase.co')}`);
    console.log('  2. Open SQL Editor');
    console.log(`  3. Paste contents of: supabase-vector-migration.sql`);
    console.log('  4. Click "Run"\n');

    // Print the SQL for easy copy-paste
    console.log('--- SQL to run manually ---');
    console.log(fullSQL);
    console.log('--- End SQL ---\n');
  } else {
    console.log('\nMigration completed successfully!');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
