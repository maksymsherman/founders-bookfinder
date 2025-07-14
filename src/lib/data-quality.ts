import { Book, EnhancedBook, BookValidationResult } from '../types';
import { BookDatabase } from './database-utils';
import { googleBooksClient } from './google-books-client';
import { validateBookData } from './validation';

// Data quality issues and their severity levels
export interface DataQualityIssue {
  id: string;
  bookId: string;
  type: 'critical' | 'warning' | 'info';
  category: 'integrity' | 'completeness' | 'accuracy' | 'consistency';
  message: string;
  suggestedFix?: string;
  fixable: boolean;
  detectedAt: string;
}

// Data quality report structure
export interface DataQualityReport {
  summary: {
    totalBooks: number;
    issuesFound: number;
    criticalIssues: number;
    warningIssues: number;
    infoIssues: number;
    qualityScore: number; // 0-100
  };
  issues: DataQualityIssue[];
  metrics: DataQualityMetrics;
  generatedAt: string;
}

// Data quality metrics
export interface DataQualityMetrics {
  completeness: {
    withISBN: number;
    withDescription: number;
    withCoverImage: number;
    withPublisher: number;
    withCategories: number;
    withRatings: number;
  };
  accuracy: {
    enhancedBooks: number;
    failedEnhancements: number;
    notFoundBooks: number;
    verifiedMetadata: number;
  };
  consistency: {
    duplicateBooks: number;
    inconsistentAuthors: number;
    inconsistentTitles: number;
    orphanedBooks: number;
  };
  integrity: {
    validDates: number;
    validURLs: number;
    validISBNs: number;
    validRatings: number;
  };
}

// Book cleaning suggestions
export interface BookCleaningSuggestion {
  bookId: string;
  type: 'title_case' | 'author_case' | 'remove_duplicates' | 'merge_similar' | 'normalize_isbn';
  description: string;
  currentValue: string;
  suggestedValue: string;
  confidence: number;
}

export class DataQualityChecker {
  
