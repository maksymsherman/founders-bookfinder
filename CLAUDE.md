# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 14 application that extracts book recommendations from the Founders Podcast RSS feed using Google Gemini AI and displays them with pricing information. The app is built with TypeScript and TailwindCSS, designed for deployment on Vercel.

**📋 For detailed project requirements and development roadmap, see [MRD.md](./MRD.md)**

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

See [MRD.md](./MRD.md) for detailed phase breakdown

## Development Guidelines

### Code Style (from .cursor/rules/main.mdc)
- Use early returns for readability
- TailwindCSS only for styling (no CSS/style tags)
- Descriptive variable names with "handle" prefix for event functions
- Implement accessibility features (tabindex, aria-labels)
- Use const functions over function declarations
- Define types for all functions
- If you create any temporary new files, scripts, or helper files for iteration, clean up these files by removing them at the end of the task.

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

**Core Stack**: Next.js 14, TypeScript, TailwindCSS, Google Gemini AI, fast-xml-parser

*See [MRD.md](./MRD.md) for complete dependency list and technical stack details*

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