// Enhanced script.js with Chatbot and Quiz functionality

document.addEventListener('DOMContentLoaded', () => {
    // Main elements
    const articlesContainer = document.getElementById('articles-container');
    const tabButtons = document.querySelectorAll('.tab-button');
    const countrySelect = document.getElementById('country-select');
    const categorySelect = document.getElementById('category-select');
    const loadingState = document.getElementById('loading');
    const articleCount = document.getElementById('article-count');
    const currentFilters = document.getElementById('current-filters');

    // Summary modal elements
    const summaryModal = document.getElementById('summary-modal');
    const modalClose = document.getElementById('modal-close');
    const summaryLoading = document.getElementById('summary-loading');
    const summaryContent = document.getElementById('summary-content');

    // Quiz modal elements
    const quizModal = document.getElementById('quiz-modal');
    const quizModalClose = document.getElementById('quiz-modal-close');
    const quizLoading = document.getElementById('quiz-loading');
    const quizContent = document.getElementById('quiz-content');
    const quizResults = document.getElementById('quiz-results');

    // Custom link elements
    const customLinkBtn = document.getElementById('custom-link-btn');
    const customLinkPanel = document.getElementById('custom-link-panel');
    const customUrlInput = document.getElementById('custom-url-input');
    const customSummarizeBtn = document.getElementById('custom-summarize-btn');
    const customQuizBtn = document.getElementById('custom-quiz-btn');

    // Chatbot elements
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotPanel = document.getElementById('chatbot-panel');
    const chatbotClose = document.getElementById('chatbot-close');
    const chatbotClear = document.getElementById('chatbot-clear');
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotSend = document.getElementById('chatbot-send');

    let currentRequest = null;
    let currentQuizData = null;
    let userAnswers = [];

    // ===== Custom Link Panel Toggle =====
    customLinkBtn.addEventListener('click', () => {
        customLinkPanel.classList.toggle('expanded');
        customLinkBtn.classList.toggle('active');
    });

    // ===== Custom Summarization =====
    customSummarizeBtn.addEventListener('click', () => {
        const url = customUrlInput.value.trim();
        if (!url) {
            showNotification('Please enter a valid URL', 'error');
            return;
        }
        if (!isValidURL(url)) {
            showNotification('Please enter a valid URL (e.g., https://example.com)', 'error');
            return;
        }
        openSummaryModal(url, extractTitleFromURL(url));
    });

    // ===== Custom Quiz Generation =====
    customQuizBtn.addEventListener('click', () => {
        const url = customUrlInput.value.trim();
        if (!url) {
            showNotification('Please enter a valid URL', 'error');
            return;
        }
        if (!isValidURL(url)) {
            showNotification('Please enter a valid URL (e.g., https://example.com)', 'error');
            return;
        }
        openQuizModal(url);
    });

    // ===== Quiz Modal Functions =====
    async function openQuizModal(url) {
        quizModal.style.display = 'block';
        quizLoading.style.display = 'block';
        quizContent.style.display = 'none';
        quizResults.style.display = 'none';
        quizContent.innerHTML = '';
        quizResults.innerHTML = '';
        currentQuizData = null;
        userAnswers = [];

        try {
            const response = await fetch('/api/quiz/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            quizLoading.style.display = 'none';

            if (data.status === 'ok' && data.quiz) {
                currentQuizData = data.quiz;
                renderQuiz(data.quiz);
                quizContent.style.display = 'block';
            } else {
                showQuizError(data.message || 'Failed to generate quiz');
            }
        } catch (error) {
            quizLoading.style.display = 'none';
            showQuizError('Network error. Please try again.');
        }
    }

    function renderQuiz(quizData) {
        const questions = quizData.questions;
        userAnswers = new Array(questions.length).fill(null);

        let html = '';

        questions.forEach((q, qIndex) => {
            html += `
                <div class="quiz-question">
                    <h3>Question ${qIndex + 1}: ${q.question}</h3>
                    <div class="quiz-options">
                        ${q.options.map((option, oIndex) => `
                            <div class="quiz-option" data-question="${qIndex}" data-option="${oIndex}">
                                <div class="option-letter">${String.fromCharCode(65 + oIndex)}</div>
                                <span>${option}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        html += `
            <button class="quiz-submit-btn" id="quiz-submit" disabled>
                <i class="fas fa-check-circle"></i> Submit Quiz
            </button>
        `;

        quizContent.innerHTML = html;

        // Add event listeners to options
        document.querySelectorAll('.quiz-option').forEach(option => {
            option.addEventListener('click', handleQuizOptionClick);
        });

        document.getElementById('quiz-submit').addEventListener('click', submitQuiz);
    }

    function handleQuizOptionClick(e) {
        const option = e.currentTarget;
        const questionIndex = parseInt(option.dataset.question);
        const optionIndex = parseInt(option.dataset.option);

        // Remove selection from other options in this question
        document.querySelectorAll(`.quiz-option[data-question="${questionIndex}"]`).forEach(opt => {
            opt.classList.remove('selected');
        });

        // Select this option
        option.classList.add('selected');
        userAnswers[questionIndex] = optionIndex;

        // Enable submit button if all questions answered
        const submitBtn = document.getElementById('quiz-submit');
        if (userAnswers.every(answer => answer !== null)) {
            submitBtn.disabled = false;
        }
    }

    async function submitQuiz() {
        if (!currentQuizData) return;

        try {
            const response = await fetch('/api/quiz/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answers: userAnswers,
                    questions: currentQuizData.questions
                })
            });

            const data = await response.json();

            if (data.status === 'ok') {
                displayQuizResults(data);
            }
        } catch (error) {
            showNotification('Failed to submit quiz', 'error');
        }
    }

    function displayQuizResults(results) {
        // Hide quiz content, show results
        quizContent.style.display = 'none';

        let html = `
            <div class="quiz-score">
                <h3>Your Score</h3>
                <div class="score-percentage">${results.percentage}%</div>
                <p style="color: white; margin-top: 10px; font-size: 1.1em;">
                    ${results.score} out of ${results.total} correct
                </p>
            </div>
        `;

        results.results.forEach((result, index) => {
            const question = currentQuizData.questions[index];
            const isCorrect = result.is_correct;

            html += `
                <div class="quiz-result-item ${isCorrect ? 'correct' : 'incorrect'}">
                    <div class="result-header">
                        <span class="result-icon">${isCorrect ? '✅' : '❌'}</span>
                        <strong>Question ${index + 1}</strong>
                    </div>
                    <p style="margin-bottom: 10px;">${question.question}</p>
                    <p style="color: ${isCorrect ? 'var(--color-success)' : '#ff6b6b'};">
                        Your answer: ${question.options[result.user_answer]}
                    </p>
                    ${!isCorrect ? `
                        <p style="color: var(--color-success); margin-top: 5px;">
                            Correct answer: ${question.options[result.correct_answer]}
                        </p>
                    ` : ''}
                    ${result.explanation ? `
                        <div class="result-explanation">
                            <strong>Explanation:</strong> ${result.explanation}
                        </div>
                    ` : ''}
                </div>
            `;
        });

        html += `
            <button class="quiz-submit-btn" onclick="document.getElementById('quiz-modal').style.display='none'">
                <i class="fas fa-times-circle"></i> Close
            </button>
        `;

        quizResults.innerHTML = html;
        quizResults.style.display = 'block';
    }

    function showQuizError(message) {
        quizContent.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3em; color: #ff6b6b; margin-bottom: 20px;"></i>
                <p style="color: #ff6b6b; font-size: 1.2em;">${message}</p>
            </div>
        `;
        quizContent.style.display = 'block';
    }

    quizModalClose.addEventListener('click', () => {
        quizModal.style.display = 'none';
    });

    // ===== Chatbot Functions =====
    chatbotToggle.addEventListener('click', () => {
        chatbotPanel.classList.toggle('active');
    });

    chatbotClose.addEventListener('click', () => {
        chatbotPanel.classList.remove('active');
    });

    chatbotClear.addEventListener('click', () => {
        if (confirm('Clear conversation history?')) {
            chatbotMessages.innerHTML = `
                <div class="chat-message bot-message">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <p>Conversation cleared! How can I help you?</p>
                    </div>
                </div>
            `;
        }
    });

    chatbotSend.addEventListener('click', sendChatMessage);

    chatbotInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });

    async function sendChatMessage() {
        const message = chatbotInput.value.trim();
        if (!message) return;

        // Add user message to chat
        addChatMessage(message, 'user');
        chatbotInput.value = '';

        // Show typing indicator
        const typingId = addTypingIndicator();

        try {
            console.log('🤖 Sending chat message:', message);

            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    history: getConversationHistory()
                })
            });

            console.log('🤖 Response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('🤖 Response data:', data);

            // Remove typing indicator
            removeTypingIndicator(typingId);

            if (data.status === 'ok') {
                addChatMessage(data.response, 'bot');
            } else {
                addChatMessage('Sorry, I encountered an error. Please try again.', 'bot');
            }
        } catch (error) {
            console.error('🤖 Chat error:', error);
            removeTypingIndicator(typingId);

            // More specific error messages
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                addChatMessage('Connection error. Please check your internet connection.', 'bot');
            } else if (error.message.includes('HTTP error')) {
                addChatMessage('Server error. Please try again later.', 'bot');
            } else {
                addChatMessage('I\'m having trouble responding right now. Please try again.', 'bot');
            }
        }
    }

    function getConversationHistory() {
        const messages = [];
        document.querySelectorAll('.chat-message').forEach(msg => {
            try {
                const isBot = msg.classList.contains('bot-message');
                const contentElement = msg.querySelector('.message-content p');
                if (contentElement) {
                    const content = contentElement.textContent;
                    messages.push({
                        role: isBot ? 'assistant' : 'user',
                        content: content
                    });
                }
            } catch (error) {
                console.warn('Failed to parse chat message:', error);
            }
        });
        return messages.slice(1); // Remove initial welcome message
    }
    
    function addChatMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}-message`;

        const avatar = sender === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';

        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <p>${text}</p>
            </div>
        `;

        chatbotMessages.appendChild(messageDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    function addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message bot-message';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="ai-thinking">
                    <div class="ai-dot"></div>
                    <div class="ai-dot"></div>
                    <div class="ai-dot"></div>
                </div>
            </div>
        `;

        chatbotMessages.appendChild(typingDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        return 'typing-indicator';
    }

    function removeTypingIndicator(id) {
        const indicator = document.getElementById(id);
        if (indicator) {
            indicator.remove();
        }
    }

    // ===== Summary Functions =====
    function openSummaryModal(url, title) {
        if (currentRequest) {
            currentRequest.abort();
        }

        summaryModal.style.display = 'block';
        summaryLoading.style.display = 'block';
        summaryContent.style.display = 'none';
        summaryContent.innerHTML = '';

        fetchAISummary(url, title);
    }

    async function fetchAISummary(url, title) {
        const controller = new AbortController();
        currentRequest = controller;

        try {
            const response = await fetch('/api/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, title }),
                signal: controller.signal
            });

            const data = await response.json();

            summaryLoading.style.display = 'none';
            summaryContent.style.display = 'block';

            if (data.status === 'ok') {
                summaryContent.innerHTML = `
                    <h3 style="color: var(--color-accent); margin-bottom: 15px; font-size: 1.2em;">
                        <i class="fas fa-file-alt"></i> ${title}
                    </h3>
                    <div style="background: rgba(0, 217, 255, 0.05); padding: 20px; border-radius: 10px; border-left: 4px solid var(--color-accent);">
                        <div style="font-size: 1em; line-height: 1.7; white-space: pre-line;">${data.summary}</div>
                    </div>
                    <div style="margin-top: 20px; padding: 15px; background: rgba(255, 215, 0, 0.05); border-radius: 8px;">
                        <p style="color: #ffd700; font-size: 0.9em; margin: 0;">
                            <i class="fas fa-robot"></i> AI Summary • 
                            <a href="${url}" target="_blank" style="color: var(--color-accent); text-decoration: none;">Read Full Article →</a>
                        </p>
                    </div>
                `;
            } else {
                const fallbackText = data.fallback_summary || `Unable to generate summary. Visit: ${url}`;
                summaryContent.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <i class="fas fa-exclamation-circle" style="font-size: 2em; color: #ffd700; margin-bottom: 15px;"></i>
                        <p style="color: #b0b8d4;">${fallbackText}</p>
                    </div>
                `;
            }
        } catch (error) {
            if (error.name === 'AbortError') return;

            summaryLoading.style.display = 'none';
            summaryContent.style.display = 'block';
            summaryContent.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2em; color: #ff6b6b;"></i>
                    <p style="color: #ff6b6b;">Network error. Please try again.</p>
                </div>
            `;
        } finally {
            currentRequest = null;
        }
    }

    modalClose.addEventListener('click', () => {
        if (currentRequest) {
            currentRequest.abort();
            currentRequest = null;
        }
        summaryModal.style.display = 'none';
    });

    // ===== Helper Functions =====
    function isValidURL(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    function extractTitleFromURL(url) {
        try {
            const urlObj = new URL(url);
            return `Article from ${urlObj.hostname.replace('www.', '')}`;
        } catch (_) {
            return 'Custom Article';
        }
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff6b6b' : '#4ecdc4'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease;
        `;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${message}
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // ===== News Functions =====
    function createArticleCard(article) {
        const card = document.createElement('div');
        card.classList.add('news-card');

        card.innerHTML = `
            <a href="${article.url}" target="_blank" style="text-decoration: none; color: inherit; flex: 1; display: flex; flex-direction: column;">
                <div class="card-image-wrapper">
                    <img src="${article.image || ''}" alt="Article Image" onerror="this.style.display='none'; this.parentNode.classList.add('no-image');">
                </div>
                <div class="card-content">
                    <h4 class="card-title">${article.title}</h4>
                    <p class="card-description">${article.description}</p>
                    <div class="card-footer">
                        <span><i class="fas fa-newspaper"></i> ${article.source}</span>
                        <span><i class="fas fa-calendar-alt"></i> ${article.published}</span>
                    </div>
                </div>
            </a>
            <div class="card-actions">
                <button class="ai-summary-btn" data-url="${article.url}" data-title="${article.title.replace(/"/g, '&quot;')}">
                    <i class="fas fa-robot"></i> AI Summary
                </button>
            </div>
        `;

        card.querySelector('.ai-summary-btn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openSummaryModal(article.url, article.title);
        });

        return card;
    }

    async function fetchAndRenderNews() {
        const timeFrame = document.querySelector('.tab-button.active').getAttribute('data-time');
        const countryCode = countrySelect.value;
        const category = categorySelect.value;

        articlesContainer.innerHTML = '';
        loadingState.style.display = 'flex';

        try {
            const response = await fetch('/api/news', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    time_frame: timeFrame,
                    country: countryCode,
                    category: category
                })
            });

            const data = await response.json();
            loadingState.style.display = 'none';

            if (data.status === 'ok' && data.articles && data.articles.length > 0) {
                articleCount.textContent = `Showing ${data.count} articles`;
                currentFilters.textContent = `${data.filters.category} • ${data.filters.country}`;

                data.articles.forEach((article, index) => {
                    const card = createArticleCard(article);
                    card.style.animation = `fadeIn 0.5s ease forwards ${index * 0.05}s`;
                    card.style.opacity = '0';
                    articlesContainer.appendChild(card);
                });
            } else {
                currentFilters.textContent = `${category.toUpperCase()} in ${countryCode.toUpperCase()}`;
                articlesContainer.innerHTML = '<p class="error-message"><i class="fas fa-exclamation-triangle"></i> No headlines found.</p>';
            }
        } catch (error) {
            loadingState.style.display = 'none';
            articlesContainer.innerHTML = '<p class="error-message"><i class="fas fa-plug"></i> Connection failed.</p>';
        }
    }

    // ===== Event Listeners =====
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            fetchAndRenderNews();
        });
    });

    countrySelect.addEventListener('change', fetchAndRenderNews);
    categorySelect.addEventListener('change', fetchAndRenderNews);

    customUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            customSummarizeBtn.click();
        }
    });

    window.addEventListener('click', (e) => {
        if (e.target === summaryModal) {
            if (currentRequest) {
                currentRequest.abort();
                currentRequest = null;
            }
            summaryModal.style.display = 'none';
        }
        if (e.target === quizModal) {
            quizModal.style.display = 'none';
        }
    });

    // ===== Initial Load =====
    fetchAndRenderNews();
});

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);