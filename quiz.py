from flask import Blueprint, request, jsonify
import requests
from bs4 import BeautifulSoup
import re
import json
import random

# Create Blueprint for quiz routes
quiz_bp = Blueprint('quiz', __name__)

# --- API KEYS & CONFIGURATION ---
OPENROUTER_API_KEY = "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"

print("✅ Quiz Module Loaded!")

# =============================================================================
# QUIZ GENERATOR FUNCTIONS
# =============================================================================

def extract_article_content(url):
    """Extract article content for quiz generation"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove unwanted elements
        for element in soup(["script", "style", "nav", "header", "footer", "aside"]):
            element.decompose()
        
        # Try multiple extraction strategies
        article_text = None
        
        # Strategy 1: Article tag
        article = soup.find('article')
        if article:
            article_text = article.get_text(separator=' ', strip=True)
        
        # Strategy 2: Common content containers
        if not article_text:
            content_selectors = ['main', '.content', '.article-content', '.post-content']
            for selector in content_selectors:
                element = soup.select_one(selector)
                if element:
                    text = element.get_text(separator=' ', strip=True)
                    if len(text.split()) > 100:
                        article_text = text
                        break
        
        # Strategy 3: Paragraphs
        if not article_text:
            paragraphs = soup.find_all('p')
            if len(paragraphs) > 3:
                article_text = ' '.join([p.get_text(strip=True) for p in paragraphs])
        
        if article_text:
            # Clean and limit text
            article_text = re.sub(r'\s+', ' ', article_text).strip()
            words = article_text.split()
            if len(words) > 1000:
                article_text = ' '.join(words[:1000])
            
            return article_text
        
        return None
        
    except Exception as e:
        print(f"❌ Content extraction error: {e}")
        return None

def generate_quiz(content, title):
    """Generate quiz using OpenRouter API with fallback"""
    try:
        prompt = f"""Based on the following article, create exactly 3 multiple-choice questions to test comprehension.

Article Title: {title}
Content: {content[:2000]}

Return ONLY a valid JSON object in this exact format with no additional text:
{{
  "questions": [
    {{
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Brief explanation why this is correct"
    }}
  ]
}}

Rules:
- Create exactly 3 questions
- Each question must have 4 options
- "correct" is the index (0-3) of the correct answer
- Questions should test understanding of key facts from the article
- Make questions clear and unambiguous"""

        url = "https://openrouter.ai/api/v1/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": "google/gemini-2.0-flash-exp:free",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": 800,
        }
        
        print("🤖 Attempting to generate quiz with OpenRouter...")
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if 'choices' in result and result['choices']:
                content = result['choices'][0]['message']['content'].strip()
                
                # Remove markdown code blocks if present
                content = re.sub(r'```json\s*|\s*```', '', content).strip()
                
                # Parse JSON
                quiz_data = json.loads(content)
                
                # Validate structure
                if 'questions' in quiz_data and len(quiz_data['questions']) >= 3:
                    # Ensure we only return 3 questions
                    quiz_data['questions'] = quiz_data['questions'][:3]
                    print("✅ Quiz generated successfully with AI")
                    return quiz_data
        
        print(f"❌ OpenRouter failed: {response.status_code}")
        return generate_fallback_quiz(content, title)
        
    except Exception as e:
        print(f"❌ Quiz generation error: {e}")
        return generate_fallback_quiz(content, title)

def generate_fallback_quiz(content, title):
    """Generate fallback quiz when AI fails"""
    print("🔄 Using fallback quiz generator...")
    
    # Extract key sentences from content
    sentences = [s.strip() for s in re.split(r'[.!?]+', content) if len(s.strip()) > 20]
    
    if len(sentences) < 3:
        return None
    
    questions = []
    
    # Question 1: Main topic
    questions.append({
        "question": f"What is the main topic discussed in this article about '{title}'?",
        "options": [
            "The primary subject matter of the article",
            "Unrelated technical details", 
            "Historical background information",
            "Future predictions and speculation"
        ],
        "correct": 0,
        "explanation": "The question focuses on identifying the core subject discussed in the news article."
    })
    
    # Question 2: Key facts
    questions.append({
        "question": "Which of the following best describes the key information presented?",
        "options": [
            "Factual reporting of recent events or developments",
            "Opinion-based commentary without evidence",
            "Entertainment-focused content",
            "Advertisement or promotional material"
        ],
        "correct": 0,
        "explanation": "News articles typically present factual information about recent events."
    })
    
    # Question 3: Purpose
    questions.append({
        "question": "What is the primary purpose of this news article?",
        "options": [
            "To inform readers about current events",
            "To entertain with fictional stories",
            "To sell products or services",
            "To provide personal opinions only"
        ],
        "correct": 0,
        "explanation": "The main purpose of news articles is to inform readers about current affairs."
    })
    
    return {"questions": questions}

# =============================================================================
# QUIZ ROUTES
# =============================================================================

# --- QUIZ GENERATOR ENDPOINT ---
@quiz_bp.route('/api/quiz/generate', methods=['POST'])
def generate_quiz_endpoint():
    try:
        data = request.get_json()
        url = data.get('url', '').strip()
        
        if not url:
            return jsonify({
                'status': 'error',
                'message': 'No URL provided'
            }), 400
        
        print(f"\n🎯 Quiz generation for: {url}")
        
        # Extract article content
        print("Step 1: Extracting article content...")
        content = extract_article_content(url)
        
        if not content or len(content.split()) < 50:
            return jsonify({
                'status': 'error',
                'message': 'Unable to extract sufficient content from this article'
            }), 400
        
        print(f"✅ Extracted {len(content.split())} words")
        
        # Generate quiz
        print("Step 2: Generating quiz questions...")
        quiz_data = generate_quiz(content, "Current News Article")
        
        if not quiz_data:
            return jsonify({
                'status': 'error',
                'message': 'Failed to generate quiz questions. Please try a different article.'
            }), 500
        
        print(f"✅ Generated {len(quiz_data['questions'])} questions")
        
        return jsonify({
            'status': 'ok',
            'quiz': quiz_data
        })
        
    except Exception as e:
        print(f"❌ Quiz endpoint error: {e}")
        return jsonify({
            'status': 'error',
            'message': 'An unexpected error occurred while generating the quiz.'
        }), 500

# --- QUIZ SUBMISSION ENDPOINT ---
@quiz_bp.route('/api/quiz/submit', methods=['POST'])
def submit_quiz():
    try:
        data = request.get_json()
        answers = data.get('answers', [])
        questions = data.get('questions', [])
        
        if not answers or not questions:
            return jsonify({
                'status': 'error',
                'message': 'Invalid submission data'
            }), 400
        
        results = []
        correct_count = 0
        
        for i, (answer, question) in enumerate(zip(answers, questions)):
            is_correct = answer == question['correct']
            if is_correct:
                correct_count += 1
            
            results.append({
                'question_index': i,
                'user_answer': answer,
                'correct_answer': question['correct'],
                'is_correct': is_correct,
                'explanation': question.get('explanation', '')
            })
        
        score_percentage = (correct_count / len(questions)) * 100
        
        return jsonify({
            'status': 'ok',
            'results': results,
            'score': correct_count,
            'total': len(questions),
            'percentage': round(score_percentage, 1)
        })
        
    except Exception as e:
        print(f"❌ Quiz submission error: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to process quiz submission'
        }), 500