import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini-client';
import { Episode, Book, ApiError } from '@/types';
import { config } from '@/lib/config';
import { validateBookData } from '@/lib/validation';
import { mergeDuplicateBooks } from '@/lib/merge-books';
import { calculateEnhancedConfidence, scoreMultipleBooks } from '@/lib/confidence';
import { getCache, setCache } from '@/lib/cache';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface BookExtractionRequest {
  episodes: Episode[];
  batchSize?: number;
  enableMultiPass?: boolean;
  preserveContext?: boolean;
}

interface ExtractedBookWithMetadata extends Book {
  extractionMethod?: 'simple' | 'multi-pass';
  processingNotes?: string[];
  llmConfidence?: number;
  passes?: number;
}

interface BookExtractionResponse {
  success: boolean;
  books: ExtractedBookWithMetadata[];
  processedEpisodes: number;
  errors: string[];
  extractionStats: {
    multiPassEpisodes: number;
    simplePassEpisodes: number;
    averageConfidence: number;
    booksRequiringReview: number;
  };
}

// Enhanced cache with context preservation
interface ExtractedBookWithContext {
  book: ExtractedBookWithMetadata;
  contextPreserved: string;
  extractionMethod: 'simple' | 'multi-pass';
}

const CACHE_TTL = 86400; // 24 hours in seconds

// Remove in-memory caches
// const bookExtractionCache = new Map<string, CacheEntry<ExtractedBookWithContext[]>>();
// const episodeContextCache = new Map<string, string>();

const getCachedBookExtraction = async (episodeId: string): Promise<ExtractedBookWithContext[] | null> => {
  const cacheKey = `extract:episode:${episodeId}`;
  return await getCache(cacheKey);
};

const setCachedBookExtraction = async (episodeId: string, books: ExtractedBookWithContext[]): Promise<void> => {
  const cacheKey = `extract:episode:${episodeId}`;
  await setCache(cacheKey, books, CACHE_TTL);
};

