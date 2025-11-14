# 📰 AI Current Affairs Digest

## 🌟 Project Overview

**AI Current Affairs Digest** is a sophisticated web application that leverages **artificial intelligence** to deliver personalized news summaries. Built with **Python Flask** and integrated with **NewsAPI** and **OpenRouter's Gemini 2.0 Flash**, the platform solves *information overload* by providing intelligent, concise summaries of global news articles.

### 🎯 Core Value Proposition
- **AI-Powered Summarization**: Get comprehensive summaries of news articles using advanced AI
- **Global Coverage**: Access news from multiple countries and categories
- **Time-Efficient**: Read summarized content instead of full articles
- **User-Friendly**: Clean, dark-themed interface with intuitive controls

---

## ✨ Key Features

### 🌍 Smart News Aggregation
- **Dynamic Filtering**: Select by Country (USA, India, UK, etc.) and Category (Technology, Business, Health, etc.)
- **Real-time Headlines**: Fetch latest 30 headlines from trusted news sources
- **Multiple Time Frames**: Top Headlines, Global Focus, and Deep Dive views

### 🤖 Advanced AI Capabilities
- **Intelligent Summarization**: Generate comprehensive summaries using Gemini 2.0 Flash
- **Multi-strategy Extraction**: Robust content extraction with 5-level fallback system
- **Custom URL Support**: Summarize any news article by pasting the URL
- **Reliable Performance**: Multiple fallback strategies ensure consistent results

