from flask import Blueprint, request, jsonify
import requests
import json
import time

# Create Blueprint for chatbot routes
chatbot_bp = Blueprint('chatbot', __name__)

print("=" * 60)
print("🚀 CHATBOT - Rate Limit Aware Version!")
print("=" * 60)

# =============================================================================
# CONFIGURATION
# =============================================================================

OPENROUTER_API_KEY = "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"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "google/gemini-2.0-flash-exp:free"

# =============================================================================
# RATE LIMIT AWARE CHATBOT
# =============================================================================

class RateLimitAwareChatbot:
    def __init__(self):
        self.rate_limit_hit = False
        self.last_api_call = 0
        self.request_count = 0
    
    def get_gemini_response(self, message):
        """Get response with rate limit handling"""
        
        # Check if we recently hit rate limit
        if self.rate_limit_hit:
            current_time = time.time()
            if current_time - self.last_api_call < 3600:  # Wait 1 hour
                return None
        
        try:
            print(f"🤖 API Request #{self.request_count + 1}: '{message}'")
            
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            }
            
            payload = {
                "model": MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": message
                    }
                ],
                "temperature": 0.7,
                "max_tokens": 800,
            }
            
            response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30)
            self.request_count += 1
            self.last_api_call = time.time()
            
            print(f"📥 API Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                if 'choices' in result and len(result['choices']) > 0:
                    content = result['choices'][0]['message']['content']
                    print(f"✅ API Response Success")
                    self.rate_limit_hit = False
                    return content
            
            elif response.status_code == 429:
                print("🚫 RATE LIMIT HIT - Free daily limit exceeded")
                self.rate_limit_hit = True
                error_data = response.json()
                if 'error' in error_data:
                    print(f"📊 Rate Limit Info: {error_data['error']['message']}")
                return None
            else:
                print(f"❌ API Error {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ API Exception: {e}")
            return None
    
    def generate_response(self, message):
        """Generate response with rate limit awareness"""
        if not message or message.strip() == "":
            return "👋 Hello! I'm your AI assistant. What would you like to know? 😊"
        
        message_lower = message.lower().strip()
        
        # Handle basic greetings and help
        if message_lower in ['hello', 'hi', 'hey']:
            status = "🟢 READY" if not self.rate_limit_hit else "🚫 RATE LIMITED"
            return f"""👋 Hello! I'm your AI assistant! ({status})

I can help you with questions, but note: Free API limits may apply.

What would you like to know? 😊"""
        
        if message_lower in ['help', 'what can you do']:
            return """🆘 **How I Can Help:**

I'm an AI assistant powered by Gemini! I can:

• Answer questions on any topic
• Explain concepts and ideas
• Help with learning and research
• Provide information and insights

**Note about API Limits:**
The free tier has daily request limits. If you see rate limit messages, the service will resume after the reset period.

Ask me anything! 🌟"""
        
        if message_lower in ['status', 'limit', 'rate limit']:
            if self.rate_limit_hit:
                return """🚫 **Rate Limit Status**

**Current Status:** Free daily limit exceeded

**What happened:**
You've used all free API requests for today. OpenRouter provides 50 free requests per day for testing.

**Solutions:**
1. **Wait** - Limits reset daily (check OpenRouter dashboard)
2. **Add Credits** - Add $10 for 1000+ requests per day
3. **Use Later** - Try again tomorrow

**To upgrade:**
Visit https://openrouter.ai/ → Account → Billing to add credits."""
            else:
                return f"✅ **Status:** API is available\n📊 Requests today: {self.request_count}"
        
        if message_lower == 'gemini':
            return """🤖 **About Google Gemini**

Google Gemini is Google's advanced AI model family that includes:

**Key Models:**
• **Gemini Pro** - General purpose model
• **Gemini Flash** - Faster, optimized version  
• **Gemini Ultra** - Most capable (not publicly available yet)

**Capabilities:**
• Natural language understanding
• Code generation and explanation
• Image analysis (multimodal)
• Reasoning and problem-solving
• Content creation and summarization

**Access:**
Available through Google AI Studio, Vertex AI, and APIs like OpenRouter.

Gemini competes with other leading AI models like GPT-4 and Claude! 🚀"""
        
        # Try API first
        api_response = self.get_gemini_response(message)
        
        if api_response:
            return api_response
        
        # Rate limit or API failure response
        if self.rate_limit_hit:
            return """🚫 **Rate Limit Exceeded**

I'd love to answer your question, but the free daily API limit has been reached.

**Your options:**
1. **Wait for reset** - Limits refresh every 24 hours
2. **Add credits** - $10 gives 1000+ requests per day
3. **Try basic questions** - Some topics have pre-loaded information

**Quick fix:** Visit https://openrouter.ai/ → Account → Billing

In the meantime, you can ask me about:
• "gemini" - AI model information
• "status" - Current API status
• Or try again later today! 🔧"""
        
        # General API failure
        return """❌ **Temporary Issue**

I'm having trouble connecting to the AI service right now. This could be due to:

• Temporary network issues
• Service maintenance
• API key configuration

**Please try:**
1. Waiting a few minutes and trying again
2. Checking your internet connection
3. Asking about general topics like 'gemini'

The issue should resolve shortly! 🔧"""

# Initialize chatbot
chatbot = RateLimitAwareChatbot()

def generate_chat_response(message, conversation_history=None):
    return chatbot.generate_response(message)

# =============================================================================
# FLASK ROUTES
# =============================================================================

@chatbot_bp.route('/api/chat/send', methods=['POST', 'OPTIONS'])
def chat_send():
    """Main chat endpoint"""
    
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data received'
            }), 400
        
        message = data.get('message', '').strip()
        
        if not message:
            return jsonify({
                'status': 'error',
                'message': 'No message provided'
            }), 400
        
        print(f"💬 User message: '{message}'")
        
        # Generate response
        response = generate_chat_response(message)
        
        return jsonify({
            'status': 'ok',
            'response': response,
            'rate_limited': chatbot.rate_limit_hit
        }), 200
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({
            'status': 'ok',
            'response': "👋 Hello! I'm your AI assistant. What would you like to know? 😊"
        }), 200

@chatbot_bp.route('/api/chat/rate-limit-info', methods=['GET'])
def rate_limit_info():
    """Get rate limit information"""
    return jsonify({
        'status': 'ok',
        'rate_limited': chatbot.rate_limit_hit,
        'request_count': chatbot.request_count,
        'message': 'Free daily limit: 50 requests. Reset every 24 hours.'
    }), 200

print("="*60)
print("🎯 RATE LIMIT AWARE CHATBOT READY!")
print("  - POST /api/chat/send")
print("  - GET  /api/chat/rate-limit-info")
print("="*60)
print("🚫 Currently: RATE LIMITED (free daily limit exceeded)")
print("💡 Solutions: Wait 24h or add $10 credits to OpenRouter")
print("="*60)