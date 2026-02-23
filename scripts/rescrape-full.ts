/**
 * Full re-scrape of Israel Bidur content
 * Usage: npm run rescrape:full
 */

import 'dotenv/config';

// Force load .env.local
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '..', '.env.local') });

async function main() {
  console.log('============================================');
  console.log('  Israel Bidur — Full Re-Scrape');
  console.log('============================================\n');

  // Dynamic import to ensure env vars are loaded first
  const { scrapeAndProcessTalent } = await import('../src/lib/scrape/orchestrator');

  const username = 'israel_bidur';

  console.log(`Starting full scrape for @${username}...`);
  console.log('Config: 500 posts, 100 highlights, AI processing enabled\n');

  const result = await scrapeAndProcessTalent(
    username,
    true, // fullScrape
    (step, progress, message) => {
      console.log(`  [${progress}%] ${step}: ${message}`);
    },
    500, // maxPosts
    100  // maxHighlights
  );

  console.log('\n============================================');
  console.log('  Results:');
  console.log(`  Success:          ${result.success}`);
  console.log(`  Profile saved:    ${result.stats.profileSaved}`);
  console.log(`  Posts saved:      ${result.stats.postsSaved}`);
  console.log(`  Highlights saved: ${result.stats.highlightsSaved}`);
  console.log(`  Highlight items:  ${result.stats.highlightItemsSaved}`);
  console.log(`  Insights:         ${result.stats.insightsGenerated}`);
  console.log(`  Duration:         ${(result.duration / 1000).toFixed(1)}s`);
  if (result.error) console.log(`  Error:            ${result.error}`);
  console.log('============================================\n');

  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
