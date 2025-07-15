import { NextRequest, NextResponse } from 'next/server';
import { parseFoundersRssFeed } from '@/lib/rss-parser';
import { GeminiClient } from '@/lib/gemini-client';
import { googleBooksClient } from '@/lib/google-books-client';
import { BookDatabase, EpisodeDatabase } from '@/lib/database-utils';
import { validateBookData } from '@/lib/validation';
import type { Book, Episode } from '@/types';

export const dynamic = 'force-dynamic';

interface ProcessingOptions {
  batchSize?: number;
  skipExisting?: boolean;
  maxEpisodes?: number;
  startFrom?: number;
}

interface ProcessingSummary {
  episodesChecked: number;
  episodesProcessed: number;
  episodesSkipped: number;
  booksExtracted: number;
  booksEnriched: number;
  booksStored: number;
  errors: Array<{ episodeGuid: string; error: string }>;
  processingTime: number;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await req.json();
    const options: ProcessingOptions = {
      batchSize: body.batchSize || 5, // Process 5 episodes at a time by default
      skipExisting: body.skipExisting !== false, // Default to true
      maxEpisodes: body.maxEpisodes || 50, // Limit to 50 episodes max per request
      startFrom: body.startFrom || 0,
    };

    const summary: ProcessingSummary = {
      episodesChecked: 0,
      episodesProcessed: 0,
      episodesSkipped: 0,
      booksExtracted: 0,
      booksEnriched: 0,
      booksStored: 0,
      errors: [],
      processingTime: 0,
    };

    // 1. Fetch RSS feed
    const rssResult = await parseFoundersRssFeed();
    const allEpisodes: Episode[] = rssResult.episodes;
    
    // 2. Apply pagination and limits
    const startIndex = options.startFrom || 0;
    const endIndex = Math.min(startIndex + (options.maxEpisodes || 50), allEpisodes.length);
    const episodesToProcess = allEpisodes.slice(startIndex, endIndex);
    
    summary.episodesChecked = episodesToProcess.length;

    if (episodesToProcess.length === 0) {
      summary.processingTime = Date.now() - startTime;
      return NextResponse.json({ 
        success: true, 
        message: 'No episodes to process',
        summary,
        hasMore: false 
      });
    }

    const geminiClient = new GeminiClient();

    // 3. Process episodes in batches
    const batchSize = options.batchSize || 5;
    for (let i = 0; i < episodesToProcess.length; i += batchSize) {
      const batch = episodesToProcess.slice(i, i + batchSize);
      
      for (const episode of batch) {
        try {
          // Check if episode already processed
          if (options.skipExisting) {
            const existing = await EpisodeDatabase.getEpisodeByGuid(episode.guid || episode.pubDate);
            if (existing) {
              summary.episodesSkipped++;
              continue;
            }
          }

          // Store/update episode in database first to get database ID
          const storedEpisode = await EpisodeDatabase.upsertEpisode(episode);
          if (!storedEpisode) {
            summary.errors.push({
              episodeGuid: episode.guid || episode.pubDate,
              error: 'Failed to store episode in database'
            });
            continue;
          }

          // Extract books using LLM
          const extractionResult = await geminiClient.extractBooksFromEpisode(episode.description);
          const books = extractionResult?.books || [];
          
          summary.episodesProcessed++;
          summary.booksExtracted += books.length;

          // Process each extracted book
          for (const rawBook of books) {
            try {
              // Validate book data
              const validation = validateBookData(rawBook);
              if (!validation.valid) {
                summary.errors.push({
                  episodeGuid: episode.guid || episode.pubDate,
                  error: `Invalid book data: ${validation.errors.join(', ')}`
                });
                continue;
              }

              // Enhance with Google Books metadata
              let enhancedBook: Book;
              if (googleBooksClient.isConfigured()) {
                try {
                  enhancedBook = await googleBooksClient.enhanceBook(rawBook);
                  summary.booksEnriched++;
                } catch (enhanceErr: any) {
                  // If enhancement fails, use the raw book
                  enhancedBook = rawBook;
                  summary.errors.push({
                    episodeGuid: episode.guid || episode.pubDate,
                    error: `Enhancement failed: ${enhanceErr?.message || enhanceErr}`
                  });
                }
              } else {
                enhancedBook = rawBook;
              }

              // Store in database
              const bookToStore = {
                ...enhancedBook,
                episodeId: storedEpisode.id,
                episodeTitle: storedEpisode.title,
                episodeDate: storedEpisode.pub_date,
                dateAdded: new Date().toISOString(),
              };

              const storedBook = await BookDatabase.insertBook(bookToStore);
              if (storedBook) {
                summary.booksStored++;
              } else {
                summary.errors.push({
                  episodeGuid: episode.guid || episode.pubDate,
                  error: 'Failed to store book in database'
                });
              }

            } catch (bookErr: any) {
              summary.errors.push({
                episodeGuid: episode.guid || episode.pubDate,
                error: `Book processing error: ${bookErr?.message || bookErr}`
              });
            }
          }

          // Episode already stored above

        } catch (episodeErr: any) {
          summary.errors.push({
            episodeGuid: episode.guid || episode.pubDate,
            error: `Episode processing error: ${episodeErr?.message || episodeErr}`
          });
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < episodesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    summary.processingTime = Date.now() - startTime;
    
    // Check if there are more episodes to process
    const hasMore = endIndex < allEpisodes.length;
    const nextStartFrom = hasMore ? endIndex : null;

    return NextResponse.json({ 
      success: true, 
      summary,
      hasMore,
      nextStartFrom,
      totalEpisodes: allEpisodes.length,
      processedRange: `${(options.startFrom || 0) + 1}-${endIndex}`,
    });

  } catch (err: any) {
    const summary: ProcessingSummary = {
      episodesChecked: 0,
      episodesProcessed: 0,
      episodesSkipped: 0,
      booksExtracted: 0,
      booksEnriched: 0,
      booksStored: 0,
      errors: [{ episodeGuid: 'unknown', error: err?.message || err }],
      processingTime: Date.now() - startTime,
    };

    return NextResponse.json({ 
      success: false, 
      error: err?.message || 'Unknown error occurred',
      summary 
    }, { status: 500 });
  }
}

export async function GET() {
  // Get processing status/statistics
  try {
    const totalEpisodes = (await parseFoundersRssFeed()).episodes.length;
    const processedEpisodes = await EpisodeDatabase.getAllEpisodes();
    const bookStats = await BookDatabase.getBookStatistics();

    return NextResponse.json({
      success: true,
      statistics: {
        totalEpisodes,
        processedEpisodes: processedEpisodes.length,
        remainingEpisodes: totalEpisodes - processedEpisodes.length,
        totalBooks: bookStats?.total_books || 0,
        enhancedBooks: bookStats?.enhanced_books || 0,
        lastProcessed: processedEpisodes[0]?.pub_date || null,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err?.message || 'Unknown error occurred' 
    }, { status: 500 });
  }
}