# API Routes Documentation

This directory contains all API routes for the Founders BookFinder application.

## Route Overview

### Core Data Routes
- **`/api/episodes`** - Fetches episodes from RSS feed with caching
- **`/api/books`** - CRUD operations for books with search and filtering
- **`/api/books/[id]`** - Individual book operations
- **`/api/books/stats`** - Book statistics and metrics

### Processing Routes
- **`/api/process-data`** - Main data processing pipeline (RSS → AI extraction → Database storage)
- **`/api/extract-books`** - Enhanced AI book extraction with multi-pass capabilities
- **`/api/enhance-books`** - Google Books API metadata enhancement

### Quality & Testing Routes
- **`/api/data-quality`** - Data quality analysis and reporting
- **`/api/test-gemini`** - LLM connectivity and functionality testing
- **`/api/test-enhanced-extraction`** - Enhanced extraction testing

## Data Flow

```
RSS Feed → /api/episodes (cached)
         ↓
Episodes → /api/extract-books → Books (AI extracted)
         ↓
Books → /api/enhance-books → Enhanced Books (Google Books metadata)
         ↓
Enhanced Books → Database (via /api/process-data)
```

## Key Features

### Caching Strategy
- **RSS Feed**: 1 hour TTL
- **Book Extractions**: 24 hour TTL
- **Multi-level caching**: Memory + persistent storage

### Error Handling
- Structured error responses with ApiError interface
- Comprehensive logging and error tracking
- Graceful degradation for external API failures

### Rate Limiting
- Built-in rate limiting for Gemini AI calls
- Batch processing with configurable delays
- Request queuing and retry logic

## Development Guidelines

- All routes follow RESTful conventions
- Consistent error response format
- TypeScript strict typing throughout
- Comprehensive input validation
- Database transactions for data integrity