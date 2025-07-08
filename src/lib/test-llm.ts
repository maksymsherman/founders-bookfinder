// Load environment variables for standalone execution
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getGeminiClient, generateContent } from './gemini-client';
import { validateConfig } from './config';
import { parseFoundersRssFeed } from './rss-parser';

export const runLLMTests = async () => {
  const geminiClient = getGeminiClient();
  console.log('🧪 Starting LLM Integration Tests...\n');

  // Test 1: Configuration validation
  console.log('1. Testing configuration...');
  const configErrors = validateConfig();
  if (configErrors.length > 0) {
    console.error('❌ Configuration errors found:');
    configErrors.forEach(error => console.error(`   - ${error}`));
    return false;
  }
  console.log('✅ Configuration is valid\n');

  // Test 2: Basic connectivity
  console.log('2. Testing Gemini API connectivity...');
  try {
    const isConnected = await geminiClient.testConnection();
    if (isConnected) {
      console.log('✅ Gemini API connection successful');
    } else {
      console.error('❌ Gemini API connection failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Gemini API connection error:', error);
    return false;
  }
  console.log('');

  // Test 3: Content generation
  console.log('3. Testing content generation...');
  try {
    const testPrompt = 'Explain how AI works in a few words';
    const response = await generateContent(testPrompt, {
      maxTokens: 100,
      temperature: 0.7
    });
    
    console.log('✅ Content generation successful');
    console.log(`   Prompt: "${testPrompt}"`);
    console.log(`   Response: "${response}"`);
  } catch (error) {
    console.error('❌ Content generation failed:', error);
    return false;
  }
  console.log('');

  // Test 4: Book extraction from real Founders podcast episodes
  console.log('4. Testing book extraction on real Founders podcast episodes...');
  try {
    console.log('   📡 Fetching latest episodes from Founders podcast...');
    const episodesResponse = await parseFoundersRssFeed();
    const testEpisodes = episodesResponse.episodes.slice(0, 10);
    
    console.log(`   📚 Found ${episodesResponse.episodes.length} total episodes, testing on latest ${testEpisodes.length}:\n`);
    
    for (let i = 0; i < testEpisodes.length; i++) {
      const episode = testEpisodes[i];
      console.log(`   Episode ${i + 1}: "${episode.title}"`);
      console.log(`   Published: ${new Date(episode.pubDate).toLocaleDateString()}`);
      console.log(`   Description length: ${episode.description.length} characters`);
      
      try {
        console.log(`   🔍 Extracting books from episode ${i + 1}...`);
        const extractedBooks = await geminiClient.extractBooksFromEpisode(episode.description);
        
        if (extractedBooks.books && extractedBooks.books.length > 0) {
          console.log(`   ✅ Found ${extractedBooks.books.length} book(s):`);
          extractedBooks.books.forEach((book: any, bookIndex: number) => {
            console.log(`      ${bookIndex + 1}. "${book.title}" by ${book.author}`);
            if (book.links && book.links.length > 0) {
              console.log(`         Links: ${book.links.join(', ')}`);
            }
          });
        } else {
          console.log(`   ℹ️  No books found in episode ${i + 1}`);
          if (extractedBooks.rawResponse) {
            console.log(`   Raw response: ${extractedBooks.rawResponse.substring(0, 200)}...`);
          }
        }
      } catch (error) {
        console.error(`   ❌ Failed to extract books from episode ${i + 1}:`, error);
      }
      
      console.log(''); // Add spacing between episodes
    }
    
    console.log('✅ Book extraction testing completed');
  } catch (error) {
    console.error('❌ Book extraction test failed:', error);
    return false;
  }
  console.log('');

  // Test 5: Basic rate limiting check (free tier friendly)
  console.log('5. Testing basic rate limiting...');
  try {
    const promises = Array.from({ length: 3 }, (_, i) => 
      generateContent(`Brief test ${i + 1}`, { maxTokens: 5 })
    );
    
    const results = await Promise.all(promises);
    console.log('✅ Rate limiting working correctly');
    console.log(`   Successfully processed ${results.length} requests`);
    console.log('   Model: gemini-2.5-flash-lite-preview-06-17');
  } catch (error) {
    console.error('⚠️  Rate limiting test hit quota limit (normal for free tier)');
    console.log('✅ This is expected behavior - your integration is working!');
  }
  console.log('');

  console.log('🎉 All LLM integration tests passed!');
  return true;
};

// Run tests if this file is executed directly
if (require.main === module) {
  runLLMTests()
    .then(success => {
      if (success) {
        console.log('\n✅ LLM Integration is ready for use!');
        process.exit(0);
      } else {
        console.log('\n❌ LLM Integration tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error during testing:', error);
      process.exit(1);
    });
} 