/**
 * Initial Data Load Script
 * סורק את כל הטאלנטים בפעם הראשונה ומעבד עם Gemini
 * 
 * Usage: npm run scrape:initial
 */

import { getOrchestrator } from '../src/lib/scrape/orchestrator';
import { createServerClient } from '../src/lib/supabase/server';

// ============================================
// Target Talents for Israel Bidur
// ============================================

const TARGET_TALENTS = [
  // זמרים ישראליים
  'noa_kirel',
  'staticben',
  'elladortavladmiri',
  'omer.adam',
  'edenshuka',
  
  // שחקנים
  'shira_haas',
  'gal_gadot',
  
  // ריאליטי
  'bigbrother_israel',
  
  // טלוויזיה
  'reshet13',
  'kan_11',
];

// ============================================
// Main Function
// ============================================

async function initialScrape() {
  console.log('════════════════════════════════════════');
  console.log('🚀 Israel Bidur - Initial Data Load');
  console.log(`📋 Scraping ${TARGET_TALENTS.length} talents`);
  console.log('════════════════════════════════════════\n');

  const supabase = createServerClient();
  const orchestrator = getOrchestrator();

  const results: any[] = [];
  let successCount = 0;
  let totalPosts = 0;
  let totalHighlights = 0;

  // Process each talent
  for (let i = 0; i < TARGET_TALENTS.length; i++) {
    const username = TARGET_TALENTS[i];
    const num = i + 1;

    console.log(`\n┌─────────────────────────────────────`);
    console.log(`│ [${num}/${TARGET_TALENTS.length}] @${username}`);
    console.log(`└─────────────────────────────────────\n`);

    try {
      const result = await orchestrator.orchestrate(
        {
          username,
          fullScrape: true,
          processWithAI: true,
          postsLimit: 50,
          highlightsLimit: 10,
        },
        (step, progress, message) => {
          console.log(`  [${progress}%] ${step}: ${message}`);
        }
      );

      if (result.success) {
        successCount++;
        totalPosts += result.stats.postsSaved;
        totalHighlights += result.stats.highlightsSaved;

        console.log(`  ✅ Success: ${result.stats.postsSaved} posts, ${result.stats.highlightsSaved} highlights`);
      } else {
        console.log(`  ❌ Failed: ${result.error}`);
      }

      results.push({
        username,
        success: result.success,
        stats: result.stats,
        duration: result.duration,
        error: result.error,
      });

      // Delay between talents (rate limiting)
      if (i < TARGET_TALENTS.length - 1) {
        console.log(`\n  ⏳ Waiting 5 seconds before next talent...\n`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);

      results.push({
        username,
        success: false,
        error: error.message,
      });
    }
  }

  // ====================================
  // Final Summary
  // ====================================
  console.log('\n════════════════════════════════════════');
  console.log('✅ Initial Scrape Complete!');
  console.log('════════════════════════════════════════');
  console.log(`\n📊 Summary:`);
  console.log(`  • Success: ${successCount}/${TARGET_TALENTS.length} talents`);
  console.log(`  • Total Posts: ${totalPosts}`);
  console.log(`  • Total Highlights: ${totalHighlights}`);
  console.log(`  • Failed: ${TARGET_TALENTS.length - successCount}`);
  console.log('\n📋 Detailed Results:');

  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`  ${icon} @${result.username}: ${result.success ? `${result.stats.postsSaved} posts` : result.error}`);
  });

  console.log('\n════════════════════════════════════════\n');

  // Save summary to DB
  await supabase.from('scrape_jobs').insert({
    job_type: 'initial_load',
    status: 'completed',
    profiles_scraped: successCount,
    posts_scraped: totalPosts,
    highlights_scraped: totalHighlights,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    triggered_by: 'script',
    metadata: { results },
  });

  process.exit(0);
}

// ====================================
// Run Script
// ====================================

initialScrape().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
