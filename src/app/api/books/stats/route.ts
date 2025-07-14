import { NextRequest, NextResponse } from 'next/server';
import { BookDatabase } from '@/lib/database-utils';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ApiError } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      const error: ApiError = {
        message: 'Database is not configured. Please set Supabase environment variables.',
        code: 'DATABASE_NOT_CONFIGURED',
      };
      return NextResponse.json(error, { status: 503 });
    }

    // Get book statistics from database
    const stats = await BookDatabase.getBookStatistics();
    
    if (!stats) {
      const error: ApiError = {
        message: 'Failed to fetch book statistics',
        code: 'STATISTICS_FETCH_FAILED',
      };
      return NextResponse.json(error, { status: 500 });
    }

    // Format the response
    const response = {
      totalBooks: stats.total_books,
      uniqueAuthors: stats.unique_authors,
      episodesWithBooks: stats.episodes_with_books,
      averageBookRating: stats.avg_book_rating,
      enhancementStatistics: {
        enhanced: stats.enhanced_books,
        pending: stats.pending_enhancement,
        failed: stats.failed_enhancement,
        notFound: stats.not_found_books,
      },
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching book statistics:', error);
    
    const apiError: ApiError = {
      message: 'Internal server error while fetching book statistics',
      code: 'INTERNAL_SERVER_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return NextResponse.json(apiError, { status: 500 });
  }
}