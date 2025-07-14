import { NextRequest, NextResponse } from 'next/server';
import { BookDatabase, convertDatabaseBookToBook } from '@/lib/database-utils';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ApiError } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      const error: ApiError = {
        message: 'Database is not configured. Please set Supabase environment variables.',
        code: 'DATABASE_NOT_CONFIGURED',
      };
      return NextResponse.json(error, { status: 503 });
    }

    const bookId = params.id;
    
    if (!bookId) {
      const error: ApiError = {
        message: 'Missing book ID parameter',
        code: 'INVALID_REQUEST',
      };
      return NextResponse.json(error, { status: 400 });
    }

    // Get book from database
    const dbBook = await BookDatabase.getBookById(bookId);
    
    if (!dbBook) {
      const error: ApiError = {
        message: 'Book not found',
        code: 'BOOK_NOT_FOUND',
      };
      return NextResponse.json(error, { status: 404 });
    }

    // Convert and return book
    const book = convertDatabaseBookToBook(dbBook);
    
    return NextResponse.json(book);

  } catch (error) {
    console.error('Error fetching book:', error);
    
    const apiError: ApiError = {
      message: 'Internal server error while fetching book',
      code: 'INTERNAL_SERVER_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return NextResponse.json(apiError, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      const error: ApiError = {
        message: 'Database is not configured. Please set Supabase environment variables.',
        code: 'DATABASE_NOT_CONFIGURED',
      };
      return NextResponse.json(error, { status: 503 });
    }

    const bookId = params.id;
    
    if (!bookId) {
      const error: ApiError = {
        message: 'Missing book ID parameter',
        code: 'INVALID_REQUEST',
      };
      return NextResponse.json(error, { status: 400 });
    }

    const body = await request.json();

    // Check if book exists
    const existingBook = await BookDatabase.getBookById(bookId);
    if (!existingBook) {
      const error: ApiError = {
        message: 'Book not found',
        code: 'BOOK_NOT_FOUND',
      };
      return NextResponse.json(error, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    
    if (body.title) updateData.title = body.title;
    if (body.author) updateData.author = body.author;
    if (body.episodeId) updateData.episode_id = body.episodeId;
    if (body.episodeTitle) updateData.episode_title = body.episodeTitle;
    if (body.episodeDate) updateData.episode_date = body.episodeDate;
    if (body.extractedLinks) updateData.extracted_links = body.extractedLinks;
    if (body.context !== undefined) updateData.context = body.context;
    if (body.isbn !== undefined) updateData.isbn = body.isbn;
    if (body.isbn13 !== undefined) updateData.isbn13 = body.isbn13;
    if (body.isbn10 !== undefined) updateData.isbn10 = body.isbn10;
    if (body.publisher !== undefined) updateData.publisher = body.publisher;
    if (body.publishedDate !== undefined) updateData.published_date = body.publishedDate;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.pageCount !== undefined) updateData.page_count = body.pageCount;
    if (body.categories !== undefined) updateData.categories = body.categories;
    if (body.averageRating !== undefined) updateData.average_rating = body.averageRating;
    if (body.ratingsCount !== undefined) updateData.ratings_count = body.ratingsCount;
    if (body.language !== undefined) updateData.language = body.language;
    if (body.infoLink !== undefined) updateData.info_link = body.infoLink;
    if (body.coverImage !== undefined) updateData.cover_image = body.coverImage;
    if (body.googleBooksId !== undefined) updateData.google_books_id = body.googleBooksId;
    if (body.enhancementStatus !== undefined) updateData.enhancement_status = body.enhancementStatus;
    if (body.enhancementDate !== undefined) updateData.enhancement_date = body.enhancementDate;
    if (body.enhancementError !== undefined) updateData.enhancement_error = body.enhancementError;

    // Update book in database
    const updatedDbBook = await BookDatabase.updateBook(bookId, updateData);
    
    if (!updatedDbBook) {
      const error: ApiError = {
        message: 'Failed to update book',
        code: 'BOOK_UPDATE_FAILED',
      };
      return NextResponse.json(error, { status: 500 });
    }

    // Convert and return updated book
    const updatedBook = convertDatabaseBookToBook(updatedDbBook);
    
    return NextResponse.json(updatedBook);

  } catch (error) {
    console.error('Error updating book:', error);
    
    const apiError: ApiError = {
      message: 'Internal server error while updating book',
      code: 'INTERNAL_SERVER_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return NextResponse.json(apiError, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      const error: ApiError = {
        message: 'Database is not configured. Please set Supabase environment variables.',
        code: 'DATABASE_NOT_CONFIGURED',
      };
      return NextResponse.json(error, { status: 503 });
    }

    const bookId = params.id;
    
    if (!bookId) {
      const error: ApiError = {
        message: 'Missing book ID parameter',
        code: 'INVALID_REQUEST',
      };
      return NextResponse.json(error, { status: 400 });
    }

    // Check if book exists
    const existingBook = await BookDatabase.getBookById(bookId);
    if (!existingBook) {
      const error: ApiError = {
        message: 'Book not found',
        code: 'BOOK_NOT_FOUND',
      };
      return NextResponse.json(error, { status: 404 });
    }

    // Delete book from database
    const deleted = await BookDatabase.deleteBook(bookId);
    
    if (!deleted) {
      const error: ApiError = {
        message: 'Failed to delete book',
        code: 'BOOK_DELETION_FAILED',
      };
      return NextResponse.json(error, { status: 500 });
    }

    return NextResponse.json({ message: 'Book deleted successfully' });

  } catch (error) {
    console.error('Error deleting book:', error);
    
    const apiError: ApiError = {
      message: 'Internal server error while deleting book',
      code: 'INTERNAL_SERVER_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return NextResponse.json(apiError, { status: 500 });
  }
}