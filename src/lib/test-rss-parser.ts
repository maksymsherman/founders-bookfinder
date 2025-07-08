/**
 * Test utility for RSS Parser
 * Run this to verify RSS parsing functionality
 */

import { RssParser, parseFoundersRssFeed, RssParserError } from './rss-parser';
import { Episode } from '@/types';

export interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

export class RssParserTester {
  
  /**
   * Run all RSS parser tests
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting RSS Parser Tests...\n');

    const tests = [
      this.testBasicRssParsing.bind(this),
      this.testFoundersRssFeed.bind(this),
      this.testErrorHandling.bind(this),
      this.testDataValidation.bind(this),
      this.testUrlValidation.bind(this),
    ];

    const results: TestResult[] = [];

    for (const test of tests) {
      try {
        const result = await test();
        results.push(result);
        console.log(`${result.success ? '✅' : '❌'} ${result.message}`);
        if (!result.success && result.error) {
          console.log(`   Error: ${result.error}`);
        }
        console.log('');
      } catch (error) {
        const errorResult: TestResult = {
          success: false,
          message: `Test failed with exception: ${test.name}`,
          error: error instanceof Error ? error.message : String(error),
        };
        results.push(errorResult);
        console.log(`❌ ${errorResult.message}`);
        console.log(`   Error: ${errorResult.error}`);
        console.log('');
      }
    }

    // Summary
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    console.log(`📊 Test Summary: ${passed}/${total} tests passed`);

    return results;
  }

  /**
   * Test basic RSS parsing functionality
   */
  async testBasicRssParsing(): Promise<TestResult> {
    try {
      const parser = new RssParser();
      
      // This will test with the actual Founders feed
      const result = await parser.parseRssFeed();
      
      if (!result.episodes || result.episodes.length === 0) {
        return {
          success: false,
          message: 'Basic RSS parsing - No episodes found',
          error: 'Episodes array is empty',
        };
      }

      if (!result.lastUpdated || !result.totalCount) {
        return {
          success: false,
          message: 'Basic RSS parsing - Missing metadata',
          error: 'lastUpdated or totalCount missing',
        };
      }

      return {
        success: true,
        message: `Basic RSS parsing - Found ${result.totalCount} episodes`,
        data: {
          episodeCount: result.totalCount,
          firstEpisode: result.episodes[0]?.title,
          lastUpdated: result.lastUpdated,
        },
      };

    } catch (error) {
      return {
        success: false,
        message: 'Basic RSS parsing - Failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test the convenience function for Founders RSS feed
   */
  async testFoundersRssFeed(): Promise<TestResult> {
    try {
      const result = await parseFoundersRssFeed();
      
      // Validate that we got episodes
      if (!result.episodes || result.episodes.length === 0) {
        return {
          success: false,
          message: 'Founders RSS feed - No episodes found',
          error: 'No episodes returned from feed',
        };
      }

      // Check first episode structure
      const firstEpisode = result.episodes[0];
      const requiredFields = ['id', 'title', 'description', 'pubDate', 'link', 'guid'];
      const missingFields = requiredFields.filter(field => !firstEpisode[field as keyof Episode]);

      if (missingFields.length > 0) {
        return {
          success: false,
          message: 'Founders RSS feed - Invalid episode structure',
          error: `Missing fields: ${missingFields.join(', ')}`,
        };
      }

      return {
        success: true,
        message: `Founders RSS feed - Successfully parsed ${result.totalCount} episodes`,
        data: {
          totalCount: result.totalCount,
          sampleEpisode: {
            title: firstEpisode.title,
            pubDate: firstEpisode.pubDate,
            hasDescription: firstEpisode.description.length > 0,
          },
        },
      };

    } catch (error) {
      return {
        success: false,
        message: 'Founders RSS feed - Failed to parse',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test error handling with invalid URLs
   */
  async testErrorHandling(): Promise<TestResult> {
    const testCases = [
      {
        url: 'https://invalid-url-that-does-not-exist.com/rss',
        expectedErrorCode: 'NETWORK_ERROR',
        description: 'Invalid URL',
      },
      {
        url: 'not-a-url',
        expectedErrorCode: 'INVALID_URL',
        description: 'Malformed URL',
      },
    ];

    let passedTests = 0;
    const errors: string[] = [];

    for (const testCase of testCases) {
      try {
        if (testCase.expectedErrorCode === 'INVALID_URL') {
          // Test URL validation
          const isValid = RssParser.isValidRssUrl(testCase.url);
          if (!isValid) {
            passedTests++;
          } else {
            errors.push(`${testCase.description}: URL validation should have failed`);
          }
        } else {
          // Test actual parsing with invalid URL
          const parser = new RssParser(testCase.url);
          await parser.parseRssFeed();
          
          // If we get here, the test failed (should have thrown)
          errors.push(`${testCase.description}: Should have thrown ${testCase.expectedErrorCode}`);
        }
      } catch (error) {
        if (error instanceof RssParserError && error.code === testCase.expectedErrorCode) {
          passedTests++;
        } else {
          errors.push(`${testCase.description}: Got ${error instanceof RssParserError ? error.code : 'unexpected error'}, expected ${testCase.expectedErrorCode}`);
        }
      }
    }

    return {
      success: passedTests === testCases.length,
      message: `Error handling - ${passedTests}/${testCases.length} tests passed`,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  /**
   * Test data validation and sanitization
   */
  async testDataValidation(): Promise<TestResult> {
    try {
      const result = await parseFoundersRssFeed();
      
      if (!result.episodes.length) {
        return {
          success: false,
          message: 'Data validation - No episodes to validate',
          error: 'Empty episodes array',
        };
      }

      const issues: string[] = [];
      let validEpisodes = 0;

      for (const episode of result.episodes.slice(0, 5)) { // Check first 5 episodes
        // Check for required fields
        if (!episode.id || !episode.title || !episode.description) {
          issues.push(`Episode missing required fields: ${episode.title || 'Unknown'}`);
          continue;
        }

        // Check date format
        try {
          const date = new Date(episode.pubDate);
          if (isNaN(date.getTime())) {
            issues.push(`Invalid date format: ${episode.pubDate}`);
            continue;
          }
        } catch {
          issues.push(`Date parsing failed: ${episode.pubDate}`);
          continue;
        }

        // Check for HTML in cleaned text
        if (episode.title.includes('<') || episode.description.includes('<')) {
          issues.push(`HTML tags not cleaned: ${episode.title}`);
          continue;
        }

        validEpisodes++;
      }

      return {
        success: issues.length === 0,
        message: `Data validation - ${validEpisodes}/${Math.min(5, result.episodes.length)} episodes valid`,
        error: issues.length > 0 ? issues.join('; ') : undefined,
      };

    } catch (error) {
      return {
        success: false,
        message: 'Data validation - Failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test URL validation utility
   */
  async testUrlValidation(): Promise<TestResult> {
    const validUrls = [
      'https://feeds.megaphone.fm/founders',
      'http://example.com/rss.xml',
      'https://example.com/feed',
    ];

    const invalidUrls = [
      'not-a-url',
      'ftp://example.com/feed',
      '',
      'javascript:alert(1)',
    ];

    let passed = 0;
    let total = validUrls.length + invalidUrls.length;

    // Test valid URLs
    for (const url of validUrls) {
      if (RssParser.isValidRssUrl(url)) {
        passed++;
      }
    }

    // Test invalid URLs
    for (const url of invalidUrls) {
      if (!RssParser.isValidRssUrl(url)) {
        passed++;
      }
    }

    return {
      success: passed === total,
      message: `URL validation - ${passed}/${total} tests passed`,
      data: { validUrls, invalidUrls },
    };
  }
}

/**
 * Convenience function to run tests
 */
export const runRssParserTests = async (): Promise<TestResult[]> => {
  const tester = new RssParserTester();
  return await tester.runAllTests();
};

/**
 * Quick test function for development
 */
export const quickTest = async (): Promise<void> => {
  console.log('🚀 Quick RSS Parser Test\n');
  
  try {
    const result = await parseFoundersRssFeed();
    console.log(`✅ Successfully parsed ${result.totalCount} episodes`);
    console.log(`📅 Last updated: ${result.lastUpdated}`);
    
    if (result.episodes.length > 0) {
      const latest = result.episodes[0];
      console.log(`📻 Latest episode: "${latest.title}"`);
      console.log(`🗓️  Published: ${new Date(latest.pubDate).toLocaleDateString()}`);
      console.log(`📝 Description length: ${latest.description.length} characters`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}; 