import { GoogleBooksResponse, GoogleBooksItem, Book, EnhancedBook } from '@/types';
import { config } from './config';

class GoogleBooksClient {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/books/v1';

  constructor() {
    this.apiKey = config.googleBooksApiKey || '';
  }

  async searchBooks(query: string, maxResults: number = 5): Promise<GoogleBooksResponse> {
    const url = new URL(`${this.baseUrl}/volumes`);
    url.searchParams.append('q', query);
    url.searchParams.append('maxResults', maxResults.toString());
    
    if (this.apiKey) {
      url.searchParams.append('key', this.apiKey);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async searchByTitleAndAuthor(title: string, author: string): Promise<GoogleBooksResponse> {
    const query = `intitle:"${title}" inauthor:"${author}"`;
    return this.searchBooks(query, 3);
  }

  async searchByISBN(isbn: string): Promise<GoogleBooksResponse> {
    const query = `isbn:${isbn}`;
    return this.searchBooks(query, 1);
  }

  async getBookById(bookId: string): Promise<GoogleBooksItem> {
    const url = new URL(`${this.baseUrl}/volumes/${bookId}`);
    
    if (this.apiKey) {
      url.searchParams.append('key', this.apiKey);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  enhanceBookWithMetadata(book: Book, googleBooksItem: GoogleBooksItem): EnhancedBook {
    const { volumeInfo } = googleBooksItem;
    
    // Extract ISBNs
    const isbn13 = volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier;
    const isbn10 = volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier;
    
    // Get the best cover image
    const coverImage = volumeInfo.imageLinks?.large ||
                      volumeInfo.imageLinks?.medium ||
                      volumeInfo.imageLinks?.thumbnail ||
                      volumeInfo.imageLinks?.smallThumbnail ||
                      book.coverImage;

    return {
      ...book,
      // Enhanced metadata from Google Books
      isbn: isbn13 || isbn10 || book.isbn,
      isbn13,
      isbn10,
      publisher: volumeInfo.publisher || book.publisher,
      publishedDate: volumeInfo.publishedDate || book.publishedDate,
      description: volumeInfo.description || book.description,
      pageCount: volumeInfo.pageCount || book.pageCount,
      categories: volumeInfo.categories || book.categories,
      averageRating: volumeInfo.averageRating || book.averageRating,
      ratingsCount: volumeInfo.ratingsCount || book.ratingsCount,
      language: volumeInfo.language || book.language,
      infoLink: volumeInfo.infoLink || book.infoLink,
      coverImage,
      // Enhancement tracking
      googleBooksId: googleBooksItem.id,
      enhancementStatus: 'enhanced',
      enhancementDate: new Date().toISOString(),
      enhancementError: undefined,
    };
  }

  async enhanceBook(book: Book): Promise<EnhancedBook> {
    try {
      let searchResult: GoogleBooksResponse;

      // Try ISBN search first if available
      if (book.isbn) {
        searchResult = await this.searchByISBN(book.isbn);
        if (searchResult.items && searchResult.items.length > 0) {
          return this.enhanceBookWithMetadata(book, searchResult.items[0]);
        }
      }

      // Try title and author search
      searchResult = await this.searchByTitleAndAuthor(book.title, book.author);
      
      if (!searchResult.items || searchResult.items.length === 0) {
        return {
          ...book,
          enhancementStatus: 'not_found',
          enhancementDate: new Date().toISOString(),
          enhancementError: 'No matching books found in Google Books API',
        };
      }

      // Find the best match
      const bestMatch = this.findBestMatch(book, searchResult.items);
      
      if (bestMatch) {
        return this.enhanceBookWithMetadata(book, bestMatch);
      }

      return {
        ...book,
        enhancementStatus: 'not_found',
        enhancementDate: new Date().toISOString(),
        enhancementError: 'No suitable match found in search results',
      };

    } catch (error) {
      return {
        ...book,
        enhancementStatus: 'failed',
        enhancementDate: new Date().toISOString(),
        enhancementError: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private findBestMatch(book: Book, items: GoogleBooksItem[]): GoogleBooksItem | null {
    // Score each item based on title and author similarity
    const scoredItems = items.map(item => {
      const titleScore = this.calculateStringSimilarity(
        book.title.toLowerCase(),
        item.volumeInfo.title.toLowerCase()
      );
      
      const authorScore = item.volumeInfo.authors 
        ? Math.max(...item.volumeInfo.authors.map(author => 
            this.calculateStringSimilarity(book.author.toLowerCase(), author.toLowerCase())
          ))
        : 0;
      
      return {
        item,
        score: titleScore * 0.6 + authorScore * 0.4, // Weight title more heavily
      };
    });

    // Sort by score and return the best match if it's good enough
    scoredItems.sort((a, b) => b.score - a.score);
    
    const bestMatch = scoredItems[0];
    return bestMatch && bestMatch.score > 0.6 ? bestMatch.item : null;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation using common subsequence
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }
}

export const googleBooksClient = new GoogleBooksClient();