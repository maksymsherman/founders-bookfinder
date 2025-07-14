// Types for Gemini API
export interface GeminiContentPart {
  text: string;
}

export interface GeminiContent {
  parts: GeminiContentPart[];
}

export interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  };
}

export interface GeminiError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

// Enhanced extraction types
export interface ExtractedBookRaw {
  title: string;
  author: string;
  links: string[];
  context?: string;
  confidence?: number;
  reasoning?: string;
}

export interface ExtractionPass {
  passType: 'initial' | 'refinement' | 'validation';
  books: ExtractedBookRaw[];
  contextPreserved: string;
  confidence: number;
}

export interface MultiPassExtractionResult {
  passes: ExtractionPass[];
  finalBooks: ExtractedBookRaw[];
  overallConfidence: number;
  processingNotes: string[];
}

// Rate limiting utility
class RateLimiter {
  private requests: number[] = [];
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number, windowMs: number = 60000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.limit) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }

  async waitForSlot(): Promise<void> {
    while (!(await this.checkLimit())) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Initialize rate limiter - Updated for Gemini 2.5 Flash Lite (4000 RPM)
const rateLimiter = new RateLimiter(4000, 60000); // 4000 requests per minute

// Base Gemini API client
export class GeminiClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_GEMINI_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('Google Gemini API key is required. Set GOOGLE_GEMINI_API_KEY in your environment variables.');
    }
  }

  /**
   * Generate content using Gemini API
   */
  async generateContent(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      retries?: number;
    } = {}
  ): Promise<string> {
    const {
      model = 'gemini-2.5-flash-lite-preview-06-17',
      temperature = 0.7,
      maxTokens = 2048,
      retries = 3
    } = options;

    // Wait for rate limit slot
    await rateLimiter.waitForSlot();

    const requestBody: GeminiRequest = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens
      }
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(
          `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          const errorData: GeminiError = await response.json();
          throw new Error(`Gemini API error: ${errorData.error.message} (${errorData.error.code})`);
        }

        const data: GeminiResponse = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
          throw new Error('No response generated from Gemini API');
        }

        return data.candidates[0].content.parts[0].text;

      } catch (error) {
        lastError = error as Error;
        
        // If it's a rate limit error, wait and retry
        if (error instanceof Error && error.message.includes('429')) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // For other errors, break immediately
        break;
      }
    }

    throw new Error(`Failed to generate content after ${retries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Test the connection to Gemini API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generateContent(
        'Respond with "OK" if you can read this message.',
        { maxTokens: 10, temperature: 0 }
      );
      return response.trim().toLowerCase() === 'ok';
    } catch (error) {
      console.error('Gemini API connection test failed:', error);
      return false;
    }
  }

  /**
   * Enhanced book extraction with improved prompts and validation
   */
  private async performInitialExtraction(episodeDescription: string, episodeContext: string = ''): Promise<ExtractionPass> {
    const prompt = `
You are a specialized AI assistant for extracting book recommendations from podcast episode descriptions. Your task is to identify books that are CENTRAL to the episode content.

EXTRACTION CRITERIA:
✅ INCLUDE:
- Books explicitly mentioned as the main subject of the episode
- Biographies/books about the person featured in the episode title
- Books that the episode content is directly based on or discussing
- Primary source materials that drive the episode's narrative
- Books where the author is interviewed or featured

❌ EXCLUDE:
- Books mentioned only in passing or as brief references
- Secondary books mentioned without detail
- Books only tangentially related to the main topic
- Documentaries, movies, or non-book media
- Generic business advice books mentioned without specific context

QUALITY STANDARDS:
- Extract maximum 2-3 books per episode (focus on primary sources)
- Ensure exact title spelling and complete author names
- Provide meaningful context explaining why each book is central
- Assign confidence scores based on clarity of mention and relevance

${episodeContext ? `PREVIOUS CONTEXT:\n${episodeContext}\n` : ''}

RESPONSE FORMAT (JSON only):
{
  "books": [
    {
      "title": "Exact Book Title As Mentioned",
      "author": "Complete Author Name",
      "links": ["url1", "url2"],
      "context": "Detailed explanation of why this book is central to the episode",
      "confidence": 0.85,
      "reasoning": "Brief explanation of confidence score"
    }
  ],
  "contextPreserved": "Key themes and subjects from this episode for future reference",
  "overallConfidence": 0.80
}

EXAMPLE OUTPUT:
{
  "books": [
    {
      "title": "Steve Jobs",
      "author": "Walter Isaacson",
      "links": [],
      "context": "This episode is entirely based on Walter Isaacson's biography of Steve Jobs, discussing his early life and founding of Apple",
      "confidence": 0.95,
      "reasoning": "Episode title mentions Steve Jobs and description explicitly references Isaacson's biography multiple times"
    }
  ],
  "contextPreserved": "Biography-based episode about Steve Jobs, focusing on Apple's founding and early technology innovation",
  "overallConfidence": 0.95
}

Episode Description:
${episodeDescription}
`;

    try {
      const response = await this.generateContent(prompt, {
        temperature: 0.2, // Lower temperature for more consistent extraction
        maxTokens: 1500
      });

      const result = this.parseJsonResponse(response);
      
      return {
        passType: 'initial',
        books: result.books || [],
        contextPreserved: result.contextPreserved || '',
        confidence: result.overallConfidence || 0.5
      };
    } catch (error) {
      console.error('Initial extraction failed:', error);
      throw error;
    }
  }

  /**
   * Refinement pass to improve extraction quality
   */
  private async performRefinementPass(
    initialBooks: ExtractedBookRaw[], 
    episodeDescription: string, 
    preservedContext: string
  ): Promise<ExtractionPass> {
    if (initialBooks.length === 0) {
      return {
        passType: 'refinement',
        books: [],
        contextPreserved: preservedContext,
        confidence: 0
      };
    }

    const prompt = `
You are reviewing and refining a book extraction. Examine the initially extracted books and improve accuracy, completeness, and confidence scoring.

REFINEMENT TASKS:
1. Verify book titles and author names for accuracy
2. Enhance context descriptions with more detail
3. Recalculate confidence scores based on evidence strength
4. Remove any books that don't meet quality criteria
5. Add missing books if any were overlooked

PRESERVED CONTEXT: ${preservedContext}

INITIALLY EXTRACTED BOOKS:
${JSON.stringify(initialBooks, null, 2)}

EPISODE DESCRIPTION:
${episodeDescription}

Provide refined extraction in the same JSON format with improved accuracy and confidence scores:

{
  "books": [
    {
      "title": "Refined Title",
      "author": "Verified Author",
      "links": [],
      "context": "Enhanced context with more specific details",
      "confidence": 0.90,
      "reasoning": "Updated reasoning for confidence score"
    }
  ],
  "contextPreserved": "Enhanced preserved context",
  "overallConfidence": 0.85
}
`;

    try {
      const response = await this.generateContent(prompt, {
        temperature: 0.1, // Very low temperature for refinement
        maxTokens: 1500
      });

      const result = this.parseJsonResponse(response);
      
      return {
        passType: 'refinement',
        books: result.books || initialBooks,
        contextPreserved: result.contextPreserved || preservedContext,
        confidence: result.overallConfidence || 0.5
      };
    } catch (error) {
      console.warn('Refinement pass failed, using initial extraction:', error);
      return {
        passType: 'refinement',
        books: initialBooks,
        contextPreserved: preservedContext,
        confidence: 0.5
      };
    }
  }

  /**
   * Validation pass to ensure extraction quality
   */
  private async performValidationPass(
    refinedBooks: ExtractedBookRaw[], 
    episodeDescription: string
  ): Promise<ExtractionPass> {
    if (refinedBooks.length === 0) {
      return {
        passType: 'validation',
        books: [],
        contextPreserved: '',
        confidence: 0
      };
    }

    const prompt = `
Validate the final book extraction. Check each book for:

1. RELEVANCE: Is this book truly central to the episode?
2. ACCURACY: Are title and author correct?
3. CONTEXT: Is the explanation clear and specific?
4. CONFIDENCE: Is the confidence score justified?

Rate each book as VALID or INVALID with reasoning.

BOOKS TO VALIDATE:
${JSON.stringify(refinedBooks, null, 2)}

EPISODE DESCRIPTION:
${episodeDescription}

Respond with validation results:
{
  "validatedBooks": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "links": [],
      "context": "Context",
      "confidence": 0.90,
      "reasoning": "Validation reasoning",
      "validationStatus": "VALID"
    }
  ],
  "overallConfidence": 0.85,
  "validationNotes": "Summary of validation process"
}
`;

    try {
      const response = await this.generateContent(prompt, {
        temperature: 0.1,
        maxTokens: 1000
      });

      const result = this.parseJsonResponse(response);
      const validBooks = (result.validatedBooks || []).filter(
        (book: any) => book.validationStatus === 'VALID'
      );
      
      return {
        passType: 'validation',
        books: validBooks,
        contextPreserved: result.validationNotes || '',
        confidence: result.overallConfidence || 0.5
      };
    } catch (error) {
      console.warn('Validation pass failed, using refined books:', error);
      return {
        passType: 'validation',
        books: refinedBooks,
        contextPreserved: '',
        confidence: 0.5
      };
    }
  }

  /**
   * Multi-pass extraction with context preservation
   */
  async extractBooksWithMultiPass(
    episodeDescription: string, 
    preservedContext: string = ''
  ): Promise<MultiPassExtractionResult> {
    const processingNotes: string[] = [];
    const passes: ExtractionPass[] = [];

    try {
      // Pass 1: Initial extraction
      processingNotes.push('Starting initial extraction pass');
      const initialPass = await this.performInitialExtraction(episodeDescription, preservedContext);
      passes.push(initialPass);
      processingNotes.push(`Initial pass extracted ${initialPass.books.length} books`);

      // Pass 2: Refinement (only if initial extraction found books)
      let refinementPass: ExtractionPass;
      if (initialPass.books.length > 0) {
        processingNotes.push('Starting refinement pass');
        refinementPass = await this.performRefinementPass(
          initialPass.books, 
          episodeDescription, 
          initialPass.contextPreserved
        );
        passes.push(refinementPass);
        processingNotes.push(`Refinement pass processed ${refinementPass.books.length} books`);
      } else {
        refinementPass = initialPass;
        processingNotes.push('Skipping refinement pass - no books found in initial extraction');
      }

      // Pass 3: Validation (only if refinement found books)
      let validationPass: ExtractionPass;
      if (refinementPass.books.length > 0) {
        processingNotes.push('Starting validation pass');
        validationPass = await this.performValidationPass(refinementPass.books, episodeDescription);
        passes.push(validationPass);
        processingNotes.push(`Validation pass approved ${validationPass.books.length} books`);
      } else {
        validationPass = refinementPass;
        processingNotes.push('Skipping validation pass - no books to validate');
      }

      // Calculate overall confidence
      const overallConfidence = passes.length > 0 
        ? passes.reduce((sum, pass) => sum + pass.confidence, 0) / passes.length
        : 0;

      processingNotes.push(`Multi-pass extraction completed with confidence: ${overallConfidence.toFixed(2)}`);

      return {
        passes,
        finalBooks: validationPass.books,
        overallConfidence,
        processingNotes
      };

    } catch (error) {
      processingNotes.push(`Multi-pass extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Multi-pass extraction error:', error);
      
      // Fallback to simple extraction
      try {
        const fallbackResult = await this.extractBooksFromEpisode(episodeDescription);
        return {
          passes: [],
          finalBooks: fallbackResult.books || [],
          overallConfidence: 0.3,
          processingNotes: [...processingNotes, 'Fell back to simple extraction']
        };
      } catch (fallbackError) {
        return {
          passes: [],
          finalBooks: [],
          overallConfidence: 0,
          processingNotes: [...processingNotes, 'Both multi-pass and fallback extraction failed']
        };
      }
    }
  }

  /**
   * Determine if episode needs multi-pass extraction
   */
  private isComplexEpisode(episodeDescription: string): boolean {
    const complexityIndicators = [
      /multiple.*book/i,
      /biography.*and.*autobiography/i,
      /part\s+\d+/i,
      /continued/i,
      /series/i,
      /interview.*author/i,
      /discussion.*several/i,
      /various.*source/i,
      /recommend.*reading/i
    ];

    const descriptionLength = episodeDescription.length;
    const hasComplexityIndicators = complexityIndicators.some(pattern => pattern.test(episodeDescription));
    
    return descriptionLength > 800 || hasComplexityIndicators;
  }

  /**
   * Enhanced book extraction that chooses between simple and multi-pass
   */
  async extractBooksFromEpisode(episodeDescription: string, preservedContext: string = ''): Promise<any> {
    // Determine extraction strategy
    const needsMultiPass = this.isComplexEpisode(episodeDescription);
    
    if (needsMultiPass) {
      console.log('Using multi-pass extraction for complex episode');
      const multiPassResult = await this.extractBooksWithMultiPass(episodeDescription, preservedContext);
      
      return {
        books: multiPassResult.finalBooks,
        multiPass: true,
        confidence: multiPassResult.overallConfidence,
        processingNotes: multiPassResult.processingNotes,
        passes: multiPassResult.passes.length
      };
    } else {
      console.log('Using single-pass extraction for simple episode');
      return this.extractBooksFromEpisodeSimple(episodeDescription);
    }
  }

  /**
   * Original simple extraction method (preserved for backward compatibility)
   */
  private async extractBooksFromEpisodeSimple(episodeDescription: string): Promise<any> {
    const prompt = `
Analyze the following podcast episode description and identify the MAIN BOOKS that this episode is specifically about or based on.

IMPORTANT: Return only the primary books (maximum 2) that the episode content is directly based on.

Look for:
- Books explicitly mentioned as the main sources
- Biographies or books about the person featured in the episode title
- Books that the episode summary clearly centers around
- Primary source materials that the episode discusses in detail

EXCLUDE:
- Secondary books mentioned in passing
- Books just mentioned as brief references
- Books that are only tangentially related
- Documentaries
- Interviews

Return only the most important books that the episode is actually about.

Respond in JSON format:
{
  "books": [
    {
      "title": "Exact Book Title",
      "author": "Author Name",
      "links": []
    }
  ]
}

If no clear main books are identified, return {"books": []}.

Episode description:
${episodeDescription}
`;

    try {
      const response = await this.generateContent(prompt, {
        temperature: 0.3, // Lower temperature for more consistent extraction
        maxTokens: 1024
      });

      return this.parseJsonResponse(response);
    } catch (error) {
      console.error('Failed to extract books from episode:', error);
      throw error;
    }
  }

  /**
   * Utility method to parse JSON responses with error handling
   */
  private parseJsonResponse(response: string): any {
    try {
      // Remove markdown code block markers if present
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      // If JSON parsing fails, return the raw response
      console.warn('Failed to parse JSON response from Gemini:', parseError);
      return { books: [], rawResponse: response };
    }
  }
}

// Export a function to get a GeminiClient instance (after env is loaded)
export const getGeminiClient = () => new GeminiClient();

// Utility function for quick content generation
export const generateContent = async (
  prompt: string,
  options?: Parameters<GeminiClient['generateContent']>[1]
): Promise<string> => {
  return getGeminiClient().generateContent(prompt, options);
};

// Utility function for testing connection
export const testGeminiConnection = async (): Promise<boolean> => {
  return getGeminiClient().testConnection();
}; 