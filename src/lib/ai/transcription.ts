/**
 * Video/Audio Transcription Service
 * תמלול סרטונים ואודיו עם Gemini 3 Pro (multimodal)
 */

import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { GoogleGenAI } from '@google/genai';

// Use v1alpha for media_resolution support
let genAI: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAI) {
    genAI = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY || '',
      apiVersion: 'v1alpha' // Required for media_resolution
    });
  }
  return genAI;
}

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  duration?: number;
  error?: string;
}

/**
 * Download video from URL to temp file
 */
async function downloadVideo(url: string): Promise<string> {
  const tempDir = '/tmp';
  const filename = `video_${Date.now()}.mp4`;
  const filepath = path.join(tempDir, filename);

  console.log(`[Transcription] Downloading video from ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }

  const fileStream = fs.createWriteStream(filepath);
  await pipeline(Readable.fromWeb(response.body as any), fileStream);

  console.log(`[Transcription] Downloaded to ${filepath}`);
  return filepath;
}

/**
 * Transcribe video/audio file using Google Gemini
 */
export async function transcribeVideo(videoUrl: string): Promise<TranscriptionResult> {
  const startTime = Date.now();

  try {
    console.log(`[Transcription] Starting transcription for ${videoUrl}`);

    // Download video
    const filepath = await downloadVideo(videoUrl);

    try {
      // Read video file
      const videoData = fs.readFileSync(filepath);
      const base64Video = videoData.toString('base64');

      // Use Gemini 3 Pro with video support
      const client = getGenAI();
      const response = await client.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [
          {
            role: 'user',
            parts: [
              { 
                text: 'תמלל את הסרטון הזה בעברית. תן רק את התמלול המדויק של מה שנאמר, ללא הסברים או תיאורים נוספים.' 
              },
              {
                inlineData: {
                  mimeType: 'video/mp4',
                  data: base64Video,
                },
                mediaResolution: {
                  level: 'media_resolution_high' // 280 tokens per frame for text-heavy videos
                }
              } as any
            ]
          }
        ],
        config: {
          temperature: 1.0, // Keep default for Gemini 3
        }
      });

      const transcription = response.text || '';
      const duration = Date.now() - startTime;
      console.log(`[Transcription] ✅ Success in ${(duration/1000).toFixed(1)}s - ${transcription.substring(0, 100)}...`);

      // Clean up temp file
      fs.unlinkSync(filepath);

      return {
        success: true,
        text: transcription,
        duration,
      };
    } catch (error: any) {
      // Clean up temp file even on error
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      throw error;
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Transcription] Error:`, error.message);

    return {
      success: false,
      error: error.message,
      duration,
    };
  }
}

/**
 * Transcribe multiple videos in parallel (with rate limiting)
 */
export async function transcribeVideos(
  videoUrls: string[],
  maxConcurrent: number = 3
): Promise<Map<string, TranscriptionResult>> {
  const results = new Map<string, TranscriptionResult>();

  console.log(`[Transcription] Transcribing ${videoUrls.length} videos (max ${maxConcurrent} concurrent)`);

  // Process in batches
  for (let i = 0; i < videoUrls.length; i += maxConcurrent) {
    const batch = videoUrls.slice(i, i + maxConcurrent);

    const batchResults = await Promise.all(
      batch.map(async (url) => {
        const result = await transcribeVideo(url);
        return { url, result };
      })
    );

    for (const { url, result } of batchResults) {
      results.set(url, result);
    }

    console.log(`[Transcription] Completed batch ${i / maxConcurrent + 1}`);

    // Rate limit delay between batches
    if (i + maxConcurrent < videoUrls.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}
