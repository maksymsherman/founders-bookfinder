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
  confidence?: number;
  needsReview?: boolean;
  price?: BookPrice;
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

export interface BookValidationResult {
  valid: boolean;
  errors: string[];
}

// Data Quality types
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

export interface BookCleaningSuggestion {
  bookId: string;
  type: 'title_case' | 'author_case' | 'remove_duplicates' | 'merge_similar' | 'normalize_isbn';
  description: string;
  currentValue: string;
  suggestedValue: string;
  confidence: number;
}

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

// Enhanced LLM Integration types for Step 5.3
export interface EnhancedLLMTestResponse extends LLMTestResponse {
  multiPassCapable?: boolean;
  contextPreservation?: boolean;
  confidenceScoring?: boolean;
}

export interface EnhancedBookExtractionRequest extends BookExtractionRequest {
  enableMultiPass?: boolean;
  preserveContext?: boolean;
  confidenceThreshold?: number;
}

export interface EnhancedBookExtractionResult extends BookExtractionResult {
  multiPass?: boolean;
  processingNotes?: string[];
  passes?: number;
  contextPreserved?: string;
  overallConfidence?: number;
  extractionMethod?: 'simple' | 'multi-pass';
}

// Enhanced book extraction metadata
export interface ExtractionMetadata {
  extractionMethod: 'simple' | 'multi-pass';
  processingNotes: string[];
  llmConfidence?: number;
  passes: number;
  contextPreserved?: string;
  extractionTimestamp: string;
}

// Enhanced Book interface with extraction metadata
export interface EnhancedExtractedBook extends Book {
  extractionMetadata?: ExtractionMetadata;
  llmConfidence?: number;
  confidenceFactors?: {
    titleQuality: number;
    authorQuality: number;
    contextQuality: number;
    linksPresent: number;
    episodeRelevance?: number;
  };
  confidenceReasoning?: string;
}

// Multi-pass extraction types
export interface ExtractionPass {
  passType: 'initial' | 'refinement' | 'validation';
  books: Array<{
    title: string;
    author: string;
    links: string[];
    context?: string;
    confidence?: number;
    reasoning?: string;
  }>;
  contextPreserved: string;
  confidence: number;
  processingNotes?: string[];
}

export interface MultiPassExtractionResult {
  passes: ExtractionPass[];
  finalBooks: Array<{
    title: string;
    author: string;
    links: string[];
    context?: string;
    confidence?: number;
    reasoning?: string;
  }>;
  overallConfidence: number;
  processingNotes: string[];
  episodeComplexity?: 'simple' | 'moderate' | 'complex';
}

// Enhanced API response types
export interface EnhancedBooksResponse extends BooksResponse {
  extractionStats?: {
    multiPassExtractions: number;
    simplePassExtractions: number;
    averageConfidence: number;
    highConfidenceBooks: number;
    booksRequiringReview: number;
  };
  confidenceDistribution?: {
    excellent: number; // >= 0.9
    good: number;      // >= 0.7
    moderate: number;  // >= 0.5
    poor: number;      // >= 0.3
    veryPoor: number;  // < 0.3
  };
}

export interface EnhancedBookExtractionResponse {
  success: boolean;
  books: EnhancedExtractedBook[];
  processedEpisodes: number;
  errors: string[];
  extractionStats: {
    multiPassEpisodes: number;
    simplePassEpisodes: number;
    averageConfidence: number;
    booksRequiringReview: number;
    totalProcessingTime?: number;
  };
  contextPreservation?: {
    episodesWithContext: number;
    totalContextEntries: number;
    avgContextLength: number;
  };
}

// Confidence scoring types
export interface ConfidenceFactors {
  titleQuality: number;
  authorQuality: number;
  contextQuality: number;
  linksPresent: number;
  llmConfidence?: number;
  episodeRelevance?: number;
  extractionMethod?: 'simple' | 'multi-pass';
}

export interface ConfidenceResult {
  score: number;
  factors: ConfidenceFactors;
  reasoning: string;
  needsReview: boolean;
  level: 'Excellent' | 'Good' | 'Moderate' | 'Poor' | 'Very Poor';
}

// Context preservation types
export interface EpisodeContext {
  episodeId: string;
  preservedContext: string;
  contextQuality: number;
  extractionCount: number;
  lastUpdated: string;
  relatedEpisodes?: string[];
}

export interface ContextPreservationStats {
  totalContexts: number;
  avgContextLength: number;
  contextsUsed: number;
  contextEffectiveness: number; // 0-1 score
}

// Enhanced extraction configuration
export interface ExtractionConfig {
  enableMultiPass: boolean;
  preserveContext: boolean;
  confidenceThreshold: number;
  maxPassesPerEpisode: number;
  complexityThreshold: number; // Episode description length threshold
  temperatureSettings: {
    initial: number;
    refinement: number;
    validation: number;
  };
  rateLimiting: {
    requestsPerMinute: number;
    batchSize: number;
    delayBetweenBatches: number;
  };
} 