  /**
   * Performs comprehensive data quality analysis on all books
   */
  static async generateQualityReport(): Promise<DataQualityReport> {
    const books = await BookDatabase.getAllBooks();
    const issues: DataQualityIssue[] = [];
    const metrics = await this.calculateQualityMetrics(books);
    
    // Run all quality checks
    for (const book of books) {
      const bookIssues = await this.checkBookQuality(book);
      issues.push(...bookIssues);
    }
    
    // Calculate overall quality score
    const qualityScore = this.calculateQualityScore(metrics, issues);
    
    return {
      summary: {
        totalBooks: books.length,
        issuesFound: issues.length,
        criticalIssues: issues.filter(i => i.type === 'critical').length,
        warningIssues: issues.filter(i => i.type === 'warning').length,
        infoIssues: issues.filter(i => i.type === 'info').length,
        qualityScore,
      },
      issues,
      metrics,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Checks individual book quality and returns issues
   */
  static async checkBookQuality(book: any): Promise<DataQualityIssue[]> {
    const issues: DataQualityIssue[] = [];
    const now = new Date().toISOString();

    // Basic validation first
    const basicValidation = validateBookData(book);
    if (!basicValidation.valid) {
      issues.push({
        id: `${book.id}-basic-validation`,
        bookId: book.id,
        type: 'critical',
        category: 'integrity',
        message: `Basic validation failed: ${basicValidation.errors.join(', ')}`,
        fixable: true,
        detectedAt: now,
      });
    }

    // Check data integrity
    issues.push(...await this.checkDataIntegrity(book));
    
    // Check completeness
    issues.push(...this.checkDataCompleteness(book));
    
    // Check accuracy
    issues.push(...await this.checkDataAccuracy(book));
    
    // Check consistency
    issues.push(...await this.checkDataConsistency(book));

    return issues;
  }

  /**
   * Checks data integrity (valid formats, types, constraints)
   */
  private static async checkDataIntegrity(book: any): Promise<DataQualityIssue[]> {
    const issues: DataQualityIssue[] = [];
    const now = new Date().toISOString();

    // Check ISBN format
    if (book.isbn && !this.isValidISBN(book.isbn)) {
      issues.push({
        id: `${book.id}-invalid-isbn`,
        bookId: book.id,
        type: 'warning',
        category: 'integrity',
        message: `Invalid ISBN format: ${book.isbn}`,
        suggestedFix: 'Validate and correct ISBN format',
        fixable: true,
        detectedAt: now,
      });
    }

    // Check date formats
    if (book.episode_date && !this.isValidDate(book.episode_date)) {
      issues.push({
        id: `${book.id}-invalid-episode-date`,
        bookId: book.id,
        type: 'critical',
        category: 'integrity',
        message: `Invalid episode date format: ${book.episode_date}`,
        suggestedFix: 'Convert to valid ISO date format',
        fixable: true,
        detectedAt: now,
      });
    }

    // Check URL formats
    if (book.extracted_links && Array.isArray(book.extracted_links)) {
      for (const link of book.extracted_links) {
        if (!this.isValidURL(link)) {
          issues.push({
            id: `${book.id}-invalid-url-${link.substring(0, 10)}`,
            bookId: book.id,
            type: 'warning',
            category: 'integrity',
            message: `Invalid URL format: ${link}`,
            suggestedFix: 'Validate and correct URL format',
            fixable: true,
            detectedAt: now,
          });
        }
      }
    }

    // Check rating ranges
    if (book.average_rating !== null && (book.average_rating < 0 || book.average_rating > 5)) {
      issues.push({
        id: `${book.id}-invalid-rating`,
        bookId: book.id,
        type: 'warning',
        category: 'integrity',
        message: `Rating out of valid range (0-5): ${book.average_rating}`,
        suggestedFix: 'Correct rating to valid range',
        fixable: true,
        detectedAt: now,
      });
    }

    // Check page count
    if (book.page_count !== null && book.page_count < 0) {
      issues.push({
        id: `${book.id}-invalid-page-count`,
        bookId: book.id,
        type: 'warning',
        category: 'integrity',
        message: `Negative page count: ${book.page_count}`,
        suggestedFix: 'Set page count to null or positive value',
        fixable: true,
        detectedAt: now,
      });
    }

    return issues;
  }

  /**
   * Checks data completeness
   */
  private static checkDataCompleteness(book: any): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];
    const now = new Date().toISOString();

    // Check for missing critical fields
    if (!book.title || book.title.trim().length === 0) {
      issues.push({
        id: `${book.id}-missing-title`,
        bookId: book.id,
        type: 'critical',
        category: 'completeness',
        message: 'Missing book title',
        suggestedFix: 'Add book title from episode context or external sources',
        fixable: false,
        detectedAt: now,
      });
    }

    if (!book.author || book.author.trim().length === 0) {
      issues.push({
        id: `${book.id}-missing-author`,
        bookId: book.id,
        type: 'critical',
        category: 'completeness',
        message: 'Missing book author',
        suggestedFix: 'Add author name from episode context or external sources',
        fixable: false,
        detectedAt: now,
      });
    }

    // Check for missing enhancement data
    if (book.enhancement_status === 'pending') {
      issues.push({
        id: `${book.id}-enhancement-pending`,
        bookId: book.id,
        type: 'info',
        category: 'completeness',
        message: 'Book enhancement is pending',
        suggestedFix: 'Run book enhancement process',
        fixable: true,
        detectedAt: now,
      });
    }

    // Check for missing metadata
    if (!book.isbn && !book.isbn13 && !book.isbn10) {
      issues.push({
        id: `${book.id}-missing-isbn`,
        bookId: book.id,
        type: 'info',
        category: 'completeness',
        message: 'Missing ISBN information',
        suggestedFix: 'Enhance book metadata to get ISBN',
        fixable: true,
        detectedAt: now,
      });
    }

    if (!book.description) {
      issues.push({
        id: `${book.id}-missing-description`,
        bookId: book.id,
        type: 'info',
        category: 'completeness',
        message: 'Missing book description',
        suggestedFix: 'Enhance book metadata to get description',
        fixable: true,
        detectedAt: now,
      });
    }

    if (!book.cover_image) {
      issues.push({
        id: `${book.id}-missing-cover`,
        bookId: book.id,
        type: 'info',
        category: 'completeness',
        message: 'Missing book cover image',
        suggestedFix: 'Enhance book metadata to get cover image',
        fixable: true,
        detectedAt: now,
      });
    }

    return issues;
  }

