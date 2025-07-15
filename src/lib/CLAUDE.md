# CLAUDE.md - lib directory

This directory contains all core utility libraries and service clients for the Founders Bookfinder application.

## Core Services

### Database & Configuration
- **config.ts** - Environment configuration and settings
- **supabase.ts** - Database client and type definitions  
- **database-utils.ts** - Database operations for episodes, books, and extractions

### External API Clients
- **gemini-client.ts** - Google Gemini AI client for book extraction
- **google-books-client.ts** - Google Books API integration
- **rss-parser.ts** - RSS feed parsing with HTML to Markdown conversion

### Data Processing
- **data-cleaning.ts** - Data normalization and cleaning utilities
- **data-quality.ts** - Quality assurance and validation
- **validation.ts** - Input validation schemas
- **confidence.ts** - Confidence scoring algorithms
- **merge-books.ts** - Book deduplication and merging logic

### Infrastructure
- **cache.ts** - Caching utilities and management

## Key Architectural Patterns

### RSS to Markdown Conversion
The RSS parser automatically converts HTML anchor tags to Markdown format:
```typescript
// In rss-parser.ts:283
textStr = textStr.replace(/<a\s+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi, '[$2]($1)');
```

### Database Operations
All database operations use typed Supabase clients with proper error handling and type safety.

### Caching Strategy
Multi-level caching with different TTL values:
- RSS feed: 1 hour
- Book extraction: 24 hours  
- Pricing data: 24 hours

### Rate Limiting
Built-in rate limiting for external APIs to respect service limits.