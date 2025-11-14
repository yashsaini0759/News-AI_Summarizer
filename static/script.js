// Enhanced script.js with better fallback handling

document.addEventListener('DOMContentLoaded', () => {
    const articlesContainer = document.getElementById('articles-container');
    const tabButtons = document.querySelectorAll('.tab-button');
    const countrySelect = document.getElementById('country-select');
    const categorySelect = document.getElementById('category-select');
    const loadingState = document.getElementById('loading');
    const articleCount = document.getElementById('article-count');
    const currentFilters = document.getElementById('current-filters');
    
    // Modal elements
    const modal = document.getElementById('summary-modal');
    const modalClose = document.getElementById('modal-close');
    const summaryLoading = document.getElementById('summary-loading');
    const summaryContent = document.getElementById('summary-content');
    
    // Custom link elements
    const customLinkBtn = document.getElementById('custom-link-btn');
    const customLinkPanel = document.getElementById('custom-link-panel');
    const customUrlInput = document.getElementById('custom-url-input');
    const customSummarizeBtn = document.getElementById('custom-summarize-btn');

    // Track current summarization request to prevent duplicates
    let currentRequest = null;

    // --- Custom Link Panel Toggle ---
    customLinkBtn.addEventListener('click', () => {
        customLinkPanel.classList.toggle('expanded');
        customLinkBtn.classList.toggle('active');
    });

    // --- Custom Link Summarization ---
    customSummarizeBtn.addEventListener('click', handleCustomSummarize);

    function handleCustomSummarize() {
        const url = customUrlInput.value.trim();
        
        if (!url) {
            showNotification('Please enter a valid article URL', 'error');
            return;
        }
        
        if (!isValidURL(url)) {
            showNotification('Please enter a valid URL (e.g., https://example.com/article)', 'error');
            return;
        }
        
        const title = extractTitleFromURL(url);
        openSummaryModal(url, title);
    }

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
            const hostname = urlObj.hostname.replace('www.', '');
            return `Article from ${hostname}`;
        } catch (_) {
            return 'Custom Article';
        }
    }

    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${message}
        `;
        
        // Add styles
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
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // --- Function to Create an Article Card ---
    function createArticleCard(article) {
        const card = document.createElement('div');
        card.classList.add('news-card');
        
        const imageURL = article.image || '';

        card.innerHTML = `
            <a href="${article.url}" target="_blank" style="text-decoration: none; color: inherit; flex: 1; display: flex; flex-direction: column;">
                <div class="card-image-wrapper">
                    <img src="${imageURL}" alt="Article Image" onerror="this.style.display='none'; this.parentNode.classList.add('no-image');">
                </div>
                <div class="card-content">
                    <h4 class="card-title">${article.title}</h4>
                    <p class="card-description">${article.description}</p>
                    <div class="card-footer">
                        <span class="source"><i class="fas fa-newspaper"></i> ${article.source}</span>
                        <span class="date"><i class="fas fa-calendar-alt"></i> ${article.published}</span>
                    </div>
                </div>
            </a>
            <div class="card-actions">
                <button class="ai-summary-btn" data-url="${article.url}" data-title="${article.title.replace(/"/g, '&quot;')}">
                    <i class="fas fa-robot"></i> AI Summary
                </button>
            </div>
        `;
        
        const summaryBtn = card.querySelector('.ai-summary-btn');
        summaryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openSummaryModal(article.url, article.title);
        });
        
        return card;
    }

    // --- Function to Open Summary Modal ---
    function openSummaryModal(url, title) {
        // Cancel any ongoing request
        if (currentRequest) {
            currentRequest.abort();
        }
        
        modal.style.display = 'block';
        summaryLoading.style.display = 'block';
        summaryContent.style.display = 'none';
        summaryContent.innerHTML = '';
        
        fetchAISummary(url, title);
    }

    // --- Function to Fetch AI Summary ---
    async function fetchAISummary(url, title) {
        const controller = new AbortController();
        currentRequest = controller;
        
        try {
            const response = await fetch('/api/summarize', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
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
                    <div style="margin-top: 20px; padding: 15px; background: rgba(255, 215, 0, 0.05); border-radius: 8px; border: 1px dashed rgba(255, 215, 0, 0.3);">
                        <p style="color: #ffd700; font-size: 0.9em; margin: 0;">
                            <i class="fas fa-robot"></i> AI Summary • 
                            <a href="${url}" target="_blank" style="color: var(--color-accent); text-decoration: none; font-weight: 600;">Read Full Article →</a>
                        </p>
                    </div>
                `;
            } else {
                // Use fallback summary if provided
                const fallbackText = data.fallback_summary || 
                    `Unable to generate AI summary for this article. This may be due to paywalls, authentication requirements, or website restrictions. 
                    
Please visit the source website to read the full article: ${url}`;
                
                summaryContent.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <i class="fas fa-exclamation-circle" style="font-size: 2em; color: #ffd700; margin-bottom: 15px;"></i>
                        <p style="color: #ffd700; font-size: 1.1em; margin-bottom: 15px;">
                            Limited Summary Available
                        </p>
                        <div style="background: rgba(255, 215, 0, 0.1); padding: 15px; border-radius: 8px; text-align: left;">
                            <p style="color: #b0b8d4; font-size: 0.95em; line-height: 1.6; margin: 0;">
                                ${fallbackText}
                            </p>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                return; // Request was cancelled
            }
            
            summaryLoading.style.display = 'none';
            summaryContent.style.display = 'block';
            summaryContent.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2em; color: #ff6b6b; margin-bottom: 15px;"></i>
                    <p style="color: #ff6b6b; font-size: 1.1em; margin-bottom: 10px;">
                        Network Error
                    </p>
                    <p style="color: #b0b8d4; font-size: 0.9em;">
                        Please check your connection and try again.
                    </p>
                </div>
            `;
        } finally {
            currentRequest = null;
        }
    }

    // --- Close Modal ---
    modalClose.addEventListener('click', () => {
        // Cancel any ongoing request when closing
        if (currentRequest) {
            currentRequest.abort();
            currentRequest = null;
        }
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            if (currentRequest) {
                currentRequest.abort();
                currentRequest = null;
            }
            modal.style.display = 'none';
        }
    });

    // --- Allow Enter key in custom URL input ---
    customUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleCustomSummarize();
        }
    });

    // --- Core Fetch and Render Function ---
    async function fetchAndRenderNews() {
        const timeFrame = document.querySelector('.tab-button.active').getAttribute('data-time');
        const countryCode = countrySelect.value;
        const category = categorySelect.value;

        articlesContainer.innerHTML = '';
        loadingState.style.display = 'flex';
        articleCount.textContent = '';
        currentFilters.textContent = '';
        
        try {
            const response = await fetch('/api/news', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
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
                articlesContainer.innerHTML = `
                    <p class="error-message">
                        <i class="fas fa-exclamation-triangle"></i> No headlines found. Try different filters.
                    </p>
                `;
            }
        } catch (error) {
            loadingState.style.display = 'none';
            articlesContainer.innerHTML = `
                <p class="error-message">
                    <i class="fas fa-plug"></i> Connection failed. Ensure the server is running.
                </p>
            `;
        }
    }

    // --- Event Listeners ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            fetchAndRenderNews();
        });
    });

    countrySelect.addEventListener('change', fetchAndRenderNews);
    categorySelect.addEventListener('change', fetchAndRenderNews);

    // --- Initial Load ---
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