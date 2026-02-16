/**
 * Quick Rescan - Only NEW content since last scrape
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

import { getOrchestrator } from '../src/lib/scrape/orchestrator';

const USERNAME = 'israel_bidur';

async function quickRescan() {
  console.log('═══════════════════════════════════════════');
  console.log('⚡ QUICK RESCAN - New Content Only');
  console.log('═══════════════════════════════════════════');
  console.log(`\n📋 Username: @${USERNAME}`);
  console.log(`📸 Scanning last 20 posts`);
  console.log(`⭐ Scanning highlights (stories from 8.2.2026+)`);
  console.log(`🔄 Using UPSERT - skips existing content automatically`);
  console.log('\n');

  const startTime = Date.now();

  try {
    const orchestrator = getOrchestrator();
    
    const result = await orchestrator.quickRescan(USERNAME);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n═══════════════════════════════════════════');
    if (result.success) {
      console.log('✅ QUICK RESCAN COMPLETED!');
      console.log('═══════════════════════════════════════════\n');
      console.log('📊 Results:');
      console.log(`  • NEW Posts: ${result.stats.postsSaved.toLocaleString()}`);
      console.log(`  • NEW Highlights: ${result.stats.highlightsSaved}`);
      console.log(`  • Duration: ${duration}s`);
      console.log(`\n💾 Only NEW content saved to Supabase!`);
    } else {
      console.log('❌ RESCAN FAILED');
      console.log('═══════════════════════════════════════════\n');
      console.log(`Error: ${result.error}`);
    }
    console.log('\n═══════════════════════════════════════════\n');

    process.exit(result.success ? 0 : 1);
  } catch (error: any) {
    console.error('\n❌ Fatal Error:', error.message);
    process.exit(1);
  }
}

quickRescan();
