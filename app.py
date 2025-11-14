from flask import Flask, request, jsonify, render_template
from newsapi import NewsApiClient
from datetime import datetime, timedelta
import requests
from bs4 import BeautifulSoup
import time
import re

# --- API KEYS & CONFIGURATION ---
NEWS_API_KEY = "ENTER_YOUR_API" 
OPENROUTER_API_KEY = "ENTER_YOUR_API"

newsapi = NewsApiClient(api_key=NEWS_API_KEY)

# Define available filters for the UI
COUNTRIES = {
    'us': 'USA', 'in': 'India', 'gb': 'UK', 'au': 'Australia', 
    'jp': 'Japan', 'de': 'Germany', 'cn': 'China'
}
CATEGORIES = ['General', 'Business', 'Technology', 'Science', 'Health', 'Sports', 'Entertainment']

# Initialize Flask App
app = Flask(__name__)

print("✅ Enhanced News Aggregator with Robust Summarization")

def extract_article_text_robust(url):
    """Enhanced article extraction with multiple fallback strategies."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove unwanted elements more aggressively
        for element in soup(["script", "style", "nav", "header", "footer", "aside", 
                           "iframe", "noscript", "button", "form", "input", "select"]):
            element.decompose()
        
        # Remove elements with common non-content classes
        non_content_selectors = [
            '.ad', '.ads', '.advertisement', '.social', '.share', '.comments',
            '.newsletter', '.popup', '.modal', '.menu', '.sidebar', '.breadcrumb',
            '.pagination', '.related', '.recommended', '.trending'
        ]
        for selector in non_content_selectors:
            for element in soup.select(selector):
                element.decompose()
        
        article_text = None
        extraction_method = "unknown"
        
        # Strategy 1: Look for JSON-LD structured data (most reliable)
        json_ld = soup.find('script', type='application/ld+json')
        if json_ld:
            try:
                import json
                data = json.loads(json_ld.string)
                if isinstance(data, dict) and 'articleBody' in data:
                    article_text = data['articleBody']
                    extraction_method = "json_ld"
                    print("✅ Extracted via JSON-LD")
            except:
                pass
        
        # Strategy 2: Article tag with content scoring
        if not article_text:
            articles = soup.find_all('article')
            for article in articles:
                text = article.get_text(separator=' ', strip=True)
                word_count = len(text.split())
                if word_count > 100:  # Only consider substantial articles
                    article_text = text
                    extraction_method = "article_tag"
                    print("✅ Extracted via article tag")
                    break
        
        # Strategy 3: Common content containers with scoring
        if not article_text:
            content_selectors = [
                'main', '[role="main"]', '.content', '.post-content', 
                '.article-content', '.entry-content', '.story-content',
                '.post-body', '.article-body', '.story-body', '.content-body',
                '[itemprop="articleBody"]', '.article__body', '.article-text'
            ]
            
            best_text = ""
            best_score = 0
            
            for selector in content_selectors:
                elements = soup.select(selector)
                for element in elements:
                    text = element.get_text(separator=' ', strip=True)
                    words = text.split()
                    word_count = len(words)
                    
                    # Score based on word count and paragraph structure
                    paragraphs = len(element.find_all('p', recursive=False))
                    score = word_count + (paragraphs * 10)
                    
                    if score > best_score and word_count > 50:
                        best_score = score
                        best_text = text
            
            if best_text:
                article_text = best_text
                extraction_method = f"content_container (score: {best_score})"
                print(f"✅ Extracted via content container")
        
        # Strategy 4: Smart paragraph collection (fallback)
        if not article_text:
            all_paragraphs = soup.find_all('p')
            if len(all_paragraphs) > 3:
                # Filter paragraphs by length and content quality
                good_paragraphs = []
                for p in all_paragraphs:
                    text = p.get_text(strip=True)
                    words = text.split()
                    if len(words) > 15 and len(words) < 200:  # Reasonable paragraph length
                        # Avoid navigation, links, etc.
                        if not any(word in text.lower() for word in ['login', 'sign up', 'subscribe', 'read more', 'click here']):
                            good_paragraphs.append(text)
                
                if len(good_paragraphs) >= 3:
                    article_text = ' '.join(good_paragraphs)
                    extraction_method = "smart_paragraphs"
                    print(f"✅ Extracted via {len(good_paragraphs)} smart paragraphs")
        
        # Strategy 5: Meta description as last resort
        if not article_text:
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc and meta_desc.get('content'):
                article_text = meta_desc.get('content')
                extraction_method = "meta_description"
                print("✅ Extracted via meta description")
        
        # Clean and normalize the extracted text
        if article_text:
            # Remove extra whitespace
            article_text = re.sub(r'\s+', ' ', article_text).strip()
            
            # Remove very short lines that are likely noise
            lines = article_text.split('. ')
            cleaned_lines = [line.strip() for line in lines if len(line.strip()) > 20]
            article_text = '. '.join(cleaned_lines)
            
            # Limit length for API constraints
            words = article_text.split()
            if len(words) > 1500:
                article_text = ' '.join(words[:1500])
                print(f"📝 Trimmed to 1500 words")
            
            word_count = len(words)
            print(f"📊 Extraction: {extraction_method}, Words: {word_count}")
            
            if word_count >= 30:
                return article_text
        
        print("❌ No sufficient text extracted")
        return None
        
    except Exception as e:
        print(f"❌ Extraction error: {e}")
        return None

def generate_reliable_summary(text, title, url):
    """Generate summary with multiple fallback strategies."""
    
    # Fallback 1: Use OpenRouter with simple prompt
    summary = try_openrouter_summary(text, title)
    if summary:
        return summary
    
    # Fallback 2: If OpenRouter fails, create a basic summary from extracted text
    return create_basic_summary(text, title, url)

def try_openrouter_summary(text, title):
    """Try to get summary from OpenRouter with simple reliable prompt."""
    try:
        # Very simple prompt for reliability
        prompt = f"""Summarize this news article in 3-4 sentences. Focus on the main facts.

