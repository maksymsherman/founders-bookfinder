// Environment configuration
export const config = {
  // API Keys
  googleGeminiApiKey: process.env.GOOGLE_GEMINI_API_KEY || '',
  googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY || '',
  
  // RSS Feed Configuration
  foundersPodcastRssUrl: process.env.FOUNDERS_PODCAST_RSS_URL || 'https://feeds.megaphone.fm/DSLLC6297708582',
  
  // Cache TTL settings (in milliseconds)
  cache: {
    rss: parseInt(process.env.RSS_CACHE_TTL || '3600000'), // 1 hour
    bookExtraction: parseInt(process.env.BOOK_EXTRACTION_CACHE_TTL || '86400000'), // 24 hours
    prices: parseInt(process.env.PRICE_CACHE_TTL || '86400000'), // 24 hours
  },
  
  // Rate limiting
  rateLimits: {
    llmPerMinute: parseInt(process.env.LLM_RATE_LIMIT_PER_MINUTE || '60'),
    booksApiPerMinute: parseInt(process.env.BOOKS_API_RATE_LIMIT_PER_MINUTE || '100'),
  },
  
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Validation function to check required environment variables
export const validateConfig = (): string[] => {
  const errors: string[] = [];
  
  if (!config.googleGeminiApiKey) {
    errors.push('GOOGLE_GEMINI_API_KEY is required');
  }
  
  if (!config.googleBooksApiKey) {
    errors.push('GOOGLE_BOOKS_API_KEY is required');
  }
  
  return errors;
};

// Environment variables documentation for setup
export const ENV_SETUP_GUIDE = `
Required Environment Variables:

1. GOOGLE_GEMINI_API_KEY - Get from Google AI Studio (https://aistudio.google.com/)
2. GOOGLE_BOOKS_API_KEY - Get from Google Cloud Console (https://console.cloud.google.com/)

Optional Environment Variables:
- FOUNDERS_PODCAST_RSS_URL (defaults to official feed)
- RSS_CACHE_TTL (cache duration in ms, default: 1 hour)
- BOOK_EXTRACTION_CACHE_TTL (cache duration in ms, default: 24 hours)
- PRICE_CACHE_TTL (cache duration in ms, default: 24 hours)
- LLM_RATE_LIMIT_PER_MINUTE (default: 60)
- BOOKS_API_RATE_LIMIT_PER_MINUTE (default: 100)

Create a .env.local file in the project root with these variables.
`; 