import { NextRequest, NextResponse } from 'next/server';
import { googleBooksClient } from '@/lib/google-books-client';
import { Book, EnhancedBook, ApiError } from '@/types';
import { getCache, setCache } from '@/lib/cache';

const CACHE_TTL = 604800; // 7 days in seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body.books || !Array.isArray(body.books)) {
      const error: ApiError = {
        message: 'Invalid request body. Expected { books: Book[] }',
        code: 'INVALID_REQUEST',
      };
      return NextResponse.json(error, { status: 400 });
    }

    const books: Book[] = body.books;
    
    // Check if Google Books API is configured
    if (!googleBooksClient.isConfigured()) {
      const error: ApiError = {
        message: 'Google Books API is not configured. Please set GOOGLE_BOOKS_API_KEY environment variable.',
        code: 'API_NOT_CONFIGURED',
      };
      return NextResponse.json(error, { status: 503 });
    }

    // Enhance books with metadata
    const enhancedBooks: EnhancedBook[] = [];
    const errors: Array<{ bookId: string; error: string }> = [];

    for (const book of books) {
      try {
        const enhancedBook = await googleBooksClient.enhanceBook(book);
        enhancedBooks.push(enhancedBook);
      } catch (error) {
        errors.push({
          bookId: book.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        // Add book with failed enhancement status
        enhancedBooks.push({
          ...book,
          enhancementStatus: 'failed',
          enhancementDate: new Date().toISOString(),
          enhancementError: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      enhancedBooks,
      errors: errors.length > 0 ? errors : undefined,
      totalProcessed: books.length,
      successCount: enhancedBooks.filter(b => b.enhancementStatus === 'enhanced').length,
      failedCount: enhancedBooks.filter(b => b.enhancementStatus === 'failed').length,
      notFoundCount: enhancedBooks.filter(b => b.enhancementStatus === 'not_found').length,
    });

  } catch (error) {
    console.error('Error enhancing books:', error);
    
    const apiError: ApiError = {
      message: 'Internal server error while enhancing books',
      code: 'INTERNAL_SERVER_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return NextResponse.json(apiError, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const title = url.searchParams.get('title');
    const author = url.searchParams.get('author');
    const isbn = url.searchParams.get('isbn');
    const refresh = url.searchParams.get('refresh') === '1';
    
    if (!googleBooksClient.isConfigured()) {
      const error: ApiError = {
        message: 'Google Books API is not configured. Please set GOOGLE_BOOKS_API_KEY environment variable.',
        code: 'API_NOT_CONFIGURED',
      };
      return NextResponse.json(error, { status: 503 });
    }

    let cacheKey = '';
    if (isbn) {
      cacheKey = `meta:isbn:${isbn}`;
    } else if (title && author) {
      cacheKey = `meta:title:${title}:author:${author}`;
    } else if (title) {
      cacheKey = `meta:title:${title}`;
    } else {
      const error: ApiError = {
        message: 'Please provide either title, author, or isbn parameters',
        code: 'MISSING_PARAMETERS',
      };
      return NextResponse.json(error, { status: 400 });
    }

    if (!refresh) {
      const cached = await getCache(cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            'Cache-Control': `public, max-age=${CACHE_TTL}`,
            'X-Cache': 'HIT',
          },
        });
      }
    }

    let result;
    if (isbn) {
      result = await googleBooksClient.searchByISBN(isbn);
    } else if (title && author) {
      result = await googleBooksClient.searchByTitleAndAuthor(title, author);
    } else if (title) {
      result = await googleBooksClient.searchBooks(title);
    }

    await setCache(cacheKey, result, CACHE_TTL);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        'X-Cache': 'MISS',
      },
    });

  } catch (error) {
    console.error('Error searching books:', error);
    
    const apiError: ApiError = {
      message: 'Internal server error while searching books',
      code: 'INTERNAL_SERVER_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return NextResponse.json(apiError, { status: 500 });
  }
}