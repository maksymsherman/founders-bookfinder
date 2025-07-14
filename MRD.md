# Founders Podcast Book Finder - Minimum Requirements Document

A web application that extracts book recommendations from the Founders Podcast feed and saves them in a structured format for future analysis and display.

## Project Overview

This application will:
- Parse the Founders Podcast RSS feed
- Extract book titles, authors, and context from episode descriptions using LLM
- Save extracted books in a structured, searchable format
- Implement data validation and deduplication
- Create a robust book extraction and management system
- Eventually display books with pricing information
- Be deployable on Vercel

## Technical Stack

Next.js 14+ with TypeScript, TailwindCSS, Google Gemini AI, Google Books API, Supabase PostgreSQL, fast-xml-parser, deployed on Vercel.

*See [CLAUDE.md](./CLAUDE.md) for detailed technical architecture and implementation guidelines*

---

## Development Steps

### Phase 1: Project Setup & Foundation

- [X] **Step 1.1: Initialize Next.js Project**
  - Create new Next.js project with TypeScript
  - Configure TailwindCSS
  - Set up project structure (components, lib, types, etc.)
  - Install required dependencies

- [X] **Step 1.2: Environment Configuration**
  - Create `.env.local` file for API keys
  - Set up environment variables for:
    - Google Gemini API key
    - Google Books API key (optional)
    - Supabase URL and anon key
    - Any other required API keys

- [X] **Step 1.3: Basic UI Components**
  - Create header component with site branding
  - Create book card component for displaying individual books
  - Create loading skeleton components
  - Create error boundary component

### Phase 2: RSS Feed Integration

- [X] **Step 2.1: RSS Feed Parser**
  - Install and configure RSS parsing library (`fast-xml-parser` or `rss-parser`)
  - Create utility function to fetch and parse Founders Podcast RSS feed
  - Test RSS parsing with sample episodes
  - Handle errors and edge cases in RSS parsing

- [X] **Step 2.2: Episode Data Structure**
  - Define TypeScript interfaces for:
    - Episode data structure
    - Book data structure
    - API response types
  - Create data validation functions

- [X] **Step 2.3: RSS API Endpoint**
  - Create `/api/episodes` endpoint to fetch RSS data
  - Implement caching strategy (consider using Next.js built-in caching)
  - Add rate limiting if necessary
  - Test endpoint functionality

### Phase 3: LLM Book Extraction

- [X] **Step 3.1: LLM Integration Setup**
  - Choose LLM provider (Google Gemini)
  - Set up API client configuration
  - Create utility functions for LLM API calls
  - Test basic LLM connectivity

- [X] **Step 3.2: Book Extraction Prompt Engineering**
  - Design prompt template for extracting book information from episode descriptions
  - Prompt should extract:
    - Book title
    - Author name
    - Amazon/bookstore links (if present)
    - Brief context about why the book was mentioned
  - Test prompt with sample episode descriptions
  - Refine prompt for better accuracy

- [X] **Step 3.3: Book Extraction API Endpoint**
  - Create `/api/extract-books` endpoint
  - Implement batch processing for multiple episodes
  - Add error handling and retry logic
  - Implement response caching to avoid redundant LLM calls
  - Test with real episode data

### Phase 4: Book Data Enhancement & Storage

- [X] **Step 4.1: Book Data Enrichment**
  - Integrate Google Books API for additional book metadata (ISBN, publisher, publication date, cover images)
  - Create fallback to Open Library API for missing data
  - Implement book ISBN/identifier lookup and validation
  - Add book cover image fetching and local caching

- [X] **Step 4.2: Database Setup & Schema Design**
  - Set up Supabase project and configure database connection
  - Design PostgreSQL schema for books, episodes, and extraction metadata
  - Create database tables with proper indexes and relationships
  - Implement database migration scripts and version control

- [X] **Step 4.3: Database Integration & ORM Setup**
  - Install and configure Supabase client for Next.js
  - Set up database connection and environment variables
  - Create TypeScript types for database schema
  - Implement database utility functions and error handling

- [X] **Step 4.4: Book Management API**
  - Create `/api/books` endpoint for CRUD operations with Supabase
  - Implement book search and filtering capabilities using PostgreSQL
  - Add book editing and manual addition features
  - Create book deletion and archiving functionality

### Phase 5: Data Validation & Quality Control

- [X] **Step 5.1: Book Extraction Validation**
  - Implement book title and author validation logic
  - Create duplicate detection and merging algorithms
  - Add confidence scoring for extracted books

- [X] **Step 5.2: Data Quality Assurance**
  - Create data integrity checks and validation rules
  - Implement automated data cleaning processes
  - Add book metadata verification against external sources
  - Create data quality reports and metrics

- [X] **Step 5.3: Enhanced LLM Processing** ✅ COMPLETED
  - Improve LLM prompts for better extraction accuracy ✅
  - Implement multi-pass extraction for complex episodes ✅
  - Add context preservation between book mentions ✅
  - Create extraction confidence scoring system ✅

### Phase 6: Data Management & Caching

