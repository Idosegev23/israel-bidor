/**
 * Email Client — Placeholder / Abstraction Layer
 * The actual email provider will be chosen later.
 * For now, this logs emails to console.
 *
 * When ready: replace PlaceholderEmailProvider with a real implementation
 * (SendGrid, MailerLite, Customer.io, etc.)
 */

// ============================================
// Interface — all providers must implement this
// ============================================

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  sendEmail(
    to: string,
    subject: string,
    html: string,
    options?: {
      from?: string;
      replyTo?: string;
      tags?: string[];
    }
  ): Promise<EmailSendResult>;
}

// ============================================
// Placeholder Provider (logs to console)
// ============================================

class PlaceholderEmailProvider implements EmailProvider {
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    options?: { from?: string; replyTo?: string; tags?: string[] }
  ): Promise<EmailSendResult> {
    console.log(`[Email-Placeholder] Would send email:`);
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  HTML length: ${html.length} chars`);
    console.log(`  Tags: ${options?.tags?.join(', ') || 'none'}`);

    // Simulate success
    return {
      success: true,
      messageId: `placeholder-${Date.now()}`,
    };
  }
}

// ============================================
// Factory — returns the active provider
// ============================================

let emailProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!emailProvider) {
    const provider = process.env.EMAIL_PROVIDER;

    switch (provider) {
      // Future implementations:
      // case 'sendgrid':
      //   emailProvider = new SendGridProvider();
      //   break;
      // case 'mailerlite':
      //   emailProvider = new MailerLiteProvider();
      //   break;
      default:
        console.log('[Email] Using placeholder provider — no EMAIL_PROVIDER configured');
        emailProvider = new PlaceholderEmailProvider();
    }
  }

  return emailProvider;
}

/**
 * Check if a real email provider is configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.EMAIL_PROVIDER && !!process.env.EMAIL_API_KEY;
}
