import { NextRequest, NextResponse } from 'next/server';
import { testGeminiConnection, generateContent } from '@/lib/gemini-client';
import { validateConfig } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    // Validate configuration
    const configErrors = validateConfig();
    if (configErrors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Configuration errors', 
          details: configErrors 
        },
        { status: 500 }
      );
    }

    // Test basic connectivity
    const isConnected = await testGeminiConnection();
    
    if (!isConnected) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to connect to Gemini API' 
        },
        { status: 500 }
      );
    }

    // Test content generation
    const testPrompt = 'Explain how AI works in a few words';
    const response = await generateContent(testPrompt, {
      maxTokens: 100,
      temperature: 0.7
    });

    return NextResponse.json({
      success: true,
      message: 'LLM connectivity test successful',
      test: {
        prompt: testPrompt,
        response: response,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('LLM test error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'LLM test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, options } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const response = await generateContent(prompt, options || {});

    return NextResponse.json({
      success: true,
      prompt,
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LLM generation error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Content generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 