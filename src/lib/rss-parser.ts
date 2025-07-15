import { XMLParser } from 'fast-xml-parser';
import { Episode, EpisodesResponse, ApiError } from '@/types';
import { config } from './config';

// RSS feed structure types (internal to parser)
interface RssChannel {
  title: string;
  description: string;
  link: string;
  item: RssItem[] | RssItem;
}

interface RssItem {
  title: string;
  description: string;
  pubDate: string;
  link: string;
  guid: string | { '#text': string };
  encoded?: string; // Rich content with HTML links (content:encoded after namespace removal)
}

interface RssFeed {
  rss: {
    channel: RssChannel;
  };
}

export class RssParserError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'RssParserError';
  }
}

export class RssParser {
  private parser: XMLParser;
  private readonly feedUrl: string;

  constructor(feedUrl?: string) {
    this.feedUrl = feedUrl || config.foundersPodcastRssUrl;
    
    // Configure XML parser with options optimized for RSS feeds
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '#text',
      parseAttributeValue: true,
      trimValues: true,
      removeNSPrefix: true,
      alwaysCreateTextNode: false,
      // Note: We now include content:encoded to preserve links in episode descriptions
    });
  }

  /**
   * Fetches and parses the RSS feed
   */
  async parseRssFeed(): Promise<EpisodesResponse> {
    try {
      const feedData = await this.fetchRssFeed();
      const episodes = this.parseFeedData(feedData);
      
      return {
        episodes,
        lastUpdated: new Date().toISOString(),
        totalCount: episodes.length,
      };
    } catch (error) {
      if (error instanceof RssParserError) {
        throw error;
      }
      
      throw new RssParserError(
        'Failed to parse RSS feed',
        'PARSE_ERROR',
        error
      );
    }
  }

  /**
   * Fetches raw RSS feed data from the URL
   */
  private async fetchRssFeed(): Promise<string> {
    try {
      const response = await fetch(this.feedUrl, {
        headers: {
          'User-Agent': 'Founders-BookFinder/1.0',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(30000), // 30 seconds
      });

      if (!response.ok) {
        throw new RssParserError(
          `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          { status: response.status, statusText: response.statusText }
        );
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('xml')) {
        console.warn('Response content-type is not XML:', contentType);
      }

      const feedData = await response.text();
      
      if (!feedData || feedData.trim().length === 0) {
        throw new RssParserError(
          'Empty RSS feed response',
          'EMPTY_FEED'
        );
      }

      return feedData;
    } catch (error) {
      if (error instanceof RssParserError) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new RssParserError(
          'Network error: Could not connect to RSS feed',
          'NETWORK_ERROR',
          error
        );
      }

      throw new RssParserError(
        'Failed to fetch RSS feed',
        'FETCH_ERROR',
        error
      );
    }
  }

  /**
   * Parses the raw RSS XML data into Episode objects
   */
  private parseFeedData(xmlData: string): Episode[] {
    try {
      const parsedData = this.parser.parse(xmlData) as RssFeed;
      
      if (!parsedData?.rss?.channel) {
        throw new RssParserError(
          'Invalid RSS feed structure: missing channel',
          'INVALID_STRUCTURE'
        );
      }

      const channel = parsedData.rss.channel;
      let items = channel.item;

      // Handle single item vs array of items
      if (!items) {
        return [];
      }

      if (!Array.isArray(items)) {
        items = [items];
      }

      // Parse and validate each episode
      const episodes: Episode[] = [];
      
      for (let i = 0; i < items.length; i++) {
        try {
          const episode = this.parseEpisodeItem(items[i], i);
          if (episode) {
            episodes.push(episode);
          }
        } catch (error) {
          console.warn(`Skipping episode ${i} due to parsing error:`, error);
          // Continue processing other episodes
        }
      }

      if (episodes.length === 0) {
        throw new RssParserError(
          'No valid episodes found in RSS feed',
          'NO_EPISODES'
        );
      }

      return episodes;
    } catch (error) {
      if (error instanceof RssParserError) {
        throw error;
      }

      throw new RssParserError(
        'Failed to parse XML data',
        'XML_PARSE_ERROR',
        error
      );
    }
  }

  /**
   * Parses a single RSS item into an Episode object
   */
  private parseEpisodeItem(item: RssItem, index: number): Episode | null {
    // Validate required fields
    if (!item.title || !item.description || !item.pubDate) {
      throw new Error(`Missing required fields in episode ${index}`);
    }

    // Extract GUID - handle both string and object formats
    let guid: string;
    if (typeof item.guid === 'string') {
      guid = item.guid;
    } else if (item.guid && typeof item.guid === 'object' && item.guid['#text']) {
      guid = item.guid['#text'];
    } else {
      // Fallback to link or generate from title and date
      guid = item.link || `${item.title}-${item.pubDate}`;
    }

    // Create unique ID from GUID or fallback
    const id = this.generateEpisodeId(guid, index);

    // Clean and validate pubDate
    const pubDate = this.parsePubDate(item.pubDate);

    // Use encoded field for description if available (has rich HTML with links), otherwise fall back to description
    const descriptionContent = item.encoded || item.description;

    return {
      id,
      title: this.cleanText(item.title),
      description: this.cleanText(descriptionContent),
      pubDate,
      link: item.link || '',
      guid,
    };
  }

  /**
   * Generates a consistent episode ID
   */
  private generateEpisodeId(guid: string, fallbackIndex: number): string {
    if (guid && guid.trim()) {
      // Create a simple hash from the GUID
      return guid.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    }
    
    return `episode-${fallbackIndex}`;
  }

  /**
   * Parses and validates publication date
   */
  private parsePubDate(pubDate: string): string {
    try {
      const date = new Date(pubDate);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      return date.toISOString();
    } catch (error) {
      console.warn('Invalid pubDate format:', pubDate);
      // Return current date as fallback
      return new Date().toISOString();
    }
  }

  /**
   * Cleans and sanitizes text content while preserving links
   */
  private cleanText(text: any): string {
    if (!text) return '';
    
    // Ensure text is a string
    let textStr = String(text);
    
    // Convert <a> tags to markdown-style links [text](url) to preserve them
    textStr = textStr.replace(/<a\s+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi, '[$2]($1)');
    
    // Remove all other HTML tags but keep the content
    textStr = textStr.replace(/<[^>]*>/g, '');
    
    // Normalize whitespace
    textStr = textStr.replace(/\s+/g, ' ');
    
    return textStr.trim();
  }

  /**
   * Validates the feed URL
   */
  static isValidRssUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

/**
 * Convenience function to parse the Founders Podcast RSS feed
 */
export const parseFoundersRssFeed = async (): Promise<EpisodesResponse> => {
  const parser = new RssParser();
  return await parser.parseRssFeed();
};

/**
 * Parse RSS feed with custom URL
 */
export const parseCustomRssFeed = async (url: string): Promise<EpisodesResponse> => {
  if (!RssParser.isValidRssUrl(url)) {
    throw new RssParserError(
      'Invalid RSS URL format',
      'INVALID_URL'
    );
  }
  
  const parser = new RssParser(url);
  return await parser.parseRssFeed();
}; 