import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getWhatsAppClient } from '@/lib/messaging/whatsapp-client';
import {
  formatWelcome,
  formatPrefUpdated,
  formatHelp,
  formatStopConfirmation,
} from '@/lib/messaging/whatsapp-templates';
import { generateChatResponse, loadConversationContext } from '@/lib/chat-agent/conversation-handler';

/**
 * POST /api/webhooks/whatsapp
 * Receives incoming WhatsApp messages from GreenAPI webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const wa = getWhatsAppClient();
    const supabase = createServerClient();

    // Parse incoming message
    const incoming = wa.parseIncomingWebhook(body);

    if (!incoming) {
      // Not a text message or unrecognized format — acknowledge silently
      return NextResponse.json({ received: true });
    }

    console.log(`[WA-Webhook] Message from ${incoming.phone}: "${incoming.message}"`);

    const { phone, message, senderName } = incoming;
    const normalizedMsg = message.trim().toUpperCase();

    // Look up or create user
    let { data: user } = await supabase
      .from('users')
      .select('id, whatsapp_opt_in, whatsapp_pref')
      .eq('phone', phone)
      .single();

    if (!user) {
      // New user — create and send welcome
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          phone,
          whatsapp_opt_in: true,
          whatsapp_pref: 'breaking_only',
        })
        .select('id, whatsapp_opt_in, whatsapp_pref')
        .single();

      if (newUser) {
        user = newUser;

        // Create empty profile
        await supabase
          .from('user_profiles')
          .insert({ user_id: newUser.id })
          .single();

        // Send welcome message
        await wa.sendMessage(phone, formatWelcome(senderName));

        // Save incoming message to chat_messages
        await saveMessage(supabase, newUser.id, 'user', message);

        return NextResponse.json({ received: true, action: 'new_user_welcome' });
      }
    }

    if (!user) {
      return NextResponse.json({ received: true, error: 'user_creation_failed' });
    }

    // Save incoming message
    await saveMessage(supabase, user.id, 'user', message);

    // Handle commands
    switch (normalizedMsg) {
      case 'STOP': {
        await supabase
          .from('users')
          .update({ whatsapp_opt_in: false, whatsapp_pref: 'off' })
          .eq('id', user.id);

        await wa.sendMessage(phone, formatStopConfirmation());
        await saveMessage(supabase, user.id, 'agent', '[STOP confirmed]');

        return NextResponse.json({ received: true, action: 'stopped' });
      }

      case 'HELP': {
        await wa.sendMessage(phone, formatHelp());
        await saveMessage(supabase, user.id, 'agent', '[HELP menu sent]');

        return NextResponse.json({ received: true, action: 'help' });
      }

      case '1': {
        await supabase
          .from('users')
          .update({ whatsapp_opt_in: true, whatsapp_pref: 'daily' })
          .eq('id', user.id);

        await wa.sendMessage(phone, formatPrefUpdated('daily'));
        await saveMessage(supabase, user.id, 'agent', '[Pref updated: daily]');

        return NextResponse.json({ received: true, action: 'pref_daily' });
      }

      case '2': {
        await supabase
          .from('users')
          .update({ whatsapp_opt_in: true, whatsapp_pref: 'breaking_only' })
          .eq('id', user.id);

        await wa.sendMessage(phone, formatPrefUpdated('breaking_only'));
        await saveMessage(supabase, user.id, 'agent', '[Pref updated: breaking_only]');

        return NextResponse.json({ received: true, action: 'pref_breaking' });
      }

      case '3': {
        await supabase
          .from('users')
          .update({ whatsapp_opt_in: true, whatsapp_pref: 'weekly' })
          .eq('id', user.id);

        await wa.sendMessage(phone, formatPrefUpdated('weekly'));
        await saveMessage(supabase, user.id, 'agent', '[Pref updated: weekly]');

        return NextResponse.json({ received: true, action: 'pref_weekly' });
      }

      default: {
        // Free text — process with the AI chat agent
        // The agent uses live scraped data (hot content, talent info) for context
        console.log(`[WA-Webhook] Free text from ${phone}, processing with chat agent`);

        try {
          // Load conversation context (includes user profile + recent messages)
          const context = await loadConversationContext(user.id);

          // Generate AI response (uses live scraped data for context)
          const agentResponse = await generateChatResponse(context);

          // Send agent response via WhatsApp
          await wa.sendMessage(phone, agentResponse);

          // Save agent response
          await saveMessage(supabase, user.id, 'agent', agentResponse);

          return NextResponse.json({ received: true, action: 'chat_response_sent' });
        } catch (chatError: any) {
          console.error(`[WA-Webhook] Chat agent error:`, chatError.message);
          // Fallback: acknowledge receipt silently
          return NextResponse.json({ received: true, action: 'chat_error', error: chatError.message });
        }
      }
    }
  } catch (error: any) {
    console.error('[WA-Webhook] Error:', error);
    return NextResponse.json({ received: true, error: error.message }, { status: 200 });
    // Always return 200 to GreenAPI to prevent retries
  }
}

// Helper: Save message to chat_messages
async function saveMessage(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  role: 'user' | 'agent',
  message: string
) {
  try {
    await supabase.from('chat_messages').insert({
      user_id: userId,
      role,
      message,
    });
  } catch (error: any) {
    console.error('[WA-Webhook] Failed to save message:', error.message);
  }
}
