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
   * Extract the main book that the episode is about
   */
  async extractBooksFromEpisode(episodeDescription: string): Promise<any> {
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

      // Try to parse JSON response, handling markdown code blocks
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
    } catch (error) {
      console.error('Failed to extract books from episode:', error);
      throw error;
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