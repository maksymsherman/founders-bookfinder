import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini-client';
import { calculateEnhancedConfidence, getConfidenceLevel } from '@/lib/confidence';
import { Book, EnhancedBookExtractionResponse, ApiError } from '@/types';

interface TestExtractionRequest {
  episodeDescription: string;
  enableMultiPass?: boolean;
  preserveContext?: boolean;
  testContext?: string;
}

interface TestExtractionResponse {
  success: boolean;
  testResults: {
    extractionMethod: 'simple' | 'multi-pass';
    booksExtracted: number;
    processingTime: number;
    averageConfidence: number;
    confidenceDistribution: Record<string, number>;
    processingNotes: string[];
    contextPreserved?: string;
    passes?: number;
  };
  books: Array<{
    title: string;
    author: string;
    context?: string;
    confidence: number;
    confidenceLevel: string;
    confidenceReasoning: string;
    needsReview: boolean;
    extractionMethod: 'simple' | 'multi-pass';
    llmConfidence?: number;
  }>;
  error?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: TestExtractionRequest = await request.json();
    
    if (!body.episodeDescription) {
      const error: ApiError = {
        message: 'Episode description is required for testing',
        code: 'INVALID_REQUEST'
      };
      return NextResponse.json(error, { status: 400 });
    }

    const {
      episodeDescription,
      enableMultiPass = true,
      preserveContext = true,
      testContext = ''
    } = body;

    const geminiClient = getGeminiClient();
    
    console.log('Testing enhanced extraction with:', {
      enableMultiPass,
      preserveContext,
      hasTestContext: !!testContext,
      descriptionLength: episodeDescription.length
    });

    // Perform extraction using enhanced method
    let extractionResult: any;
    
    if (enableMultiPass) {
      extractionResult = await geminiClient.extractBooksFromEpisode(
        episodeDescription,
        testContext
      );
    } else {
      // Force simple extraction for comparison
      extractionResult = await (geminiClient as any).extractBooksFromEpisodeSimple(episodeDescription);
      extractionResult.multiPass = false;
    }

    const processingTime = Date.now() - startTime;

    if (!extractionResult.books || !Array.isArray(extractionResult.books)) {
      return NextResponse.json<TestExtractionResponse>({
        success: true,
        testResults: {
          extractionMethod: extractionResult.multiPass ? 'multi-pass' : 'simple',
          booksExtracted: 0,
          processingTime,
          averageConfidence: 0,
          confidenceDistribution: {},
          processingNotes: ['No books found in episode description'],
          contextPreserved: extractionResult.contextPreserved,
          passes: extractionResult.passes || 1
        },
        books: []
      });
    }

    // Process extracted books with enhanced confidence scoring
    const processedBooks = extractionResult.books.map((bookData: any) => {
      // Create temporary book object for confidence calculation
      const tempBook: Book = {
        id: 'test',
        title: bookData.title,
        author: bookData.author,
        extractedLinks: bookData.links || [],
        episodeId: 'test',
        episodeTitle: 'Test Episode',
        episodeDate: new Date().toISOString(),
        context: bookData.context,
        dateAdded: new Date().toISOString()
      };

      // Calculate enhanced confidence
      const confidenceResult = calculateEnhancedConfidence(
        tempBook,
        bookData.confidence,
        extractionResult.multiPass ? 'multi-pass' : 'simple'
      );

      return {
        title: bookData.title,
        author: bookData.author,
        context: bookData.context,
        confidence: confidenceResult.score,
        confidenceLevel: getConfidenceLevel(confidenceResult.score),
        confidenceReasoning: confidenceResult.reasoning,
        needsReview: confidenceResult.needsReview,
        extractionMethod: extractionResult.multiPass ? 'multi-pass' as const : 'simple' as const,
        llmConfidence: bookData.confidence
      };
    });

    // Calculate statistics
    const averageConfidence = processedBooks.length > 0 
      ? processedBooks.reduce((sum: number, book: typeof processedBooks[0]) => sum + book.confidence, 0) / processedBooks.length
      : 0;

    // Calculate confidence distribution
    const confidenceDistribution = processedBooks.reduce((dist: Record<string, number>, book: typeof processedBooks[0]) => {
      const level = book.confidenceLevel;
      dist[level] = (dist[level] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    const testResults = {
      extractionMethod: extractionResult.multiPass ? 'multi-pass' as const : 'simple' as const,
      booksExtracted: processedBooks.length,
      processingTime,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      confidenceDistribution,
      processingNotes: extractionResult.processingNotes || ['Single-pass extraction completed'],
      contextPreserved: extractionResult.contextPreserved,
      passes: extractionResult.passes || 1
    };

    console.log('Enhanced extraction test completed:', {
      method: testResults.extractionMethod,
      books: testResults.booksExtracted,
      time: testResults.processingTime,
      avgConfidence: testResults.averageConfidence
    });

    const response: TestExtractionResponse = {
      success: true,
      testResults,
      books: processedBooks
    };

    return NextResponse.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Enhanced extraction test failed:', error);
    
    const response: TestExtractionResponse = {
      success: false,
      testResults: {
        extractionMethod: 'simple',
        booksExtracted: 0,
        processingTime,
        averageConfidence: 0,
        confidenceDistribution: {},
        processingNotes: [`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      },
      books: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'demo') {
    // Provide a demo episode description for testing
    const demoEpisode = {
      description: `In this episode, David Senra discusses the incredible life and business philosophy of Walt Disney, based on Walter Isaacson's biography "Walt Disney: The Triumph of the American Imagination" by Neal Gabler. Walt's story of building Disney from nothing into a global entertainment empire offers timeless lessons about creativity, persistence, and vision. We explore how Walt revolutionized animation with Snow White and the Seven Dwarfs, created Disneyland despite massive skepticism, and maintained his creative vision throughout decades of challenges. Additional insights come from "The Illusion of Life" by Frank Thomas and Ollie Johnston, which details Disney's animation principles.`,
      title: 'Walt Disney: The Creative Visionary',
      complexity: 'moderate' // Multiple books mentioned, biographical content
    };

    return NextResponse.json({
      success: true,
      demo: demoEpisode,
      instructions: {
        multiPass: 'Set enableMultiPass=true to test multi-pass extraction',
        simplePass: 'Set enableMultiPass=false to test simple extraction',
        context: 'Provide testContext to test context preservation',
        endpoint: 'POST to this endpoint with the demo description'
      }
    });
  }

  if (action === 'health') {
    try {
      const geminiClient = getGeminiClient();
      const isHealthy = await geminiClient.testConnection();
      
      return NextResponse.json({
        success: true,
        status: isHealthy ? 'healthy' : 'unhealthy',
        enhancedFeaturesAvailable: {
          multiPassExtraction: true,
          contextPreservation: true,
          enhancedConfidenceScoring: true,
          complexityDetection: true
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Health check failed'
      }, { status: 500 });
    }
  }
  
  return NextResponse.json({
    success: false,
    message: 'GET method supports: ?action=demo (get demo episode) or ?action=health (health check)'
  }, { status: 405 });
} 