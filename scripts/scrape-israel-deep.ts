/**
 * Deep Scrape - Israel Bidur COMPLETE profile
 * סריקה עמוקה של ישראל בידור - הכל כולל הכל!
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

import { scrapeAndProcessTalent } from '../src/lib/scrape/orchestrator';

const USERNAME = 'israel_bidur';
const MAX_POSTS = 500; // Get ALL posts
const MAX_HIGHLIGHTS = 100; // Get ALL highlights

async function deepScrapeIsrael() {
  console.log('═══════════════════════════════════════════');
  console.log('🔥 DEEP SCRAPE - Israel Bidur FULL');
  console.log('═══════════════════════════════════════════');
  console.log(`\n📋 Username: @${USERNAME}`);
  console.log(`📸 Max Posts: ${MAX_POSTS} (ALL POSTS!)`);
  console.log(`⭐ Max Highlights: ${MAX_HIGHLIGHTS} (ALL HIGHLIGHTS!)`);
  console.log(`🎙️  Transcription: YES (OpenAI Whisper)`);
  console.log(`⚡ AI Processing: YES (Gemini 3 Pro / GPT-5.2)`);
  console.log('\n');

  const startTime = Date.now();

  try {
    const result = await scrapeAndProcessTalent(
      USERNAME,
      true, // Process with AI
      (step, progress, message) => {
        const emoji = 
          step === 'profile' ? '👤' :
          step === 'posts' ? '📸' :
          step === 'highlights' ? '⭐' :
          step === 'ai' ? '🤖' : '📋';
        
        console.log(`  ${emoji} [${progress}%] ${message}`);
      },
      MAX_POSTS, // Get ALL posts!
      MAX_HIGHLIGHTS // Get ALL highlights!
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n═══════════════════════════════════════════');
    if (result.success) {
      console.log('✅ DEEP SCRAPE COMPLETED SUCCESSFULLY!');
      console.log('═══════════════════════════════════════════\n');
      console.log('📊 Results:');
      console.log(`  • Profile: ✅ @${USERNAME}`);
      console.log(`  • Posts: ${result.stats.postsSaved.toLocaleString()}`);
      console.log(`  • Highlights: ${result.stats.highlightsSaved}`);
      console.log(`  • Stories/Videos: ${result.stats.highlightItemsSaved} (transcribed)`);
      console.log(`  • AI Insights: ${result.stats.insightsGenerated ? '✅ Generated' : '⏭️  Skipped'}`);
      console.log(`  • Duration: ${duration}s`);
      console.log(`\n💾 All data saved to Supabase!`);
    } else {
      console.log('❌ SCRAPE FAILED');
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

deepScrapeIsrael();
