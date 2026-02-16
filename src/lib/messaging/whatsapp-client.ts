/**
 * GreenAPI WhatsApp Client
 * Sends and receives WhatsApp messages via GreenAPI REST API
 *
 * Docs: https://greenapi.com/en/docs/api
 * Endpoint: POST https://api.green-api.com/waInstance{id}/{method}/{token}
 */

import axios, { type AxiosInstance } from 'axios';

// ============================================
// Types
// ============================================

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IncomingMessage {
  chatId: string;         // "972501234567@c.us"
  phone: string;          // "972501234567"
  senderName?: string;
  message: string;
  messageId: string;
  timestamp: number;
}

// ============================================
// GreenAPI Client
// ============================================

class GreenAPIClient {
  private client: AxiosInstance;
  private idInstance: string;
  private apiToken: string;

  constructor() {
    this.idInstance = process.env.GREENAPI_ID_INSTANCE || '';
    this.apiToken = process.env.GREENAPI_API_TOKEN || '';
    const baseUrl = process.env.GREENAPI_API_URL || 'https://api.green-api.com';

    if (!this.idInstance || !this.apiToken) {
      console.warn('[WhatsApp] GreenAPI credentials not configured');
    }

    this.client = axios.create({
      baseURL: `${baseUrl}/waInstance${this.idInstance}`,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /** Build full endpoint URL with token */
  private endpoint(method: string): string {
    return `/${method}/${this.apiToken}`;
  }

  /**
   * Send a text message
   */
  async sendMessage(phone: string, message: string): Promise<WhatsAppSendResult> {
    try {
      const chatId = this.phoneToChatId(phone);

      const response = await this.client.post(this.endpoint('sendMessage'), {
        chatId,
        message,
      });

      console.log(`[WhatsApp] Sent message to ${phone}, id: ${response.data?.idMessage}`);

      return {
        success: true,
        messageId: response.data?.idMessage,
      };
    } catch (error: any) {
      console.error(`[WhatsApp] Send failed to ${phone}:`, error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Send a message with a link and optional image
   */
  async sendFileByUrl(
    phone: string,
    fileUrl: string,
    caption: string,
    fileName?: string
  ): Promise<WhatsAppSendResult> {
    try {
      const chatId = this.phoneToChatId(phone);

      const response = await this.client.post(this.endpoint('sendFileByUrl'), {
        chatId,
        urlFile: fileUrl,
        fileName: fileName || 'image.jpg',
        caption,
      });

      return {
        success: true,
        messageId: response.data?.idMessage,
      };
    } catch (error: any) {
      console.error(`[WhatsApp] SendFile failed to ${phone}:`, error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Send a poll message
   */
  async sendPoll(
    phone: string,
    question: string,
    options: string[],
    multipleAnswers: boolean = false
  ): Promise<WhatsAppSendResult> {
    try {
      const chatId = this.phoneToChatId(phone);

      const response = await this.client.post(this.endpoint('sendPoll'), {
        chatId,
        message: question,
        options: options.map((o) => ({ optionName: o })),
        multipleAnswers,
      });

      return {
        success: true,
        messageId: response.data?.idMessage,
      };
    } catch (error: any) {
      console.error(`[WhatsApp] SendPoll failed to ${phone}:`, error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Configure webhook URL for incoming messages
   * Call this once during setup
   */
  async setWebhook(webhookUrl: string): Promise<boolean> {
    try {
      await this.client.post(this.endpoint('setSettings'), {
        webhookUrl,
        webhookUrlToken: '',
        outgoingWebhook: 'no',
        outgoingAPIMessageWebhook: 'no',
        outgoingMessageWebhook: 'no',
        incomingWebhook: 'yes',
        stateWebhook: 'yes',
      });

      console.log(`[WhatsApp] Webhook configured: ${webhookUrl}`);
      return true;
    } catch (error: any) {
      console.error('[WhatsApp] Webhook setup failed:', error.message);
      return false;
    }
  }

  /**
   * Parse incoming webhook notification from GreenAPI
   */
  parseIncomingWebhook(body: any): IncomingMessage | null {
    try {
      // GreenAPI webhook format
      const typeWebhook = body.typeWebhook;

      if (typeWebhook !== 'incomingMessageReceived') {
        return null; // Not an incoming message
      }

      const messageData = body.messageData;
      const senderData = body.senderData;

      // Only handle text messages
      if (messageData?.typeMessage !== 'textMessage' && messageData?.typeMessage !== 'extendedTextMessage') {
        return null;
      }

      const text =
        messageData?.textMessageData?.textMessage ||
        messageData?.extendedTextMessageData?.text ||
        '';

      const chatId = senderData?.chatId || '';
      const phone = chatId.replace('@c.us', '');

      return {
        chatId,
        phone,
        senderName: senderData?.senderName || undefined,
        message: text.trim(),
        messageId: body.idMessage || '',
        timestamp: body.timestamp || Math.floor(Date.now() / 1000),
      };
    } catch (error: any) {
      console.error('[WhatsApp] Failed to parse webhook:', error.message);
      return null;
    }
  }

  /** Convert phone number to GreenAPI chat ID */
  private phoneToChatId(phone: string): string {
    // Remove leading + or 0, ensure it starts with country code
    let cleaned = phone.replace(/[\s\-\+\(\)]/g, '');

    // If starts with 0, assume Israeli number
    if (cleaned.startsWith('0')) {
      cleaned = '972' + cleaned.substring(1);
    }

    // If doesn't end with @c.us, add it
    if (!cleaned.endsWith('@c.us')) {
      cleaned = cleaned + '@c.us';
    }

    return cleaned;
  }
}

// ============================================
// Singleton
// ============================================

let whatsappClient: GreenAPIClient | null = null;

export function getWhatsAppClient(): GreenAPIClient {
  if (!whatsappClient) {
    whatsappClient = new GreenAPIClient();
  }
  return whatsappClient;
}
