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
  isbn13?: string;
  isbn10?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  language?: string;
  infoLink?: string;
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

// Google Books API types
export interface GoogleBooksResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBooksItem[];
}

export interface GoogleBooksItem {
  kind: string;
  id: string;
  etag: string;
  selfLink: string;
  volumeInfo: GoogleBooksVolumeInfo;
  saleInfo?: GoogleBooksSaleInfo;
  accessInfo?: GoogleBooksAccessInfo;
}

export interface GoogleBooksVolumeInfo {
  title: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: Array<{
    type: string;
    identifier: string;
  }>;
  readingModes?: {
    text: boolean;
    image: boolean;
  };
  pageCount?: number;
  printType?: string;
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  maturityRating?: string;
  allowAnonLogging?: boolean;
  contentVersion?: string;
  panelizationSummary?: {
    containsEpubBubbles: boolean;
    containsImageBubbles: boolean;
  };
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    extraLarge?: string;
  };
  language?: string;
  previewLink?: string;
  infoLink?: string;
  canonicalVolumeLink?: string;
}

export interface GoogleBooksSaleInfo {
  country: string;
  saleability: string;
  isEbook: boolean;
  listPrice?: {
    amount: number;
    currencyCode: string;
  };
  retailPrice?: {
    amount: number;
    currencyCode: string;
  };
  buyLink?: string;
  offers?: Array<{
    finskyOfferType: number;
    listPrice: {
      amountInMicros: number;
      currencyCode: string;
    };
    retailPrice: {
      amountInMicros: number;
      currencyCode: string;
    };
  }>;
}

export interface GoogleBooksAccessInfo {
  country: string;
  viewability: string;
  embeddable: boolean;
  publicDomain: boolean;
  textToSpeechPermission: string;
  epub: {
    isAvailable: boolean;
    acsTokenLink?: string;
  };
  pdf: {
    isAvailable: boolean;
    acsTokenLink?: string;
  };
  webReaderLink?: string;
  accessViewStatus: string;
  quoteSharingAllowed: boolean;
}

// Enhanced book with metadata
export interface EnhancedBook extends Book {
  googleBooksId?: string;
  enhancementStatus: 'pending' | 'enhanced' | 'failed' | 'not_found';
  enhancementDate?: string;
  enhancementError?: string;
} 