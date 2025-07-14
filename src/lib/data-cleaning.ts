import { Book, EnhancedBook } from '../types';
import { BookDatabase } from './database-utils';
import { DataQualityIssue, BookCleaningSuggestion } from './data-quality';
import { googleBooksClient } from './google-books-client';

export interface CleaningResult {
  bookId: string;
  success: boolean;
  changes: string[];
  errors: string[];
}

export interface BulkCleaningResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: CleaningResult[];
  summary: {
    titlesNormalized: number;
    authorsNormalized: number;
    isbnsCleaned: number;
    urlsFixed: number;
    duplicatesRemoved: number;
  };
}

export class DataCleaner {

  /**
   * Performs comprehensive data cleaning on all books
   */
  static async performBulkCleaning(): Promise<BulkCleaningResult> {
    const books = await BookDatabase.getAllBooks();
    const results: CleaningResult[] = [];
    let summary = {
      titlesNormalized: 0,
      authorsNormalized: 0,
      isbnsCleaned: 0,
      urlsFixed: 0,
      duplicatesRemoved: 0,
    };

    // Clean individual books
    for (const book of books) {
      const result = await this.cleanBook(book);
      results.push(result);
      
      // Update summary
      if (result.success) {
        result.changes.forEach(change => {
          if (change.includes('title')) summary.titlesNormalized++;
          if (change.includes('author')) summary.authorsNormalized++;
          if (change.includes('ISBN')) summary.isbnsCleaned++;
          if (change.includes('URL')) summary.urlsFixed++;
        });
      }
    }

    // Handle duplicates separately
    const duplicatesRemoved = await this.mergeDuplicateBooks();
    summary.duplicatesRemoved = duplicatesRemoved;

    return {
      totalProcessed: books.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      summary,
    };
  }