- [ ] **Step 6.1: Advanced Caching Strategy**
  - Implement multi-level caching:
    - RSS feed cache (1 hour)
    - Book extraction cache (24 hours)
    - Book metadata cache (7 days)
  - Use Next.js built-in caching or external solution
  - Add cache invalidation and refresh methods

- [ ] **Step 6.2: Data Processing Pipeline**
  - Create main data processing function that:
    - Fetches RSS feed
    - Extracts books using LLM
    - Enriches with metadata
    - Stores in structured format
  - Implement incremental processing for new episodes
  - Add data versioning and rollback capabilities

- [ ] **Step 6.3: Advanced Database Features**
  - Implement PostgreSQL full-text search for books
  - Add database triggers for data validation and audit logging
  - Create database views for analytics and reporting
  - Implement automated data maintenance and cleanup tasks

### Phase 7: Frontend Implementation

- [ ] **Step 7.1: Main Page Layout**
  - Create responsive layout with header and main content area
  - Implement loading states for data fetching
  - Add error handling UI components
  - Test responsive design on mobile/tablet

- [ ] **Step 7.2: Book Display Components**
  - Create book grid/list component
  - Implement individual book card with:
    - Book cover image
    - Title and author
    - Episode context and links
    - Date added/episode date
    - Extraction confidence score
  - Add hover states and interactions

- [ ] **Step 7.3: Search and Filter Features**
  - Implement client-side search functionality
  - Add filters for:
    - Date range
    - Author
    - Episode
    - Confidence score
  - Add sorting options (date, title, confidence)
  - Test search performance

- [ ] **Step 7.4: Book Management Interface**
  - Add book editing and manual addition forms
  - Create book approval/rejection interface
  - Implement batch operations for books
  - Add data export functionality

### Phase 8: Book Price Integration (Optional)

- [ ] **Step 8.1: Price Data Sources Research**
  - Research and evaluate price checking options:
    - Google Books (limited pricing)
    - Amazon Product Advertising API (requires approval)
    - Alternative: Web scraping with rate limiting
    - Book price comparison APIs
  - Choose most reliable and accessible option

- [ ] **Step 8.2: Price Fetching Implementation**
  - Create `/api/book-prices` endpoint
  - Implement price caching (24-hour cache recommended)
  - Add error handling for unavailable prices
  - Test price fetching accuracy

- [ ] **Step 8.3: Price Display Integration**
  - Add price information to book cards
  - Implement "Buy Now" buttons with affiliate tracking
  - Add price history tracking
  - Create price alerts and notifications

### Phase 9: Performance & Optimization

- [ ] **Step 9.1: Performance Optimization**
  - Implement image optimization for book covers
  - Add lazy loading for book cards
  - Optimize bundle size and remove unused dependencies
  - Test page load speeds

- [ ] **Step 9.2: SEO & Metadata**
  - Add proper meta tags and OpenGraph data
  - Implement structured data for books
  - Create sitemap.xml
  - Add robots.txt

- [ ] **Step 9.3: Error Handling & Monitoring**
  - Implement comprehensive error logging
  - Add user-friendly error messages
  - Create health check endpoint
  - Test error scenarios

### Phase 10: Testing & Quality Assurance

- [ ] **Step 10.1: Book Extraction Testing**
  - Test LLM extraction accuracy with various episode types
  - Verify duplicate detection and merging
  - Test confidence scoring accuracy
  - Validate book metadata enrichment

- [ ] **Step 10.2: API Testing**
  - Test all API endpoints with various inputs
  - Verify error handling and edge cases
  - Test rate limiting and caching
  - Validate data integrity and consistency

- [ ] **Step 10.3: Frontend Testing**
  - Test responsive design across devices
  - Verify search and filter functionality
  - Test book management interface
  - Cross-browser compatibility testing

- [ ] **Step 10.4: End-to-End Testing**
  - Test complete data flow from RSS to storage
  - Verify book extraction accuracy across different episodes
  - Test data persistence and retrieval
  - Performance testing under load

### Phase 11: Local Development Completion

- [ ] **Step 11.1: Documentation**
  - Create setup instructions for local development
  - Document API endpoints and book data structure
  - Add troubleshooting guide for book extraction
  - Create configuration guide for API keys

- [ ] **Step 11.2: Local Environment Testing**
  - Test complete application in local environment
  - Verify book extraction and storage works reliably
  - Test with various RSS feed scenarios
  - Validate caching and data management

### Phase 12: Deployment Preparation

- [ ] **Step 12.1: Vercel Configuration**
  - Create `vercel.json` configuration file
  - Set up environment variables in Vercel dashboard
  - Configure build settings and serverless functions
  - Test build process locally

- [ ] **Step 12.2: Production Optimization**
  - Implement production-specific configurations
  - Add rate limiting for API endpoints
  - Configure CDN for static assets
  - Set up monitoring and error tracking

- [ ] **Step 12.3: Deployment Testing**
  - Deploy to Vercel staging environment
  - Test all functionality in production environment
  - Verify book extraction and storage in production
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

*See [CLAUDE.md](./CLAUDE.md) for complete dependency list and technical implementation details*

## Success Criteria

