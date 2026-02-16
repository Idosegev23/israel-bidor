/**
 * Process Talent with AI
 * מריץ Gemini 3 Pro על טאלנט קיים
 */

// MUST load env FIRST before any other imports
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

import { createServerClient } from '../src/lib/supabase/server';
import { getOpenAIProcessor } from '../src/lib/ai/openai-processor';

async function processTalentAI() {
  const username = process.argv[2];

  if (!username) {
    console.error('❌ Usage: npm run process:ai <username>');
    process.exit(1);
  }

  console.log(`🧠 Processing @${username} with Gemini 3 Pro...\n`);

  const supabase = createServerClient();
  const processor = getOpenAIProcessor();

  try {
    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('talent_profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Get posts
    const { data: posts } = await supabase
      .from('talent_posts')
      .select('*')
      .eq('talent_id', profile.id)
      .order('posted_at', { ascending: false })
      .limit(50);

    // Get highlights
    const { data: highlights } = await supabase
      .from('talent_highlights')
      .select('*')
      .eq('talent_id', profile.id);

    console.log(`📊 Data loaded:`);
    console.log(`   • Posts: ${posts?.length || 0}`);
    console.log(`   • Highlights: ${highlights?.length || 0}\n`);

    if (!posts || posts.length === 0) {
      console.log('⚠️  No posts found. AI processing skipped.');
      process.exit(0);
    }

    console.log('🤖 Running OpenAI GPT-5.2 analysis...\n');

    // Process with OpenAI
    const result = await processor.processTalentData(profile, posts, highlights || []);

    if (!result.success) {
      throw new Error(result.error);
    }

    console.log('✅ AI processing complete!\n');

    // Save insights
    await supabase.from('talent_insights').insert({
      talent_id: profile.id,
      personality: result.insights!.personality,
      topics: result.insights!.topics,
      partnerships: result.insights!.partnerships,
      coupons: result.insights!.coupons,
      audience_insights: result.insights!.audience_insights,
      summary_text: result.insights!.summary_text,
      key_themes: result.insights!.key_themes,
      model_used: 'gpt-5.2',
      tokens_used: result.tokensUsed,
      processing_time_ms: result.processingTimeMs,
    });

    // Update profile
    await supabase
      .from('talent_profiles')
      .update({
        last_processed_at: new Date().toISOString(),
        processing_status: 'completed',
      })
      .eq('id', profile.id);

    console.log('💾 Insights saved to database\n');
    console.log('📊 Summary:');
    console.log(`   • Processing time: ${(result.processingTimeMs! / 1000).toFixed(1)}s`);
    console.log(`   • Tokens used: ${result.tokensUsed?.toLocaleString()}`);
    console.log(`   • Key themes: ${result.insights!.key_themes.join(', ')}`);
    console.log(`   • Partnerships: ${result.insights!.partnerships.length}`);
    console.log(`   • Coupons: ${result.insights!.coupons.length}\n`);

    console.log('✅ Done!\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

processTalentAI();
