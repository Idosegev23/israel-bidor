/**
 * RSS Parser Utility
 * Parses RSS/Atom feeds and extracts content items
 */

import axios from 'axios';

export interface RSSItem {
  title: string;
  url: string;
  description: string;
  pubDate: string;
  category?: string;
  author?: string;
}

export interface RSSFeed {
  title: string;
  items: RSSItem[];
}

/**
 * Parse an RSS/Atom feed from a URL
 * Uses simple XML parsing without external dependencies
 */
export async function parseFeed(feedUrl: string): Promise<RSSFeed> {
  try {
    const response = await axios.get(feedUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'IsraelBidur-Agent/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

    const xml = response.data as string;
    return parseXML(xml);
  } catch (error: any) {
    console.error(`[RSS] Failed to fetch feed: ${feedUrl}`, error.message);
    throw new Error(`RSS fetch failed for ${feedUrl}: ${error.message}`);
  }
}

/**
 * Parse XML string into RSSFeed structure
 * Supports both RSS 2.0 and Atom formats
 */
function parseXML(xml: string): RSSFeed {
  const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');

  if (isAtom) {
    return parseAtom(xml);
  }
  return parseRSS(xml);
}

function parseRSS(xml: string): RSSFeed {
  const title = extractTag(xml, 'title') || 'Unknown Feed';

  const items: RSSItem[] = [];
  const itemMatches = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];

  for (const itemXml of itemMatches) {
    const itemTitle = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const description = extractTag(itemXml, 'description');
    const pubDate = extractTag(itemXml, 'pubDate');
    const category = extractTag(itemXml, 'category');
    const author = extractTag(itemXml, 'dc:creator') || extractTag(itemXml, 'author');

    if (itemTitle && link) {
      items.push({
        title: cleanHtml(itemTitle),
        url: link.trim(),
        description: cleanHtml(description || ''),
        pubDate: pubDate || new Date().toISOString(),
        category: category || undefined,
        author: author || undefined,
      });
    }
  }

  return { title, items };
}

function parseAtom(xml: string): RSSFeed {
  const title = extractTag(xml, 'title') || 'Unknown Feed';

  const items: RSSItem[] = [];
  const entryMatches = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];

  for (const entryXml of entryMatches) {
    const entryTitle = extractTag(entryXml, 'title');
    // Atom uses <link href="..."/> format
    const linkMatch = entryXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
    const link = linkMatch?.[1];
    const summary = extractTag(entryXml, 'summary') || extractTag(entryXml, 'content');
    const published = extractTag(entryXml, 'published') || extractTag(entryXml, 'updated');

    if (entryTitle && link) {
      items.push({
        title: cleanHtml(entryTitle),
        url: link.trim(),
        description: cleanHtml(summary || ''),
        pubDate: published || new Date().toISOString(),
      });
    }
  }

  return { title, items };
}

/** Extract text content from an XML tag */
function extractTag(xml: string, tagName: string): string | null {
  // Try CDATA first
  const cdataRegex = new RegExp(`<${tagName}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tagName}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  // Then regular tag content
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

/** Remove HTML tags from text */
function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}