// Context preservation can remain in-memory for now (not persisted)
const episodeContextCache = new Map<string, string>();
const getPreservedContext = (episodeId: string): string => {
  return episodeContextCache.get(episodeId) || '';
};
const setPreservedContext = (episodeId: string, context: string): void => {
  episodeContextCache.set(episodeId, context);
};

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const refresh = url.searchParams.get('refresh') === '1';
    const body: BookExtractionRequest = await request.json();
    
    if (!body.episodes || !Array.isArray(body.episodes)) {
      const error: ApiError = {
        message: 'Episodes array is required',
        code: 'INVALID_REQUEST'
      };
      return NextResponse.json(error, { status: 400 });
    }

    const { 
      episodes, 
      batchSize = 5, 
      enableMultiPass = true,
      preserveContext = true 
    } = body;
    
    const geminiClient = getGeminiClient();
    
    const allBooks: ExtractedBookWithMetadata[] = [];
    const errors: string[] = [];
    let processedEpisodes = 0;
    let multiPassEpisodes = 0;
    let simplePassEpisodes = 0;

    // Process episodes in batches to avoid overwhelming the API
    for (let i = 0; i < episodes.length; i += batchSize) {
      const batch = episodes.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (episode, batchIndex) => {
        try {
          // Check cache first
          let cachedBooksWithContext: ExtractedBookWithContext[] | null = null;
          if (!refresh) {
            cachedBooksWithContext = await getCachedBookExtraction(episode.id);
          }
          if (cachedBooksWithContext) {
            console.log(`Using cached extraction for episode: ${episode.title}`);
            return cachedBooksWithContext.map(item => ({
              ...item.book,
              episodeId: episode.id,
              episodeTitle: episode.title,
              episodeDate: episode.pubDate
            }));
          }

          // Get preserved context for this episode if available
          const preservedContext = preserveContext ? getPreservedContext(episode.id) : '';

          // Enhanced book extraction with multi-pass if enabled
          let extractionResult: any;
          if (enableMultiPass) {
            extractionResult = await geminiClient.extractBooksFromEpisode(
              episode.description, 
              preservedContext
            );
          } else {
            // Force simple extraction
            extractionResult = await (geminiClient as any).extractBooksFromEpisodeSimple(episode.description);
            extractionResult.multiPass = false;
          }

          // Track extraction method stats
          if (extractionResult.multiPass) {
            multiPassEpisodes++;
          } else {
            simplePassEpisodes++;
          }

          if (!extractionResult.books || !Array.isArray(extractionResult.books)) {
            console.warn(`No books found for episode: ${episode.title}`);
            // Cache empty result
            await setCachedBookExtraction(episode.id, []);
            return [];
          }

          // Transform and enhance the extraction result
          const episodeBooks: ExtractedBookWithMetadata[] = extractionResult.books.map((bookData: any, bookIndex: number) => {
            // Create base book object
            const book: Book = {
              id: `${episode.id}-${bookData.title.replace(/\s+/g, '-').toLowerCase()}`,
              title: bookData.title,
              author: bookData.author,
              extractedLinks: bookData.links || [],
              episodeId: episode.id,
              episodeTitle: episode.title,
              episodeDate: episode.pubDate,
              context: bookData.context,
              dateAdded: new Date().toISOString(),
            };

            // Calculate enhanced confidence using both heuristic and LLM confidence
            const confidenceResult = calculateEnhancedConfidence(
              book,
              bookData.confidence,
              extractionResult.multiPass ? 'multi-pass' : 'simple'
            );

            // Create enhanced book with metadata
            const enhancedBook: ExtractedBookWithMetadata = {
              ...book,
              confidence: confidenceResult.score,
              needsReview: confidenceResult.needsReview,
              extractionMethod: extractionResult.multiPass ? 'multi-pass' : 'simple',
              processingNotes: extractionResult.processingNotes || [],
              llmConfidence: bookData.confidence,
              passes: extractionResult.passes || 1
            };

            return enhancedBook;
          });

          // Validate books and filter out invalid ones
          const validBooks: ExtractedBookWithMetadata[] = [];
          episodeBooks.forEach((book) => {
            const validation = validateBookData(book);
            if (validation.valid) {
              validBooks.push(book);
            } else {
              errors.push(`Invalid book (episode: ${episode.title}, title: ${book.title}): ${validation.errors.join('; ')}`);
            }
          });

          // Store context for future episodes if context preservation is enabled
          if (preserveContext && extractionResult.contextPreserved) {
            setPreservedContext(episode.id, extractionResult.contextPreserved);
          }

          // Cache the results with context
          const booksWithContext: ExtractedBookWithContext[] = validBooks.map(book => ({
            book,
            contextPreserved: extractionResult.contextPreserved || '',
            extractionMethod: extractionResult.multiPass ? 'multi-pass' : 'simple'
          }));
          await setCachedBookExtraction(episode.id, booksWithContext);
          
          return validBooks;

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

    // Merge duplicate books using enhanced confidence scoring
    const mergedBooks = mergeDuplicateBooks(allBooks);

    // Calculate extraction statistics
    const averageConfidence = mergedBooks.length > 0 
      ? mergedBooks.reduce((sum, book) => sum + (book.confidence || 0), 0) / mergedBooks.length
      : 0;

    const booksRequiringReview = mergedBooks.filter(book => book.needsReview).length;

    const extractionStats = {
      multiPassEpisodes,
      simplePassEpisodes,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      booksRequiringReview
    };

    console.log('Enhanced extraction completed:', {
      totalBooks: mergedBooks.length,
      processedEpisodes,
      ...extractionStats
    });

    const response: BookExtractionResponse = {
      success: true,
      books: mergedBooks,
      processedEpisodes,
      errors,
      extractionStats
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Enhanced book extraction API error:', error);
    
    const apiError: ApiError = {
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
    // bookExtractionCache.clear(); // This line is removed
    episodeContextCache.clear();
    return NextResponse.json({ 
      success: true, 
      message: 'Enhanced book extraction cache and context cache cleared' 
    });
  }
  
  if (action === 'cache-info') {
    // return NextResponse.json({ // This line is removed
    //   success: true,
    //   cacheSize: bookExtractionCache.size,
    //   contextCacheSize: episodeContextCache.size,
    //   cacheEntries: Array.from(bookExtractionCache.keys()),
    //   contextEntries: Array.from(episodeContextCache.keys())
    // });
    return NextResponse.json({
      success: true,
      cacheSize: 0, // No in-memory cache
      contextCacheSize: episodeContextCache.size,
      cacheEntries: [],
      contextEntries: Array.from(episodeContextCache.keys())
    });
  }

  if (action === 'extraction-stats') {
    // Get statistics from cache
    // const totalCached = bookExtractionCache.size; // This line is removed
    const contextsPreserved = episodeContextCache.size;
    
    let multiPassCount = 0;
    let simplePassCount = 0;
    let totalBooks = 0;
    let highConfidenceBooks = 0;

    // bookExtractionCache.forEach((entry) => { // This line is removed
    //   entry.data.forEach((item) => {
    //     totalBooks++;
    //     if (item.extractionMethod === 'multi-pass') {
    //       multiPassCount++;
    //     } else {
    //       simplePassCount++;
    //     }
    //     if ((item.book.confidence || 0) >= 0.8) {
    //       highConfidenceBooks++;
    //     }
    //   });
    // });

    return NextResponse.json({
      success: true,
      stats: {
        // totalCachedEpisodes: totalCached, // This line is removed
        contextsPreserved,
        totalBooks,
        multiPassExtractions: multiPassCount,
        simplePassExtractions: simplePassCount,
        highConfidenceBooks,
        highConfidencePercentage: totalBooks > 0 ? Math.round((highConfidenceBooks / totalBooks) * 100) : 0
      }
    });
  }
  
  return NextResponse.json({
    success: false,
    message: 'GET method supports: ?action=clear-cache, ?action=cache-info, or ?action=extraction-stats'
  }, { status: 405 });
}