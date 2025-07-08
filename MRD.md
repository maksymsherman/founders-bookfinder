# Founders Podcast Book Finder - Minimum Requirements Document

A web application that extracts book recommendations from the Founders Podcast feed and displays current book prices.

## Project Overview

This application will:
- Parse the Founders Podcast RSS feed
- Extract book titles and links from episode descriptions using LLM
- Fetch current book prices from various sources
- Display books in a clean, searchable interface
- Be deployable on Vercel

## Technical Stack

- **Frontend**: Next.js 14+ with TypeScript
- **Styling**: TailwindCSS
- **LLM Integration**: Google Gemini
- **Book Price APIs**: Google Books API, Open Library API
- **RSS Parsing**: Fast-xml-parser or similar
- **Deployment**: Vercel

---

## Development Steps

### Phase 1: Project Setup & Foundation

- [ ] **Step 1.1: Initialize Next.js Project**
  - Create new Next.js project with TypeScript
  - Configure TailwindCSS
  - Set up project structure (components, lib, types, etc.)
  - Install required dependencies

- [ ] **Step 1.2: Environment Configuration**
  - Create `.env.local` file for API keys
  - Set up environment variables for:
    - OpenAI API key (or Claude API key)
    - Google Books API key (optional)
    - Any other required API keys

- [ ] **Step 1.3: Basic UI Components**
  - Create header component with site branding
  - Create book card component for displaying individual books
  - Create loading skeleton components
  - Create error boundary component

### Phase 2: RSS Feed Integration

- [ ] **Step 2.1: RSS Feed Parser**
  - Install and configure RSS parsing library (`fast-xml-parser` or `rss-parser`)
  - Create utility function to fetch and parse Founders Podcast RSS feed
  - Test RSS parsing with sample episodes
  - Handle errors and edge cases in RSS parsing

- [ ] **Step 2.2: Episode Data Structure**
  - Define TypeScript interfaces for:
    - Episode data structure
    - Book data structure
    - API response types
  - Create data validation functions

- [ ] **Step 2.3: RSS API Endpoint**
  - Create `/api/episodes` endpoint to fetch RSS data
  - Implement caching strategy (consider using Next.js built-in caching)
  - Add rate limiting if necessary
  - Test endpoint functionality

### Phase 3: LLM Book Extraction

- [ ] **Step 3.1: LLM Integration Setup**
  - Choose LLM provider (Google Gemini)
  - Set up API client configuration
  - Create utility functions for LLM API calls
  - Test basic LLM connectivity

- [ ] **Step 3.2: Book Extraction Prompt Engineering**
  - Design prompt template for extracting book information from episode descriptions
  - Prompt should extract:
    - Book title
    - Author name
    - Amazon/bookstore links (if present)
    - Brief context about why the book was mentioned
  - Test prompt with sample episode descriptions
  - Refine prompt for better accuracy

- [ ] **Step 3.3: Book Extraction API Endpoint**
  - Create `/api/extract-books` endpoint
  - Implement batch processing for multiple episodes
  - Add error handling and retry logic
  - Implement response caching to avoid redundant LLM calls
  - Test with real episode data

### Phase 4: Book Price Integration

- [ ] **Step 4.1: Book Search API Integration**
  - Integrate Google Books API for book search and basic info
  - Create fallback to Open Library API
  - Implement book ISBN/identifier lookup
  - Test book search functionality

- [ ] **Step 4.2: Price Data Sources**
  - Research and implement price checking options:
    - Google Books (limited pricing)
    - Amazon Product Advertising API (requires approval)
    - Alternative: Web scraping with rate limiting
    - Book price comparison APIs
  - Choose most reliable and accessible option

- [ ] **Step 4.3: Price Fetching API Endpoint**
  - Create `/api/book-prices` endpoint
  - Implement price caching (24-hour cache recommended)
  - Add error handling for unavailable prices
  - Test price fetching accuracy

### Phase 5: Data Processing & Management

- [ ] **Step 5.1: Data Processing Pipeline**
  - Create main data processing function that:
    - Fetches RSS feed
    - Extracts books using LLM
    - Fetches current prices
    - Combines and formats data
  - Implement data deduplication logic
  - Add data validation and sanitization

- [ ] **Step 5.2: Caching Strategy**
  - Implement multi-level caching:
    - RSS feed cache (1 hour)
    - Book extraction cache (24 hours)
    - Price data cache (24 hours)
  - Use Next.js built-in caching or external solution
  - Add cache invalidation methods

- [ ] **Step 5.3: Main API Endpoint**
  - Create `/api/books` endpoint that serves processed book data
  - Implement pagination for large datasets
  - Add filtering and sorting options
  - Test full data pipeline

### Phase 6: Frontend Implementation

- [ ] **Step 6.1: Main Page Layout**
  - Create responsive layout with header and main content area
  - Implement loading states for data fetching
  - Add error handling UI components
  - Test responsive design on mobile/tablet