Title: {title}

Content: {text[:2500]}

Summary:"""
        
        url = "https://openrouter.ai/api/v1/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": "google/gemini-2.0-flash-exp:free",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 300,
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if 'choices' in result and result['choices']:
                summary = result['choices'][0]['message']['content'].strip()
                if len(summary.split()) >= 15:  # Ensure substantial summary
                    print("✅ OpenRouter summary successful")
                    return summary
        
        print(f"❌ OpenRouter failed: {response.status_code}")
        return None
        
    except Exception as e:
        print(f"❌ OpenRouter error: {e}")
        return None

def create_basic_summary(text, title, url):
    """Create a basic summary when AI fails."""
    try:
        # Extract first few sentences as fallback
        sentences = re.split(r'[.!?]+', text)
        meaningful_sentences = [s.strip() for s in sentences if len(s.strip()) > 30]
        
        if len(meaningful_sentences) >= 2:
            summary = '. '.join(meaningful_sentences[:3]) + '.'
            print("✅ Using extracted sentences as summary")
        else:
            summary = f"This article titled '{title}' discusses current news events. For the full details, please visit the original source."
            print("✅ Using generic summary")
        
        return summary + f"\n\n[Source: {url}]"
        
    except:
        return f"Summary unavailable for this article. Please visit the source for full content: {url}"

# --- NEWS API ENDPOINT (unchanged) ---
@app.route('/api/news', methods=['POST'])
def fetch_news_api():
    try:
        data = request.get_json()
        country_code = data.get('country', 'us').lower()
        category = data.get('category', 'general').lower() 
        
        top_headlines = newsapi.get_top_headlines(
            category=category,
            country=country_code,
            language='en',
            page_size=20,
        )

        articles = []
        for article in top_headlines.get('articles', []):
            published_at = article.get('publishedAt', '')
            
            try:
                published_date_fmt = datetime.strptime(published_at[:10], '%Y-%m-%d').strftime('%b %d, %Y')
            except ValueError:
                published_date_fmt = "Recent"
            
            raw_description = article.get('description')
            if raw_description:
                processed_description = raw_description.split('.')[0].strip() + '...'
            else:
                processed_description = 'Click to read the full article.'

            articles.append({
                'title': article.get('title', 'No Title'),
                'source': article.get('source', {}).get('name', 'Unknown'),
                'description': processed_description,
                'url': article.get('url'),
                'image': article.get('urlToImage'),
                'published': published_date_fmt
            })
        
        if not articles:
            return jsonify({
                'status': 'ok', 
                'articles': [], 
                'count': 0, 
                'message': 'No headlines found for these filters.'
            })

        return jsonify({
            'status': 'ok',
            'articles': articles,
            'count': len(articles),
            'filters': {'country': country_code.upper(), 'category': category.title()}
        })

    except Exception as e:
        print(f"Error fetching NewsAPI: {e}")
        return jsonify({
            'status': 'error', 
            'message': f'API connection failed: {str(e)}'
        }), 500

# --- ENHANCED SUMMARIZATION ENDPOINT ---
@app.route('/api/summarize', methods=['POST'])
def summarize_article():
    try:
        data = request.get_json()
        url = data.get('url')
        title = data.get('title', 'Article')
        
        print(f"\n🎯 Summarization request: {title}")
        print(f"🔗 URL: {url}")
        
        if not url:
            return jsonify({
                'status': 'error',
                'message': 'No URL provided'
            }), 400
        
        # Enhanced text extraction
        print("Step 1: Robust text extraction...")
        article_text = extract_article_text_robust(url)
        
        if not article_text:
            print("❌ Text extraction failed")
            return jsonify({
                'status': 'error',
                'message': 'Unable to extract content from this article. It may require authentication or have access restrictions.',
                'fallback_summary': f"Unable to generate AI summary for this article. Please visit the source to read: {url}"
            })
        
        print(f"✅ Extraction successful: {len(article_text.split())} words")
        
        # Generate reliable summary with fallbacks
        print("Step 2: Generating summary with fallbacks...")
        summary = generate_reliable_summary(article_text, title, url)
        
        print(f"✅ Summary generated: {len(summary.split())} words")
        
        return jsonify({
            'status': 'ok',
            'summary': summary,
            'title': title,
            'word_count': len(summary.split())
        })
    
    except Exception as e:
        print(f"❌ Summarization error: {e}")
        return jsonify({
            'status': 'error',
            'message': 'An unexpected error occurred.',
            'fallback_summary': f"Technical issue. Please visit the source: {url}"
        }), 500

# --- TEST ENDPOINT ---
@app.route('/api/test-key', methods=['GET'])
def test_api_key():
    try:
        url = "https://openrouter.ai/api/v1/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": "google/gemini-2.0-flash-exp:free",
            "messages": [{"role": "user", "content": "Say hello in one word"}],
            "max_tokens": 10
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 200:
            return jsonify({'status': 'ok', 'message': 'API key is working!'})
        else:
            return jsonify({
                'status': 'error', 
                'message': f'API returned status {response.status_code}'
            }), 400
            
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/')
def index():
    return render_template('index.html', countries=COUNTRIES, categories=CATEGORIES)

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 Starting Enhanced News Aggregator")
    print("📰 Multiple extraction strategies + Fallback summaries")
    print("="*60 + "\n")
    app.run(debug=True, threaded=True, port=5000)