- [X] **Core Book Extraction Requirements**
  - Successfully parses Founders Podcast RSS feed ✅
  - Accurately extracts book recommendations using LLM ✅
  - Saves extracted books in structured format (Phase 4 - pending)
  - Implements data validation and deduplication (Phase 5 - pending)
  - Works reliably in local development environment ✅

- [ ] **Data Management Requirements**
  - Book data stored in searchable, structured format
  - Duplicate detection and merging works accurately
  - Book metadata enrichment from external APIs
  - Data quality assurance and validation
  - Export capabilities for extracted data

- [ ] **Technical Requirements Met**
  - Responsive design works on all devices
  - Page load times under 3 seconds
  - API endpoints respond under 2 seconds
  - Error handling covers all edge cases
  - Caching reduces redundant API calls

- [ ] **Ready for Deployment**
  - All environment variables configured
  - Build process works without errors
  - Book extraction tested in production-like environment
  - Documentation complete for maintenance

---

## Estimated Timeline

- **Phase 1-2**: 2-3 days (Project setup and RSS integration) ✅ COMPLETED
- **Phase 3**: 2-3 days (LLM book extraction) ✅ COMPLETED
- **Phase 4**: 2-3 days (Book data enhancement & storage) 🚧 NEXT
- **Phase 5**: 2-3 days (Data validation & quality control)
- **Phase 6**: 2-3 days (Data management & caching)
- **Phase 7**: 3-4 days (Frontend implementation)
- **Phase 8**: 2-3 days (Book price integration - Optional)
- **Phase 9-10**: 2-3 days (Optimization and testing)
- **Phase 11-12**: 1-2 days (Deployment preparation)

**Total Estimated Time**: 16-24 days for a fully functional application with book extraction focus
**Current Progress**: 3/12 phases completed (25%) + Step 5.3 Enhanced LLM Processing ✅

---

## Step 5.3 Implementation Summary ✅

**Enhanced LLM Processing** has been successfully implemented with the following key features:

### 🚀 **Improved LLM Prompts**
- **Specialized prompts** with detailed extraction criteria and quality standards
- **Clear inclusion/exclusion rules** to focus on primary books only
- **Structured JSON responses** with confidence scores and reasoning
- **Example-driven prompts** for better consistency
- **Temperature optimization** (0.2 for initial, 0.1 for refinement/validation)

### 🔄 **Multi-Pass Extraction System**
- **Intelligent complexity detection** based on episode length and content patterns
- **Three-pass extraction process**:
  1. **Initial Pass**: Primary extraction with enhanced prompts
  2. **Refinement Pass**: Verification and improvement of extracted data
  3. **Validation Pass**: Final quality assurance and filtering
- **Automatic fallback** to simple extraction if multi-pass fails
- **Configurable extraction strategy** (can disable multi-pass for testing)

### 💭 **Context Preservation**
- **Episode context caching** for maintaining themes across extractions
- **Cross-episode context sharing** for better understanding
- **Context quality scoring** and effectiveness tracking
- **Preserved context integration** in subsequent extractions
- **Memory-efficient context storage** with automatic cleanup

### 📊 **Enhanced Confidence Scoring**
- **Multi-factor confidence calculation**:
  - Heuristic scoring (40% weight): title, author, context quality
  - LLM confidence (50% weight): AI-provided confidence scores
  - Extraction method bonus (10% weight): multi-pass vs simple
- **Detailed confidence reasoning** with human-readable explanations
- **Confidence level categorization**: Excellent, Good, Moderate, Poor, Very Poor
- **Review flagging** for books below quality thresholds
- **Batch confidence processing** for multiple books

### 🛠 **Implementation Details**

**Enhanced Files:**
- `src/lib/gemini-client.ts` - Multi-pass extraction logic and improved prompts
- `src/lib/confidence.ts` - Advanced confidence scoring system
- `src/app/api/extract-books/route.ts` - Enhanced extraction API with context preservation
- `src/types/index.ts` - New types for enhanced extraction features
- `src/app/api/test-enhanced-extraction/route.ts` - Test endpoint for validation

**Key Features:**
- **Backward compatibility** maintained with existing simple extraction
- **Performance optimization** with intelligent caching and rate limiting
- **Comprehensive error handling** with graceful fallbacks
- **Detailed extraction statistics** and performance metrics
- **Test endpoint** for validating enhanced features

**Quality Improvements:**
- Higher accuracy in book extraction with multi-pass validation
- Better confidence scoring with multiple quality factors
- Context awareness for improved consistency across episodes
- Automated quality assurance with review flagging
- Enhanced error handling and processing notes

### 🧪 **Testing & Validation**
- **Test API endpoint**: `/api/test-enhanced-extraction`
- **Demo episode support** for testing different complexity levels
- **Health check functionality** for system validation
- **Comparison testing** between simple and multi-pass extraction
- **Performance metrics** tracking and analysis

**Next Steps**: Phase 4 (Book data enhancement & storage) ready to begin with enhanced extraction capabilities.

---

*Last updated: December 28, 2024*
*Next review: After Phase 4 completion (Book data enhancement & storage)* 