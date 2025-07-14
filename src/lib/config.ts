// Environment configuration
export const config = {
  // API Keys
  googleGeminiApiKey: process.env.GOOGLE_GEMINI_API_KEY || '',
  googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY || '',
  
  // Supabase Configuration
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  
  // RSS Feed Configuration
  foundersPodcastRssUrl: 'https://feeds.megaphone.fm/DSLLC6297708582',
  
  // Cache TTL settings (in milliseconds)
  cache: {
    rss: 3600000, // 1 hour
    bookExtraction: 86400000, // 24 hours
    prices: 86400000, // 24 hours
    bookExtractionTtl: 86400000, // 24 hours (used by extract-books API)
  },
  
  // Rate limiting
  rateLimits: {
    llmPerMinute: 4000, // Gemini 2.5 Flash Lite rate limit
    booksApiPerMinute: 100,
  },
  
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Validation function to check required environment variables
export const validateConfig = (): string[] => {
  const errors: string[] = [];
  
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    errors.push('GOOGLE_GEMINI_API_KEY is required');
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }
  
  // Google Books API key is optional for now
  if (!process.env.GOOGLE_BOOKS_API_KEY) {
    console.log('ℹ️  Google Books API key not set (optional for basic functionality)');
  }
  
  return errors;
};

// Environment variables documentation for setup
export const ENV_SETUP_GUIDE = `
Required Environment Variables:

1. GOOGLE_GEMINI_API_KEY - Get from Google AI Studio (https://aistudio.google.com/)
2. NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL
3. NEXT_PUBLIC_SUPABASE_ANON_KEY - Your Supabase anonymous key

Optional Environment Variables:
4. GOOGLE_BOOKS_API_KEY - Get from Google Cloud Console (https://console.cloud.google.com/)

Create a .env.local file in the project root with these variables.
All other configuration settings are now in src/lib/config.ts
`; 