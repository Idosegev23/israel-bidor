/**
 * Scrape ALL talents mentioned by Israel Bidur
 * סורק את כל מי שמוזכר בפוסטים של ישראל בידור
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

import { createServerClient } from '../src/lib/supabase/server';
import { scrapeAndProcessTalent } from '../src/lib/scrape/orchestrator';

// כל הטאלנטים שנמצאו בפוסטים של israel_bidur
const ALL_TALENTS = [
  // סלבריטאים
  'noa_kirel',
  'gal_gadot',
  'staticben',
  'shira_haas',
  'galmalka',
  'daniella_vaisvol',
  'moran_martziano',
  'ronnweinberg',
  'itzikcohenofficial',
  'yoramcohenn',
  'yuda_buhbut',
  'noamboaron',
  'leeayash',
  'aline_cohenn',
  'yovelevi_',
  'eliya_levi73',
  'matan_azran_',
  'itzik_ohana_',
  'yaelfilipoviz',
  'ronibendavidd',
  
  // מדיה/תקשורת
  'ynetgram',
  'i24news_he',
  'pnaiplus',
  'houseof_podcast',
  'cameritheatre',
  'nan_life_photographer',
  
  // מותגים (רלוונטיים לבידור)
  'my_ofer',
  'ofer_kiryon',
  'super_pharm',
  'strausswater',
  'buyme.co.il',
  'twentyfourseven_tfs',
  'drjart_eu',
  
  // אחרים
  'sulika.news',
  'hebrew_academy',
  'liyanoga.x',
  'harabanit',
  'ghefen',
  'baron.productions.ltd',
  'avital.aviv',
  'bring.haimanot.home',
  'pro.strauss',
];

async function scrapeAllMentions() {
  console.log('═══════════════════════════════════════════');
  console.log('🚀 FULL SCRAPE - All Israel Bidur Mentions');
  console.log(`📋 Total talents to scrape: ${ALL_TALENTS.length}`);
  console.log('═══════════════════════════════════════════\n');

  const supabase = createServerClient();
  const results: any[] = [];

  let successCount = 0;
  let totalPosts = 0;
  let totalHighlights = 0;
  let skippedCount = 0;

  for (let i = 0; i < ALL_TALENTS.length; i++) {
    const username = ALL_TALENTS[i];
    const num = i + 1;

    console.log(`\n┌─────────────────────────────────────────`);
    console.log(`│ [${num}/${ALL_TALENTS.length}] @${username}`);
    console.log(`└─────────────────────────────────────────\n`);

    // Check if already scraped
    const { data: existing } = await supabase
      .from('talent_profiles')
      .select('id, scrape_status, last_scraped_at')
      .eq('username', username)
      .single();

    if (existing && existing.scrape_status === 'completed') {
      const lastScraped = new Date(existing.last_scraped_at);
      const hoursSince = (Date.now() - lastScraped.getTime()) / (1000 * 60 * 60);

      if (hoursSince < 24) {
        console.log(`  ⏭️  Already scraped ${hoursSince.toFixed(1)}h ago. Skipping.`);
        skippedCount++;
        continue;
      }
    }

    try {
      const result = await scrapeAndProcessTalent(
        username,
        true,
        (step, progress, message) => {
          console.log(`  [${progress}%] ${message}`);
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
      if (i < ALL_TALENTS.length - 1) {
        console.log(`\n  ⏳ Waiting 5 seconds...\n`);
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

  // Final Summary
  console.log('\n═══════════════════════════════════════════');
  console.log('✅ FULL SCRAPE COMPLETE!');
  console.log('═══════════════════════════════════════════');
  console.log(`\n📊 Summary:`);
  console.log(`  • Success: ${successCount}/${ALL_TALENTS.length} talents`);
  console.log(`  • Skipped: ${skippedCount} (already recent)`);
  console.log(`  • Total Posts: ${totalPosts.toLocaleString()}`);
  console.log(`  • Total Highlights: ${totalHighlights}`);
  console.log(`  • Failed: ${ALL_TALENTS.length - successCount - skippedCount}`);

  // Save summary
  await supabase.from('scrape_jobs').insert({
    job_type: 'bulk_mentions_scrape',
    status: 'completed',
    profiles_scraped: successCount,
    posts_scraped: totalPosts,
    highlights_scraped: totalHighlights,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    triggered_by: 'script',
    metadata: { results, total_talents: ALL_TALENTS.length },
  });

  console.log('\n═══════════════════════════════════════════\n');

  process.exit(0);
}

scrapeAllMentions().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
