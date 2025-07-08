'use client';

import { useState } from 'react';
import { LLMTestResponse } from '@/types';

const TestLLMPage = () => {
  const [testResult, setTestResult] = useState<LLMTestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('Explain how AI works in a few words');
  const [customResponse, setCustomResponse] = useState<LLMTestResponse | null>(null);

  const handleTestConnection = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/test-llm');
      const data: LLMTestResponse = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Failed to test connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomPrompt = async () => {
    setIsLoading(true);
    setCustomResponse(null);
    
    try {
      const response = await fetch('/api/test-llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: customPrompt,
          options: {
            maxTokens: 200,
            temperature: 0.7
          }
        }),
      });
      const data: LLMTestResponse = await response.json();
      setCustomResponse(data);
    } catch (error) {
      setCustomResponse({
        success: false,
        error: 'Failed to generate content',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            LLM Integration Test
          </h1>
          
          <div className="space-y-6">
            {/* Basic Connection Test */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Basic Connection Test
              </h2>
              
              <button
                onClick={handleTestConnection}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isLoading ? 'Testing...' : 'Test Connection'}
              </button>
              
              {testResult && (
                <div className="mt-4 p-4 rounded-lg border">
                  <div className={`font-medium ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {testResult.success ? '✅ Success' : '❌ Failed'}
                  </div>
                  
                  {testResult.message && (
                    <p className="text-gray-700 mt-2">{testResult.message}</p>
                  )}
                  
                  {testResult.error && (
                    <p className="text-red-600 mt-2">{testResult.error}</p>
                  )}
                  
                  {testResult.test && (
                    <div className="mt-4 space-y-2">
                      <div>
                        <span className="font-medium text-gray-700">Prompt:</span>
                        <p className="text-gray-600 ml-2">{testResult.test.prompt}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Response:</span>
                        <p className="text-gray-600 ml-2">{testResult.test.response}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Timestamp:</span>
                        <p className="text-gray-600 ml-2">{testResult.test.timestamp}</p>
                      </div>
                    </div>
                  )}
                  
                  {testResult.details && (
                    <div className="mt-4">
                      <span className="font-medium text-gray-700">Details:</span>
                      <pre className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(testResult.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Custom Prompt Test */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Custom Prompt Test
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="customPrompt" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter your prompt:
                  </label>
                  <textarea
                    id="customPrompt"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Enter your prompt here..."
                  />
                </div>
                
                <button
                  onClick={handleCustomPrompt}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {isLoading ? 'Generating...' : 'Generate Response'}
                </button>
                
                {customResponse && (
                  <div className="mt-4 p-4 rounded-lg border">
                    <div className={`font-medium ${customResponse.success ? 'text-green-600' : 'text-red-600'}`}>
                      {customResponse.success ? '✅ Success' : '❌ Failed'}
                    </div>
                    
                    {customResponse.error && (
                      <p className="text-red-600 mt-2">{customResponse.error}</p>
                    )}
                    
                    {customResponse.response && (
                      <div className="mt-4">
                        <span className="font-medium text-gray-700">Response:</span>
                        <p className="text-gray-600 mt-2 bg-gray-50 p-3 rounded">
                          {customResponse.response}
                        </p>
                      </div>
                    )}
                    
                    {customResponse.details && (
                      <div className="mt-4">
                        <span className="font-medium text-gray-700">Details:</span>
                        <pre className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(customResponse.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Model Information */}
            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Model Information
              </h3>
              <div className="text-green-700 space-y-1 text-sm">
                <p><strong>Model:</strong> Gemini 2.5 Flash Lite Preview (06-17)</p>
                <p><strong>Rate Limit:</strong> 4,000 requests per minute</p>
                <p><strong>Pricing:</strong> $0.10/1M input tokens, $0.40/1M output tokens</p>
                <p><strong>Best for:</strong> Large scale processing, data transformation, summarization</p>
                <p><strong>Knowledge cutoff:</strong> January 2025</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                Instructions
              </h3>
              <ul className="text-blue-700 space-y-1 text-sm">
                <li>• First, test the basic connection to verify your API key is working</li>
                <li>• Then try the custom prompt to test content generation</li>
                <li>• Make sure your <code className="bg-blue-100 px-1 rounded">GOOGLE_GEMINI_API_KEY</code> is set in your <code className="bg-blue-100 px-1 rounded">.env.local</code> file</li>
                <li>• Check the browser console for any additional error details</li>
                <li>• This model supports high-volume processing with 4,000 RPM rate limit</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestLLMPage; 