  /**
   * Checks data accuracy against external sources
   */
  private static async checkDataAccuracy(book: any): Promise<DataQualityIssue[]> {
    const issues: DataQualityIssue[] = [];
    const now = new Date().toISOString();

    // Check if enhancement failed
    if (book.enhancement_status === 'failed') {
      issues.push({
        id: `${book.id}-enhancement-failed`,
        bookId: book.id,
        type: 'warning',
        category: 'accuracy',
        message: `Book enhancement failed: ${book.enhancement_error || 'Unknown error'}`,
        suggestedFix: 'Retry enhancement or manually verify book data',
        fixable: true,
        detectedAt: now,
      });
    }

    // Check if book was not found in external sources
    if (book.enhancement_status === 'not_found') {
      issues.push({
        id: `${book.id}-not-found-external`,
        bookId: book.id,
        type: 'warning',
        category: 'accuracy',
        message: 'Book not found in external sources during enhancement',
        suggestedFix: 'Manually verify book title and author, or check with alternative sources',
        fixable: false,
        detectedAt: now,
      });
    }

    // Check for suspicious author names (common extraction errors)
    if (book.author && this.isSuspiciousAuthor(book.author)) {
      issues.push({
        id: `${book.id}-suspicious-author`,
        bookId: book.id,
        type: 'warning',
        category: 'accuracy',
        message: `Suspicious author name detected: ${book.author}`,
        suggestedFix: 'Manually review and correct author name',
        fixable: true,
        detectedAt: now,
      });
    }

    return issues;
  }

  /**
   * Checks data consistency across the database
   */
  private static async checkDataConsistency(book: any): Promise<DataQualityIssue[]> {
    const issues: DataQualityIssue[] = [];
    const now = new Date().toISOString();

    // Check for potential duplicates
    const potentialDuplicates = await this.findPotentialDuplicates(book);
    if (potentialDuplicates.length > 0) {
      issues.push({
        id: `${book.id}-potential-duplicate`,
        bookId: book.id,
        type: 'warning',
        category: 'consistency',
        message: `Potential duplicate books found: ${potentialDuplicates.map(d => d.id).join(', ')}`,
        suggestedFix: 'Review and merge duplicate books',
        fixable: true,
        detectedAt: now,
      });
    }

    // Check for inconsistent title casing
    if (book.title && this.hasInconsistentCasing(book.title)) {
      issues.push({
        id: `${book.id}-inconsistent-title-case`,
        bookId: book.id,
        type: 'info',
        category: 'consistency',
        message: 'Title has inconsistent casing',
        suggestedFix: 'Normalize title casing',
        fixable: true,
        detectedAt: now,
      });
    }

    return issues;
  }

  /**
   * Calculates comprehensive quality metrics
   */
  private static async calculateQualityMetrics(books: any[]): Promise<DataQualityMetrics> {
    const total = books.length;
    
    return {
      completeness: {
        withISBN: books.filter(b => b.isbn || b.isbn13 || b.isbn10).length / total * 100,
        withDescription: books.filter(b => b.description).length / total * 100,
        withCoverImage: books.filter(b => b.cover_image).length / total * 100,
        withPublisher: books.filter(b => b.publisher).length / total * 100,
        withCategories: books.filter(b => b.categories && b.categories.length > 0).length / total * 100,
        withRatings: books.filter(b => b.average_rating !== null).length / total * 100,
      },
      accuracy: {
        enhancedBooks: books.filter(b => b.enhancement_status === 'enhanced').length / total * 100,
        failedEnhancements: books.filter(b => b.enhancement_status === 'failed').length / total * 100,
        notFoundBooks: books.filter(b => b.enhancement_status === 'not_found').length / total * 100,
        verifiedMetadata: books.filter(b => b.google_books_id).length / total * 100,
      },
      consistency: {
        duplicateBooks: await this.countDuplicateBooks(books),
        inconsistentAuthors: this.countInconsistentAuthors(books),
        inconsistentTitles: this.countInconsistentTitles(books),
        orphanedBooks: books.filter(b => !b.episode_id).length,
      },
      integrity: {
        validDates: books.filter(b => this.isValidDate(b.episode_date)).length / total * 100,
        validURLs: this.calculateValidURLPercentage(books),
        validISBNs: books.filter(b => !b.isbn || this.isValidISBN(b.isbn)).length / total * 100,
        validRatings: books.filter(b => b.average_rating === null || (b.average_rating >= 0 && b.average_rating <= 5)).length / total * 100,
      },
    };
  }

