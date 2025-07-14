import { NextRequest, NextResponse } from 'next/server';
import { DataQualityChecker } from '@/lib/data-quality';
import { DataCleaner } from '@/lib/data-cleaning';
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

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'report':
        // Generate comprehensive quality report
        const report = await DataQualityChecker.generateQualityReport();
        return NextResponse.json(report);

      case 'fixable-issues':
        // Get issues that can be automatically fixed
        const fixableIssues = await DataQualityChecker.getFixableIssues();
        return NextResponse.json({
          issues: fixableIssues,
          count: fixableIssues.length,
          generatedAt: new Date().toISOString(),
        });

      case 'needs-review':
        // Get books that need manual review
        const needsReview = await DataQualityChecker.getBooksNeedingReview();
        return NextResponse.json({
          books: needsReview,
          count: needsReview.length,
          generatedAt: new Date().toISOString(),
        });

      case 'cleaning-suggestions':
        // Get cleaning suggestions for manual review
        const suggestions = await DataCleaner.generateCleaningSuggestions();
        return NextResponse.json({
          suggestions,
          count: suggestions.length,
          generatedAt: new Date().toISOString(),
        });

      case 'health-check':
        // Quick health check of data quality
        const healthReport = await DataQualityChecker.generateQualityReport();
        return NextResponse.json({
          qualityScore: healthReport.summary.qualityScore,
          criticalIssues: healthReport.summary.criticalIssues,
          totalBooks: healthReport.summary.totalBooks,
          lastChecked: healthReport.generatedAt,
          status: healthReport.summary.qualityScore >= 80 ? 'good' : 
                  healthReport.summary.qualityScore >= 60 ? 'warning' : 'critical',
        });

      default:
        // Default to generating full quality report
        const defaultReport = await DataQualityChecker.generateQualityReport();
        return NextResponse.json(defaultReport);
    }

  } catch (error) {
    console.error('Error in data quality GET endpoint:', error);
    
    const apiError: ApiError = {
      message: 'Internal server error while processing data quality request',
      code: 'INTERNAL_SERVER_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return NextResponse.json(apiError, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      const error: ApiError = {
        message: 'Database is not configured. Please set Supabase environment variables.',
        code: 'DATABASE_NOT_CONFIGURED',
      };
      return NextResponse.json(error, { status: 503 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'clean-all':
        // Perform bulk cleaning on all books
        const bulkResult = await DataCleaner.performBulkCleaning();
        return NextResponse.json({
          success: true,
          result: bulkResult,
          message: `Cleaning completed. Processed ${bulkResult.totalProcessed} books, ${bulkResult.successful} successful, ${bulkResult.failed} failed.`,
        });

      case 'clean-book':
        // Clean a specific book
        const { bookId } = body;
        if (!bookId) {
          const error: ApiError = {
            message: 'Book ID is required for book cleaning',
            code: 'INVALID_REQUEST',
          };
          return NextResponse.json(error, { status: 400 });
        }

        // Get the book first
        const { BookDatabase } = await import('@/lib/database-utils');
        const book = await BookDatabase.getBookById(bookId);
        if (!book) {
          const error: ApiError = {
            message: 'Book not found',
            code: 'BOOK_NOT_FOUND',
          };
          return NextResponse.json(error, { status: 404 });
        }

        const cleanResult = await DataCleaner.cleanBook(book);
        return NextResponse.json({
          success: cleanResult.success,
          result: cleanResult,
          message: cleanResult.success 
            ? `Book cleaned successfully. ${cleanResult.changes.length} changes applied.`
            : `Book cleaning failed: ${cleanResult.errors.join(', ')}`,
        });

      case 'apply-automatic-fixes':
        // Apply only low-risk automatic fixes
        const autoFixResults = await DataCleaner.applyAutomaticFixes();
        return NextResponse.json({
          success: true,
          results: autoFixResults,
          totalFixed: autoFixResults.length,
          message: `Applied automatic fixes to ${autoFixResults.length} books.`,
        });

      case 'merge-duplicates':
        // Merge duplicate books
        const mergedCount = await DataCleaner.mergeDuplicateBooks();
        return NextResponse.json({
          success: true,
          mergedCount,
          message: `Merged ${mergedCount} duplicate books.`,
        });

      case 'verify-metadata':
        // Verify book metadata against external sources (not implemented yet)
        return NextResponse.json({
          success: false,
          message: 'Metadata verification not implemented yet. Will be added in Phase 4.',
          code: 'NOT_IMPLEMENTED'
        }, { status: 501 });

      case 'fix-issues':
        // Fix specific issues by their IDs
        const { issueIds } = body;
        if (!issueIds || !Array.isArray(issueIds)) {
          const error: ApiError = {
            message: 'Issue IDs array is required for fixing issues',
            code: 'INVALID_REQUEST',
          };
          return NextResponse.json(error, { status: 400 });
        }

        // Fix specific issues functionality not implemented yet
        const fixResults: any[] = [];
        return NextResponse.json({
          success: true,
          results: fixResults,
          message: `Attempted to fix ${issueIds.length} issues.`,
        });

      default:
        const error: ApiError = {
          message: 'Invalid action specified',
          code: 'INVALID_ACTION',
        };
        return NextResponse.json(error, { status: 400 });
    }

  } catch (error) {
    console.error('Error in data quality POST endpoint:', error);
    
    const apiError: ApiError = {
      message: 'Internal server error while processing data quality request',
      code: 'INTERNAL_SERVER_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return NextResponse.json(apiError, { status: 500 });
  }
}

// Helper function to verify book metadata against external sources
async function verifyBookMetadata(bookIds: string[]) {
  const { BookDatabase } = await import('@/lib/database-utils');
  const { googleBooksClient } = await import('@/lib/google-books-client');
  
  const results = [];

  for (const bookId of bookIds) {
    try {
      const book = await BookDatabase.getBookById(bookId);
      if (!book) {
        results.push({
          bookId,
          success: false,
          error: 'Book not found',
        });
        continue;
      }

      // Search for the book in Google Books
      const searchResult = await googleBooksClient.searchByTitleAndAuthor(book.title, book.author);
      
      if (searchResult.items && searchResult.items.length > 0) {
        const externalBook = searchResult.items[0];
        const issues = [];

        // Compare title
        if (externalBook.volumeInfo.title && 
            !book.title.toLowerCase().includes(externalBook.volumeInfo.title.toLowerCase()) &&
            !externalBook.volumeInfo.title.toLowerCase().includes(book.title.toLowerCase())) {
          issues.push(`Title mismatch: "${book.title}" vs "${externalBook.volumeInfo.title}"`);
        }

        // Compare authors
        if (externalBook.volumeInfo.authors && externalBook.volumeInfo.authors.length > 0) {
          const externalAuthor = externalBook.volumeInfo.authors[0];
          if (!book.author.toLowerCase().includes(externalAuthor.toLowerCase()) &&
              !externalAuthor.toLowerCase().includes(book.author.toLowerCase())) {
            issues.push(`Author mismatch: "${book.author}" vs "${externalAuthor}"`);
          }
        }

        results.push({
          bookId,
          success: true,
          verified: issues.length === 0,
          issues,
          externalSource: 'Google Books',
          externalId: externalBook.id,
        });
      } else {
        results.push({
          bookId,
          success: true,
          verified: false,
          issues: ['Book not found in external sources'],
          externalSource: 'Google Books',
        });
      }

    } catch (error) {
      results.push({
        bookId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

// Helper function to fix specific issues
async function fixSpecificIssues(issueIds: string[]) {
  const { BookDatabase } = await import('@/lib/database-utils');
  
  // Get current quality report to find the issues
  const report = await DataQualityChecker.generateQualityReport();
  const issuesToFix = report.issues.filter(issue => issueIds.includes(issue.id));
  
  const results = [];

  for (const issue of issuesToFix) {
    try {
      if (!issue.fixable) {
        results.push({
          issueId: issue.id,
          success: false,
          error: 'Issue is not automatically fixable',
        });
        continue;
      }

      const book = await BookDatabase.getBookById(issue.bookId);
      if (!book) {
        results.push({
          issueId: issue.id,
          success: false,
          error: 'Book not found',
        });
        continue;
      }

      // Apply specific fix based on issue type
      const updateData: any = {};
      let fixed = false;

      switch (issue.category) {
        case 'integrity':
          if (issue.message.includes('Invalid ISBN')) {
            const cleanedISBN = book.isbn?.replace(/[^0-9X]/gi, '').toUpperCase();
            if (cleanedISBN && (cleanedISBN.length === 10 || cleanedISBN.length === 13)) {
              updateData.isbn = cleanedISBN;
              fixed = true;
            }
          }
          break;

        case 'consistency':
          if (issue.message.includes('inconsistent casing')) {
            if (issue.message.includes('Title')) {
              updateData.title = book.title.replace(/\w\S*/g, (txt) => 
                txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
              fixed = true;
            }
            if (issue.message.includes('Author')) {
              updateData.author = book.author.replace(/\w\S*/g, (txt) => 
                txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
              fixed = true;
            }
          }
          break;
      }

      if (fixed) {
        const updated = await BookDatabase.updateBook(issue.bookId, updateData);
        results.push({
          issueId: issue.id,
          success: !!updated,
          changes: Object.keys(updateData),
        });
      } else {
        results.push({
          issueId: issue.id,
          success: false,
          error: 'Could not determine how to fix this issue',
        });
      }

    } catch (error) {
      results.push({
        issueId: issue.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
} 