### 🎨 Premium User Experience
- **Dark Theme Interface**: High-contrast design (#121212 background) for optimal readability
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Loading Animations**: Smooth visual feedback for all operations
- **Modal Summaries**: Clean popup interface for AI-generated content

---

## 🛠️ Technology Stack

### 🔧 Backend & APIs
| Component | Technology | Purpose |
|-----------|------------|---------|
| **Web Framework** | Python Flask | Server logic and API endpoints |
| **News Data** | NewsAPI.org | Real-time news article data |
| **AI Engine** | OpenRouter + Gemini 2.0 Flash | Advanced text summarization |
| **Web Scraping** | BeautifulSoup4 | Article content extraction |
| **HTTP Requests** | Requests | API communication |

### 🎨 Frontend
| Component | Technology | Purpose |
|-----------|------------|---------|
| **Structure** | HTML5 | Page layout and semantic markup |
| **Styling** | CSS3 with Custom Properties | Dark theme and animations |
| **Interactivity** | Vanilla JavaScript | Dynamic content and API calls |
| **Icons** | Font Awesome 6 | Professional iconography |

---

## ⚙️ Installation & Setup

### 📋 Prerequisites
- Python 3.7 or higher
- pip (Python package manager)
- Modern web browser
- API keys for NewsAPI and OpenRouter

### 🚀 Quick Start

1. **Clone or Download the Project**
   ```bash
   # Ensure you have all project files in one directory
Install Dependencies

bash
pip install flask newsapi-python beautifulsoup4 requests python-dateutil
Configure API Keys

Ensure your NewsAPI key is set in the code

Verify OpenRouter API key is correctly configured

Run the Application

bash
python app.py
Access the Application

text
Open your browser and navigate to:
http://127.0.0.1:5000/
🔧 Configuration
API Keys Setup
The application requires two API keys:

NewsAPI Key

Get from: https://newsapi.org

Used for fetching real-time news articles

OpenRouter API Key

Get from: https://openrouter.ai

Used for AI-powered summarization with Gemini 2.0 Flash

Available Countries
USA (us), India (in), United Kingdom (gb)

Australia (au), Japan (jp), Germany (de), China (cn)

News Categories
General, Business, Technology, Science

Health, Sports, Entertainment

🔄 System Architecture
Backend-Frontend Interaction Flow
text
User Interaction → JavaScript → Flask API → External APIs → Response → UI Update
Detailed Data Flow
User Makes Selection

Chooses country and category from dropdowns

JavaScript captures the selection

API Request Sent

javascript
// Frontend sends request to backend
fetch('/api/news', {
  method: 'POST',
  body: JSON.stringify({ country: 'us', category: 'technology' })
});
Backend Processing

python
# Flask receives request and calls NewsAPI
articles = newsapi.get_top_headlines(
    country=country_code,
    category=category,
    page_size=30
)
AI Summarization (When Requested)

User clicks "AI Summary" button

Backend extracts article content using multiple strategies

Sends content to Gemini 2.0 Flash for summarization

Returns structured summary to frontend

Dynamic UI Update

JavaScript renders news cards without page reload

Modal displays AI-generated summaries

🎨 UI/UX Design
Color Scheme
Background: #121212 (Dark theme for reduced eye strain)

Primary Accent: #00FFFF (Cyan for interactive elements)

Secondary: #FFC300 (Amber for highlights and warnings)

Text: #E8EAF6 (Light gray for optimal readability)

Layout Components
Header: Glitch-effect title with animated background

Control Panel: Country and category selectors with smooth hover effects

News Grid: Responsive card-based layout with hover animations

Summary Modal: Clean popup with loading states and error handling

Interactive Elements
Tab System: Time-based news filtering

Custom URL Panel: Expandable section for pasting article links

Loading Animations: CSS spinners and progress indicators

Hover Effects: Smooth transitions and visual feedback

🔍 Technical Features
Multi-Strategy Content Extraction
The application employs 5 levels of content extraction:

JSON-LD Structured Data (Most reliable)

Article Tag Detection

Content Container Analysis

Smart Paragraph Collection

Meta Description Fallback

Error Handling & Fallbacks
API Failure Recovery: Automatic retry mechanisms

Content Extraction Fallbacks: Multiple strategies ensure content availability

User Feedback: Clear error messages and loading states

Graceful Degradation: Basic summaries when AI fails

Performance Optimizations
Request Limiting: Prevents API overuse

Content Truncation: Manages token limits for AI processing

Caching: Efficient data handling

Responsive Images: Optimized loading

🚀 Usage Guide
Basic News Browsing
Select your preferred country from the dropdown

Choose a news category

Browse through the latest 30 headlines

Click any article to read the full story

AI Summarization
Click the "AI Summary" button on any news card

Wait for the AI to process the article

Read the comprehensive summary in the modal

Access the full article if needed

Custom Article Summarization
Click "Paste Your Own Link" in the control panel

Enter any news article URL

Click "Generate AI Summary"

Get an instant summary of any article

🔒 API Endpoints
POST /api/news
Fetches news articles based on filters

Parameters: country, category, time_frame

Response: JSON array of article objects

POST /api/summarize
Generates AI summary for a given article URL

Parameters: url, title

Response: AI-generated summary text

GET /api/test-key
Tests OpenRouter API key functionality

Response: API status and connectivity information

🐛 Troubleshooting
Common Issues
"No headlines found"

Check your NewsAPI key

Verify internet connection

Try different country/category combinations

Summarization Failures

Verify OpenRouter API key and credits

Check if article is behind paywall

Try a different article URL

Connection Errors

Ensure Flask server is running

Check firewall settings

Verify all dependencies are installed

Debug Mode
The application includes comprehensive console logging:

API request/response tracking

Content extraction progress

Error details and fallback activations

📈 Future Enhancements
Planned Features
User Accounts: Personalized news preferences and history

Multi-language Support: Summaries in different languages

Advanced Filtering: Keyword-based article filtering

Export Options: Save summaries as PDF or text

Mobile App: Native iOS and Android applications

Technical Improvements
Database Integration: For caching and user data

WebSocket Support: Real-time news updates

Advanced NLP: Sentiment analysis and topic modeling

Performance Optimization: Faster content extraction

👥 Contributing
We welcome contributions! Areas for improvement:

Additional news sources

Enhanced content extraction algorithms

UI/UX improvements

Performance optimizations

Documentation updates

📄 License
This project is for educational and demonstration purposes. Please ensure compliance with:

NewsAPI Terms of Service

OpenRouter API Usage Policies

Respective news sources' terms of use

🔗 Resources
NewsAPI Documentation

OpenRouter API Reference

Flask Documentation

Gemini AI Models

💡 Support
For technical support or questions:

Check the troubleshooting section above

Verify all API keys are correctly configured

Ensure all dependencies are properly installed

Check browser console for error messages