// Episode data structure from RSS feed
export interface Episode {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  link: string;
  guid: string;
}

// Book data structure
export interface Book {
  id: string;
  title: string;
  author: string;
  episodeId: string;
  episodeTitle: string;
  episodeDate: string;
  extractedLinks: string[];
  context?: string; // Why the book was mentioned
  coverImage?: string;
  isbn?: string;
  dateAdded: string;
}

// Book price information
export interface BookPrice {
  amazon?: PriceInfo;
  googleBooks?: PriceInfo;
  openLibrary?: PriceInfo;
  lastUpdated: string;
}

export interface PriceInfo {
  price: number;
  currency: string;
  url: string;
  availability: 'available' | 'unavailable' | 'unknown';
}

// API response types
export interface EpisodesResponse {
  episodes: Episode[];
  lastUpdated: string;
  totalCount: number;
}

export interface BooksResponse {
  books: Book[];
  lastUpdated: string;
  totalCount: number;
  page?: number;
  totalPages?: number;
}

export interface BookExtractionResponse {
  books: {
    title: string;
    author: string;
    links: string[];
    context?: string;
  }[];
}

// Error types
export interface ApiError {
  message: string;
  code: string;
  details?: any;
}

// Search and filter types
export interface SearchFilters {
  query?: string;
  author?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  sortBy?: 'date' | 'title' | 'author' | 'price';
  sortOrder?: 'asc' | 'desc';
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

// LLM Integration types
export interface LLMTestResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: any;
  test?: {
    prompt: string;
    response: string;
    timestamp: string;
  };
}

export interface BookExtractionRequest {
  episodeDescription: string;
  episodeId?: string;
}

export interface BookExtractionResult {
  books: Array<{
    title: string;
    author: string;
    links: string[];
    context?: string;
  }>;
  rawResponse?: string;
  confidence?: number;
} 