  /**
   * Cleans an individual book record
   */
  static async cleanBook(book: any): Promise<CleaningResult> {
    const changes: string[] = [];
    const errors: string[] = [];
    let hasChanges = false;
    
    try {
      const updateData: any = {};

      // Normalize title
      const normalizedTitle = this.normalizeTitle(book.title);
      if (normalizedTitle !== book.title) {
        updateData.title = normalizedTitle;
        changes.push(`Title normalized from "${book.title}" to "${normalizedTitle}"`);
        hasChanges = true;
      }

      // Normalize author
      const normalizedAuthor = this.normalizeAuthor(book.author);
      if (normalizedAuthor !== book.author) {
        updateData.author = normalizedAuthor;
        changes.push(`Author normalized from "${book.author}" to "${normalizedAuthor}"`);
        hasChanges = true;
      }

      // Clean ISBN
      if (book.isbn) {
        const cleanedISBN = this.cleanISBN(book.isbn);
        if (cleanedISBN !== book.isbn) {
          updateData.isbn = cleanedISBN;
          changes.push(`ISBN cleaned from "${book.isbn}" to "${cleanedISBN}"`);
          hasChanges = true;
        }
      }

      // Clean URLs
      if (book.extracted_links && Array.isArray(book.extracted_links)) {
        const cleanedUrls = this.cleanURLs(book.extracted_links);
        if (JSON.stringify(cleanedUrls) !== JSON.stringify(book.extracted_links)) {
          updateData.extracted_links = cleanedUrls;
          changes.push(`Cleaned ${book.extracted_links.length - cleanedUrls.length} invalid URLs`);
          hasChanges = true;
        }
      }

      // Fix date formats
      if (book.episode_date && !this.isValidDate(book.episode_date)) {
        const fixedDate = this.fixDateFormat(book.episode_date);
        if (fixedDate) {
          updateData.episode_date = fixedDate;
          changes.push(`Fixed episode date from "${book.episode_date}" to "${fixedDate}"`);
          hasChanges = true;
        } else {
          errors.push(`Could not fix invalid date: ${book.episode_date}`);
        }
      }

      // Fix rating ranges
      if (book.average_rating !== null && (book.average_rating < 0 || book.average_rating > 5)) {
        const fixedRating = Math.max(0, Math.min(5, book.average_rating));
        updateData.average_rating = fixedRating;
        changes.push(`Fixed rating from ${book.average_rating} to ${fixedRating}`);
        hasChanges = true;
      }

      // Fix negative page counts
      if (book.page_count !== null && book.page_count < 0) {
        updateData.page_count = null;
        changes.push(`Removed invalid negative page count: ${book.page_count}`);
        hasChanges = true;
      }

      // Clean categories (remove duplicates, normalize case)
      if (book.categories && Array.isArray(book.categories)) {
        const cleanedCategories = this.cleanCategories(book.categories);
        if (JSON.stringify(cleanedCategories) !== JSON.stringify(book.categories)) {
          updateData.categories = cleanedCategories;
          changes.push(`Cleaned categories from ${book.categories.length} to ${cleanedCategories.length} items`);
          hasChanges = true;
        }
      }

      // Apply changes if any
      if (hasChanges) {
        const updatedBook = await BookDatabase.updateBook(book.id, updateData);
        if (!updatedBook) {
          errors.push('Failed to save cleaned book data');
          return {
            bookId: book.id,
            success: false,
            changes: [],
            errors: [`Failed to save cleaned book data for ${book.title}`],
          };
        }
      }

      return {
        bookId: book.id,
        success: true,
        changes,
        errors,
      };

    } catch (error) {
      return {
        bookId: book.id,
        success: false,
        changes: [],
        errors: [`Cleaning failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Normalizes book title (proper case, trim, etc.)
   */
  private static normalizeTitle(title: string): string {
    if (!title) return title;
    
    let normalized = title.trim();
    
    // Convert to title case if all uppercase or all lowercase
    if (normalized === normalized.toUpperCase() || normalized === normalized.toLowerCase()) {
      normalized = this.toTitleCase(normalized);
    }
    
    // Remove excessive whitespace
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Remove common extraction artifacts
    normalized = normalized.replace(/^(book:|title:)\s*/i, '');
    normalized = normalized.replace(/\s*\(book\)\s*$/i, '');
    
    return normalized;
  }

  /**
   * Normalizes author name
   */
  private static normalizeAuthor(author: string): string {
    if (!author) return author;
    
    let normalized = author.trim();
    
    // Convert to title case if all uppercase or all lowercase
    if (normalized === normalized.toUpperCase() || normalized === normalized.toLowerCase()) {
      normalized = this.toTitleCase(normalized);
    }
    
    // Remove excessive whitespace
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Remove common extraction artifacts
    normalized = normalized.replace(/^(by:|author:)\s*/i, '');
    normalized = normalized.replace(/\s*\(author\)\s*$/i, '');
    
    // Handle "Last, First" format
    if (normalized.includes(',') && normalized.split(',').length === 2) {
      const [last, first] = normalized.split(',').map(s => s.trim());
      if (first && last) {
        normalized = `${first} ${last}`;
      }
    }
    
    return normalized;
  }

  /**
   * Cleans and validates ISBN format
   */
  private static cleanISBN(isbn: string): string {
    if (!isbn) return isbn;
    
    // Remove all non-digit characters except X (for ISBN-10)
    let cleaned = isbn.replace(/[^0-9X]/gi, '').toUpperCase();
    
    // Validate length
    if (cleaned.length === 10 || cleaned.length === 13) {
      return cleaned;
    }
    
    // Try to find valid ISBN within the string
    const matches = isbn.match(/(\d{13}|\d{10})/);
    if (matches) {
      return matches[1];
    }
    
    return isbn; // Return original if can't clean
  }

  /**
   * Cleans array of URLs, removing invalid ones
   */
  private static cleanURLs(urls: string[]): string[] {
    return urls
      .map(url => url.trim())
      .filter(url => this.isValidURL(url))
      .filter((url, index, array) => array.indexOf(url) === index); // Remove duplicates
  }

  /**
   * Attempts to fix common date format issues
   */
  private static fixDateFormat(dateStr: string): string | null {
    if (!dateStr) return null;
    
    try {
      // Try parsing as-is first
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
      
      // Try common formats
      const formats = [
        /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
        /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
        /(\d{2})-(\d{2})-(\d{4})/, // MM-DD-YYYY
      ];
      
      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          const [, p1, p2, p3] = match;
          // Assume different ordering based on format
          const testDate = new Date(`${p3}-${p1}-${p2}`);
          if (!isNaN(testDate.getTime())) {
            return testDate.toISOString();
          }
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Cleans and deduplicates categories
   */
  private static cleanCategories(categories: string[]): string[] {
    return categories
      .map(cat => cat.trim())
      .filter(cat => cat.length > 0)
      .map(cat => this.toTitleCase(cat))
      .filter((cat, index, array) => array.indexOf(cat) === index) // Remove duplicates
      .sort();
  }

  /**
   * Converts text to title case
   */
  private static toTitleCase(text: string): string {
    const articles = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'of', 'in'];
    
    return text.toLowerCase()
      .split(' ')
      .map((word, index) => {
        // Always capitalize first and last word
        if (index === 0 || index === text.split(' ').length - 1) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        
        // Don't capitalize articles unless they're first/last
        if (articles.includes(word)) {
          return word;
        }
        
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  /**
   * Validates URL format
   */
  private static isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates date format
   */
  private static isValidDate(date: string): boolean {
    return !isNaN(Date.parse(date));
  }

  /**
   * Merges duplicate books in the database
   */
  static async mergeDuplicateBooks(): Promise<number> {
    const books = await BookDatabase.getAllBooks();
    const duplicateGroups = this.findDuplicateGroups(books);
    let mergedCount = 0;

    for (const group of duplicateGroups) {
      if (group.length > 1) {
        try {
          const mergedBook = this.mergeBookGroup(group);
          
          // Update the first book with merged data
          await BookDatabase.updateBook(group[0].id, {
            extracted_links: mergedBook.extractedLinks,
            context: mergedBook.context,
            // Keep the earliest date
            episode_date: mergedBook.episodeDate,
          });
          
          // Delete the duplicate books
          for (let i = 1; i < group.length; i++) {
            await BookDatabase.deleteBook(group[i].id);
            mergedCount++;
          }
        } catch (error) {
          console.error(`Failed to merge book group: ${error}`);
        }
      }
    }

    return mergedCount;
  }

  /**
   * Finds groups of duplicate books
   */
  private static findDuplicateGroups(books: any[]): any[][] {
    const groups: any[][] = [];
    const processed = new Set<string>();

    for (const book of books) {
      if (processed.has(book.id)) continue;

      const duplicates = books.filter(b => 
        b.id !== book.id &&
        !processed.has(b.id) &&
        this.areBooksEqual(book, b)
      );

      if (duplicates.length > 0) {
        const group = [book, ...duplicates];
        group.forEach(b => processed.add(b.id));
        groups.push(group);
      } else {
        processed.add(book.id);
      }
    }

    return groups;
  }

  /**
   * Checks if two books are duplicates
   */
  private static areBooksEqual(book1: any, book2: any): boolean {
    const title1 = book1.title?.toLowerCase()?.trim();
    const title2 = book2.title?.toLowerCase()?.trim();
    const author1 = book1.author?.toLowerCase()?.trim();
    const author2 = book2.author?.toLowerCase()?.trim();

    return title1 === title2 && author1 === author2;
  }

  /**
   * Merges a group of duplicate books into one
   */
  private static mergeBookGroup(books: any[]): any {
    const merged = { ...books[0] };
    
    // Merge extracted links
    const allLinks = new Set<string>();
    books.forEach(book => {
      if (book.extracted_links && Array.isArray(book.extracted_links)) {
        book.extracted_links.forEach((link: string) => allLinks.add(link));
      }
    });
    merged.extractedLinks = Array.from(allLinks);
    
    // Merge contexts
    const allContexts = books
      .map(book => book.context)
      .filter(context => context && context.trim().length > 0)
      .filter((context, index, array) => array.indexOf(context) === index);
    merged.context = allContexts.join(' | ');
    
    // Use earliest episode date
    const dates = books
      .map(book => book.episode_date)
      .filter(date => date && this.isValidDate(date))
      .sort();
    if (dates.length > 0) {
      merged.episodeDate = dates[0];
    }

    return merged;
  }

  /**
   * Generates cleaning suggestions for manual review
   */
  static async generateCleaningSuggestions(): Promise<BookCleaningSuggestion[]> {
    const books = await BookDatabase.getAllBooks();
    const suggestions: BookCleaningSuggestion[] = [];

    for (const book of books) {
      // Title case suggestions
      const normalizedTitle = this.normalizeTitle(book.title);
      if (normalizedTitle !== book.title) {
        suggestions.push({
          bookId: book.id,
          type: 'title_case',
          description: 'Normalize title casing',
          currentValue: book.title,
          suggestedValue: normalizedTitle,
          confidence: 0.9,
        });
      }

      // Author case suggestions
      const normalizedAuthor = this.normalizeAuthor(book.author);
      if (normalizedAuthor !== book.author) {
        suggestions.push({
          bookId: book.id,
          type: 'author_case',
          description: 'Normalize author name',
          currentValue: book.author,
          suggestedValue: normalizedAuthor,
          confidence: 0.85,
        });
      }

      // ISBN cleaning suggestions
      if (book.isbn) {
        const cleanedISBN = this.cleanISBN(book.isbn);
        if (cleanedISBN !== book.isbn) {
          suggestions.push({
            bookId: book.id,
            type: 'normalize_isbn',
            description: 'Clean ISBN format',
            currentValue: book.isbn,
            suggestedValue: cleanedISBN,
            confidence: 0.95,
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Applies automatic fixes for low-risk cleaning issues
   */
  static async applyAutomaticFixes(): Promise<CleaningResult[]> {
    const books = await BookDatabase.getAllBooks();
    const results: CleaningResult[] = [];

    for (const book of books) {
      const result = await this.applyLowRiskFixes(book);
      if (result.changes.length > 0) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Applies only low-risk, reversible fixes
   */
  private static async applyLowRiskFixes(book: any): Promise<CleaningResult> {
    const changes: string[] = [];
    const errors: string[] = [];
    const updateData: any = {};

    try {
      // Only apply very safe transformations
      
      // Trim whitespace
      if (book.title && book.title !== book.title.trim()) {
        updateData.title = book.title.trim();
        changes.push('Trimmed title whitespace');
      }

      if (book.author && book.author !== book.author.trim()) {
        updateData.author = book.author.trim();
        changes.push('Trimmed author whitespace');
      }

      // Remove duplicate URLs
      if (book.extracted_links && Array.isArray(book.extracted_links)) {
        const uniqueLinks = Array.from(new Set(book.extracted_links));
        if (uniqueLinks.length !== book.extracted_links.length) {
          updateData.extracted_links = uniqueLinks;
          changes.push(`Removed ${book.extracted_links.length - uniqueLinks.length} duplicate URLs`);
        }
      }

      // Apply changes if any
      if (Object.keys(updateData).length > 0) {
        const updated = await BookDatabase.updateBook(book.id, updateData);
        if (!updated) {
          errors.push('Failed to save changes');
        }
      }

      return {
        bookId: book.id,
        success: errors.length === 0,
        changes,
        errors,
      };

    } catch (error) {
      return {
        bookId: book.id,
        success: false,
        changes: [],
        errors: [`Failed to apply fixes: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }
} 