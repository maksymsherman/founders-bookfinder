import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini-client';
import { Episode, Book, ApiError } from '@/types';
import { config } from '@/lib/config';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface BookExtractionRequest {
  episodes: Episode[];
  batchSize?: number;
}

interface BookExtractionResponse {
  success: boolean;
  books: Book[];
  processedEpisodes: number;
  errors: string[];
}

// In-memory cache for book extraction results
const bookExtractionCache = new Map<string, CacheEntry<Book[]>>();

const getCachedBookExtraction = (episodeId: string): Book[] | null => {
  const cached = bookExtractionCache.get(episodeId);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    bookExtractionCache.delete(episodeId);
    return null;
  }
  
  return cached.data;
};

const setCachedBookExtraction = (episodeId: string, books: Book[]): void => {
  bookExtractionCache.set(episodeId, {
    data: books,
    timestamp: Date.now(),
    ttl: config.cache.bookExtractionTtl
  });
};

export async function POST(request: NextRequest) {
  try {
    const body: BookExtractionRequest = await request.json();
    
    if (!body.episodes || !Array.isArray(body.episodes)) {
      const error: ApiError = {
        error: 'Invalid request body',
        message: 'Episodes array is required',
        code: 'INVALID_REQUEST'
      };
      return NextResponse.json(error, { status: 400 });
    }

    const { episodes, batchSize = 5 } = body;
    const geminiClient = getGeminiClient();
    
    const allBooks: Book[] = [];
    const errors: string[] = [];
    let processedEpisodes = 0;

    // Process episodes in batches to avoid overwhelming the API
    for (let i = 0; i < episodes.length; i += batchSize) {
      const batch = episodes.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (episode) => {
        try {
          // Check cache first
          const cachedBooks = getCachedBookExtraction(episode.id);
          if (cachedBooks) {
            return cachedBooks.map(book => ({
              ...book,
              episodeId: episode.id,
              episodeTitle: episode.title,
              episodeDate: episode.pubDate
            }));
          }

          // Extract books using Gemini
          const extractionResult = await geminiClient.extractBooksFromEpisode(episode.description);
          
          if (!extractionResult.books || !Array.isArray(extractionResult.books)) {
            console.warn(`No books found for episode: ${episode.title}`);
            setCachedBookExtraction(episode.id, []);
            return [];
          }

          // Transform the extraction result to match our Book interface
          const episodeBooks: Book[] = extractionResult.books.map((book: any) => ({
            id: `${episode.id}-${book.title.replace(/\s+/g, '-').toLowerCase()}`,
            title: book.title,
            author: book.author,
            links: book.links || [],
            episodeId: episode.id,
            episodeTitle: episode.title,
            episodeDate: episode.pubDate,
            extractedAt: new Date().toISOString()
          }));

          // Cache the results
          setCachedBookExtraction(episode.id, episodeBooks);
          
          return episodeBooks;
        } catch (error) {
          const errorMsg = `Failed to extract books from episode "${episode.title}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
          return [];
        }
      });

      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            allBooks.push(...result.value);
            processedEpisodes++;
          } else {
            const episode = batch[index];
            const errorMsg = `Failed to process episode "${episode.title}": ${result.reason}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        });
      } catch (error) {
        const errorMsg = `Batch processing error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }

      // Add delay between batches to respect rate limits
      if (i + batchSize < episodes.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const response: BookExtractionResponse = {
      success: true,
      books: allBooks,
      processedEpisodes,
      errors
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Book extraction API error:', error);
    
    const apiError: ApiError = {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      code: 'INTERNAL_ERROR'
    };
    
    return NextResponse.json(apiError, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'clear-cache') {
    bookExtractionCache.clear();
    return NextResponse.json({ 
      success: true, 
      message: 'Book extraction cache cleared' 
    });
  }
  
  if (action === 'cache-info') {
    return NextResponse.json({
      success: true,
      cacheSize: bookExtractionCache.size,
      cacheEntries: Array.from(bookExtractionCache.keys())
    });
  }
  
  return NextResponse.json({
    success: false,
    message: 'GET method not supported. Use POST to extract books or GET with ?action=clear-cache or ?action=cache-info'
  }, { status: 405 });
}