  /**
   * Calculates overall quality score (0-100)
   */
  private static calculateQualityScore(metrics: DataQualityMetrics, issues: DataQualityIssue[]): number {
    // Weight different aspects of quality
    const completenessScore = (
      metrics.completeness.withISBN * 0.1 +
      metrics.completeness.withDescription * 0.2 +
      metrics.completeness.withCoverImage * 0.1 +
      metrics.completeness.withPublisher * 0.1 +
      metrics.completeness.withCategories * 0.1 +
      metrics.completeness.withRatings * 0.1
    ) / 0.7;

    const accuracyScore = (
      metrics.accuracy.enhancedBooks * 0.4 +
      (100 - metrics.accuracy.failedEnhancements) * 0.3 +
      metrics.accuracy.verifiedMetadata * 0.3
    ) / 1.0;

    const integrityScore = (
      metrics.integrity.validDates * 0.3 +
      metrics.integrity.validURLs * 0.2 +
      metrics.integrity.validISBNs * 0.3 +
      metrics.integrity.validRatings * 0.2
    ) / 1.0;

    // Penalty for critical issues
    const criticalIssues = issues.filter(i => i.type === 'critical').length;
    const criticalPenalty = Math.min(criticalIssues * 5, 50); // Max 50 point penalty

    const rawScore = (completenessScore * 0.4 + accuracyScore * 0.4 + integrityScore * 0.2) - criticalPenalty;
    return Math.max(0, Math.min(100, rawScore));
  }

  // Helper methods for validation
  private static isValidISBN(isbn: string): boolean {
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    return /^(\d{10}|\d{13})$/.test(cleanISBN);
  }

  private static isValidDate(date: string): boolean {
    return !isNaN(Date.parse(date));
  }

  private static isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private static isSuspiciousAuthor(author: string): boolean {
    const suspicious = ['unknown', 'various', 'n/a', 'tbd', 'author name'];
    return suspicious.some(s => author.toLowerCase().includes(s));
  }

  private static hasInconsistentCasing(text: string): boolean {
    // Check if text is all uppercase or all lowercase (likely needs normalization)
    return text === text.toUpperCase() || text === text.toLowerCase();
  }

  private static async findPotentialDuplicates(book: any): Promise<any[]> {
    // Simple implementation - search for similar titles/authors
    const allBooks = await BookDatabase.getAllBooks();
    return allBooks.filter(b => 
      b.id !== book.id && 
      (this.similarStrings(b.title, book.title) || this.similarStrings(b.author, book.author))
    );
  }

  private static similarStrings(str1: string, str2: string, threshold: number = 0.8): boolean {
    if (!str1 || !str2) return false;
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return true;
    const distance = this.levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longer.length - distance) / longer.length >= threshold;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    return matrix[str2.length][str1.length];
  }

  private static async countDuplicateBooks(books: any[]): Promise<number> {
    const seen = new Set();
    let duplicates = 0;
    books.forEach(book => {
      const key = `${book.title?.toLowerCase()?.trim()}|${book.author?.toLowerCase()?.trim()}`;
      if (seen.has(key)) {
        duplicates++;
      } else {
        seen.add(key);
      }
    });
    return duplicates;
  }

  private static countInconsistentAuthors(books: any[]): number {
    return books.filter(book => book.author && this.hasInconsistentCasing(book.author)).length;
  }

  private static countInconsistentTitles(books: any[]): number {
    return books.filter(book => book.title && this.hasInconsistentCasing(book.title)).length;
  }

  private static calculateValidURLPercentage(books: any[]): number {
    let totalUrls = 0;
    let validUrls = 0;
    
    books.forEach(book => {
      if (book.extracted_links && Array.isArray(book.extracted_links)) {
        book.extracted_links.forEach((url: string) => {
          totalUrls++;
          if (this.isValidURL(url)) validUrls++;
        });
      }
    });
    
    return totalUrls === 0 ? 100 : (validUrls / totalUrls) * 100;
  }

  /**
   * Gets fixable issues that can be automatically resolved
   */
  static async getFixableIssues(): Promise<DataQualityIssue[]> {
    const report = await this.generateQualityReport();
    return report.issues.filter(issue => issue.fixable);
  }

  /**
   * Gets books that need manual review
   */
  static async getBooksNeedingReview(): Promise<any[]> {
    const books = await BookDatabase.getAllBooks();
    const needsReview = [];
    
    for (const book of books) {
      const issues = await this.checkBookQuality(book);
      const hasCriticalIssues = issues.some(i => i.type === 'critical');
      const hasAccuracyIssues = issues.some(i => i.category === 'accuracy');
      
      if (hasCriticalIssues || hasAccuracyIssues || book.enhancement_status === 'failed') {
        needsReview.push(book);
      }
    }
    
    return needsReview;
  }
} 