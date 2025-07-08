import { NextRequest, NextResponse } from 'next/server';
import { parseFoundersRssFeed, RssParserError } from '@/lib/rss-parser';
import { EpisodesResponse, ApiError, CacheEntry } from '@/types';
import { config } from '@/lib/config';

// In-memory cache for episodes (in production, consider Redis or external cache)
const episodesCache = new Map<string, CacheEntry<EpisodesResponse>>();

const CACHE_KEY = 'founders-episodes';

/**
 * GET /api/episodes
 * Fetches and returns episodes from the Founders Podcast RSS feed
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check if we have cached data that's still valid
    const cachedData = getCachedEpisodes();
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': `public, max-age=${Math.floor(config.cache.rss / 1000)}`,
          'X-Cache': 'HIT',
        },
      });
    }

    // Fetch fresh data from RSS feed
    console.log('Fetching fresh episodes from RSS feed...');
    const episodesData = await parseFoundersRssFeed();

    // Cache the results
    setCachedEpisodes(episodesData);

    return NextResponse.json(episodesData, {
      headers: {
        'Cache-Control': `public, max-age=${Math.floor(config.cache.rss / 1000)}`,
        'X-Cache': 'MISS',
      },
    });

  } catch (error) {
    console.error('Error fetching episodes:', error);

    // Handle specific RSS parser errors
    if (error instanceof RssParserError) {
      const apiError: ApiError = {
        message: error.message,
        code: error.code,
        details: config.isDevelopment ? error.originalError : undefined,
      };

      const statusCode = getStatusCodeForError(error.code);
      return NextResponse.json({ error: apiError }, { status: statusCode });
    }

    // Handle generic errors
    const apiError: ApiError = {
      message: config.isDevelopment 
        ? `Failed to fetch episodes: ${error instanceof Error ? error.message : 'Unknown error'}`
        : 'Failed to fetch episodes',
      code: 'INTERNAL_ERROR',
      details: config.isDevelopment ? error : undefined,
    };

    return NextResponse.json({ error: apiError }, { status: 500 });
  }
}

/**
 * Gets cached episodes if they're still valid
 */
function getCachedEpisodes(): EpisodesResponse | null {
  const cached = episodesCache.get(CACHE_KEY);
  
  if (!cached) {
    return null;
  }

  const now = Date.now();
  const isExpired = (now - cached.timestamp) > cached.ttl;

  if (isExpired) {
    episodesCache.delete(CACHE_KEY);
    return null;
  }

  // Update lastUpdated to reflect cache hit time
  return {
    ...cached.data,
    lastUpdated: new Date(cached.timestamp).toISOString(),
  };
}

/**
 * Caches episodes data
 */
function setCachedEpisodes(data: EpisodesResponse): void {
  const cacheEntry: CacheEntry<EpisodesResponse> = {
    data,
    timestamp: Date.now(),
    ttl: config.cache.rss,
  };

  episodesCache.set(CACHE_KEY, cacheEntry);
}

/**
 * Maps RSS parser error codes to HTTP status codes
 */
function getStatusCodeForError(errorCode: string): number {
  switch (errorCode) {
    case 'INVALID_URL':
      return 400;
    case 'NETWORK_ERROR':
    case 'HTTP_ERROR':
      return 502; // Bad Gateway
    case 'EMPTY_FEED':
    case 'INVALID_STRUCTURE':
    case 'NO_EPISODES':
      return 502; // Bad Gateway (external service issue)
    case 'XML_PARSE_ERROR':
      return 502; // Bad Gateway
    default:
      return 500; // Internal Server Error
  }
}

/**
 * POST /api/episodes
 * Clears the episodes cache (for development/admin use)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Only allow cache clearing in development mode
    if (!config.isDevelopment) {
      return NextResponse.json(
        { error: { message: 'Cache clearing only available in development', code: 'FORBIDDEN' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    if (body.action === 'clear-cache') {
      episodesCache.delete(CACHE_KEY);
      return NextResponse.json({ 
        message: 'Episodes cache cleared successfully',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: { message: 'Invalid action', code: 'BAD_REQUEST' } },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in POST /api/episodes:', error);
    
    return NextResponse.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
} 