- [ ] **Step 6.2: Book Display Components**
  - Create book grid/list component
  - Implement individual book card with:
    - Book cover image
    - Title and author
    - Episode context
    - Current price and links
    - Date added/episode date
  - Add hover states and interactions

- [ ] **Step 6.3: Search and Filter Features**
  - Implement client-side search functionality
  - Add filters for:
    - Date range
    - Price range
    - Author
    - Episode
  - Add sorting options (date, price, title)
  - Test search performance

- [ ] **Step 6.4: Additional UI Features**
  - Add "View Episode" links back to original podcast
  - Implement "Buy Now" buttons with affiliate tracking (if desired)
  - Add social sharing buttons
  - Create about/FAQ page

### Phase 7: Performance & Optimization

- [ ] **Step 7.1: Performance Optimization**
  - Implement image optimization for book covers
  - Add lazy loading for book cards
  - Optimize bundle size and remove unused dependencies
  - Test page load speeds

- [ ] **Step 7.2: SEO & Metadata**
  - Add proper meta tags and OpenGraph data
  - Implement structured data for books
  - Create sitemap.xml
  - Add robots.txt

- [ ] **Step 7.3: Error Handling & Monitoring**
  - Implement comprehensive error logging
  - Add user-friendly error messages
  - Create health check endpoint
  - Test error scenarios

### Phase 8: Testing & Quality Assurance

- [ ] **Step 8.1: API Testing**
  - Test all API endpoints with various inputs
  - Verify error handling and edge cases
  - Test rate limiting and caching
  - Validate data accuracy

- [ ] **Step 8.2: Frontend Testing**
  - Test responsive design across devices
  - Verify search and filter functionality
  - Test loading states and error handling
  - Cross-browser compatibility testing

- [ ] **Step 8.3: End-to-End Testing**
  - Test complete data flow from RSS to display
  - Verify book extraction accuracy
  - Test price data accuracy
  - Performance testing under load

### Phase 9: Local Development Completion

- [ ] **Step 9.1: Documentation**
  - Create setup instructions for local development
  - Document API endpoints and responses
  - Add troubleshooting guide
  - Create configuration guide for API keys

- [ ] **Step 9.2: Local Environment Testing**
  - Test complete application in local environment
  - Verify all features work without internet dependencies where possible
  - Test with various RSS feed scenarios
  - Validate caching mechanisms

### Phase 10: Deployment Preparation

- [ ] **Step 10.1: Vercel Configuration**
  - Create `vercel.json` configuration file
  - Set up environment variables in Vercel dashboard
  - Configure build settings and serverless functions
  - Test build process locally

- [ ] **Step 10.2: Production Optimization**
  - Implement production-specific configurations
  - Add rate limiting for API endpoints
  - Configure CDN for static assets
  - Set up monitoring and error tracking

- [ ] **Step 10.3: Deployment Testing**
  - Deploy to Vercel staging environment
  - Test all functionality in production environment
  - Verify API endpoints work with production URLs
  - Test performance and caching in production

## Book Link Extraction Strategy

### Recommended LLM Approach

**Primary Method: Google Gemini**

Use a structured prompt like:
```
Analyze the following podcast episode description and extract any book recommendations mentioned. For each book found, provide:

1. Book title (exact as mentioned)
2. Author name
3. Any direct purchase links (Amazon, bookstore links)

Respond in JSON format:
{
  "books": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "links": ["url1", "url2"],
    }
  ]
}
```

**Alternative Methods:**
- Use named entity recognition (NER) for initial book/author detection
- Implement regex patterns for common book mention formats
- Use book title databases for validation
- Combine multiple methods for higher accuracy

## Key Dependencies

```json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^3.3.0",
  "fast-xml-parser": "^4.3.0",
  "openai": "^4.0.0",
  "@anthropic-ai/sdk": "^0.9.0"
}
```

## Success Criteria

- [ ] **Functional Requirements Met**
  - Successfully parses Founders Podcast RSS feed
  - Accurately extracts book recommendations using LLM
  - Displays current book prices
  - Provides clean, searchable interface
  - Works reliably in local development environment

- [ ] **Technical Requirements Met**
  - Responsive design works on all devices
  - Page load times under 3 seconds
  - API endpoints respond under 2 seconds
  - Error handling covers all edge cases
  - Caching reduces redundant API calls

- [ ] **Ready for Deployment**
  - All environment variables configured
  - Build process works without errors
  - All features tested in production-like environment
  - Documentation complete for maintenance

---

## Estimated Timeline

- **Phase 1-2**: 2-3 days (Project setup and RSS integration)
- **Phase 3**: 2-3 days (LLM book extraction)
- **Phase 4**: 2-3 days (Book price integration)
- **Phase 5**: 1-2 days (Data processing)
- **Phase 6**: 3-4 days (Frontend implementation)
- **Phase 7-8**: 2-3 days (Optimization and testing)
- **Phase 9-10**: 1-2 days (Deployment preparation)

**Total Estimated Time**: 14-21 days for a fully functional application

---

*Last updated: [Current Date]*
*Next review: After Phase 5 completion* 