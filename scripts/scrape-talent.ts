/**
 * Single Talent Scrape Script
 * סורק טאלנט בודד עם Gemini processing
 * 
 * Usage: npm run scrape:talent noa_kirel
 */

import { scrapeAndProcessTalent } from '../src/lib/scrape/orchestrator';

async function scrapeTalent() {
  const username = process.argv[2];

  if (!username) {
    console.error('❌ Usage: npm run scrape:talent <username>');
    console.error('   Example: npm run scrape:talent noa_kirel');
    process.exit(1);
  }

  console.log('════════════════════════════════════════');
  console.log(`🚀 Scraping @${username}`);
  console.log('════════════════════════════════════════\n');

  try {
    const result = await scrapeAndProcessTalent(
      username,
      true,
      (step, progress, message) => {
        console.log(`[${progress}%] ${step}: ${message}`);
      }
    );

    if (result.success) {
      console.log('\n✅ Success!');
      console.log(`   • Posts: ${result.stats.postsSaved}`);
      console.log(`   • Highlights: ${result.stats.highlightsSaved}`);
      console.log(`   • AI Insights: ${result.stats.insightsGenerated ? 'Yes' : 'No'}`);
      console.log(`   • Duration: ${(result.duration / 1000).toFixed(1)}s`);
    } else {
      console.error('\n❌ Failed:', result.error);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

scrapeTalent();
