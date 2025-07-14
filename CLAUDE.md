# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 14 application that extracts book recommendations from the Founders Podcast RSS feed using Google Gemini AI and displays them with pricing information. The app is built with TypeScript and TailwindCSS, designed for deployment on Vercel.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build production version 
- `npm run start` - Start production server
- `npm run lint` - Run ESLint checks

### Environment Setup
1. Copy `env.template` to `.env.local`
2. Add your Google Gemini API key (required)
3. Optionally add Google Books API key
4. Use `./setup-env.sh` for guided setup

## Architecture

### Core Components
- **RSS Parser** (`src/lib/rss-parser.ts`) - Fetches and parses Founders Podcast RSS feed
- **Gemini Client** (`src/lib/gemini-client.ts`) - Handles AI-powered book extraction from episode descriptions
- **API Routes** (`src/app/api/`) - RESTful endpoints for episodes and future book data
- **Configuration** (`src/lib/config.ts`) - Centralized environment and cache settings

### Key Features
- **Intelligent Caching**: Multi-level caching for RSS (1hr), book extraction (24hr), and pricing (24hr)
- **Rate Limiting**: Built-in rate limiting for Gemini API (4000 RPM for Flash Lite model)
- **Error Handling**: Comprehensive error boundaries and API error responses
- **Responsive Design**: Mobile-first with TailwindCSS

### Data Flow
1. RSS feed → Parse episodes → Cache
2. Episode descriptions → Gemini AI → Extract book data → Cache
3. Book data → Price APIs → Display with current pricing

### TypeScript Architecture
- **Types** (`src/types/index.ts`) - All interfaces for Episodes, Books, API responses, and errors
- **Strict typing** throughout with proper error handling
- **API-first design** with structured response formats

## Implementation Status

### Completed (Phase 1-2)
- ✅ Next.js project setup with TypeScript and TailwindCSS
- ✅ RSS feed parsing with comprehensive error handling
- ✅ Basic UI components (Header, BookCard, LoadingSkeleton, ErrorBoundary)
- ✅ `/api/episodes` endpoint with caching
- ✅ Environment configuration system

### In Progress (Phase 3)
- 🔄 Google Gemini integration for book extraction
- 🔄 Book extraction API endpoint
- 🔄 LLM prompt engineering for accurate book identification

### Planned (Phase 4+)
- 📋 Book price integration (Google Books API)
- 📋 Frontend book display and search
- 📋 Performance optimization

## Development Guidelines

### Code Style (from .cursor/rules/main.mdc)
- Use early returns for readability
- TailwindCSS only for styling (no CSS/style tags)
- Descriptive variable names with "handle" prefix for event functions
- Implement accessibility features (tabindex, aria-labels)
- Use const functions over function declarations
- Define types for all functions

### API Design Patterns
- Consistent error response format with ApiError interface
- Structured caching with CacheEntry<T> type
- Rate limiting built into service classes
- Comprehensive input validation

### Testing Approach
- Test API endpoints with various inputs
- Verify caching mechanisms
- Test error scenarios and edge cases
- No specific testing framework configured yet

## Key Dependencies

### Core
- `next` ^14.0.0 - React framework
- `react` ^18.0.0 - UI library
- `typescript` ^5.0.0 - Type safety

### RSS & AI
- `fast-xml-parser` ^4.3.0 - RSS parsing
- `@google/generative-ai` ^0.2.0 - Gemini AI integration

### Styling
- `tailwindcss` ^3.3.0 - Utility-first CSS
- `autoprefixer` ^10.0.1 - CSS vendor prefixes

### Development
- `eslint` ^8.0.0 - Linting with Next.js config
- `dotenv` ^17.1.0 - Environment variables

## Common Issues

### API Key Setup
- Ensure GOOGLE_GEMINI_API_KEY is properly set in .env.local
- Check rate limits if getting 429 errors from Gemini
- Verify RSS feed URL is accessible

### Cache Issues
- Use POST `/api/episodes` with `{"action": "clear-cache"}` to clear cache in development
- Check cache TTL settings in config.ts

### Build Issues
- Run `npm run lint` to check for TypeScript/ESLint errors
- Ensure all environment variables are set for production builds