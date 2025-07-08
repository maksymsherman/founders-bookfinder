#!/bin/bash

echo "🚀 Setting up environment variables for Founders Book Finder"
echo ""

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Do you want to overwrite it? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

# Copy template to .env.local
cp env.template .env.local

echo "✅ Created .env.local from template"
echo ""
echo "📝 Next steps:"
echo "1. Get your Google Gemini API key from: https://aistudio.google.com/"
echo "2. Edit .env.local and replace 'your_gemini_api_key_here' with your actual API key"
echo "3. (Optional) Get Google Books API key from: https://console.cloud.google.com/"
echo "4. Start the development server: npm run dev"
echo ""
echo "🔑 Example .env.local content:"
echo "GOOGLE_GEMINI_API_KEY=AIzaSyC..."
echo ""
echo "💡 The .env.local file is already in .gitignore, so your API keys won't be committed to git." 