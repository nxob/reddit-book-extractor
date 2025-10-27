(function() {
    'use strict';

    console.log('📚 Book Rec Extractor v2: Starting...');

    if (window.bookRecExtractorActive) {
        const panel = document.getElementById('book-rec-panel');
        if (panel) {
            panel.remove();
            window.bookRecExtractorActive = false;
        }
        return;
    }
    window.bookRecExtractorActive = true;

    if (!window.location.hostname.includes('reddit.com')) {
        alert('⚠️ This tool only works on Reddit!');
        window.bookRecExtractorActive = false;
        return;
    }

    let allPosts = [];
    let isLoading = false;

    const BOT_ACCOUNTS = ['automoderator', 'sneakpeekbot', 'remindmebot', 'wikitextbot', 'romance-bot'];
    
    // Common false positives to filter out
    const FALSE_POSITIVES = new Set([
        'rating', 'ratings', 'topics', 'topic', 'looking for', 'dark romance', 
        'book request', 'recommendations', 'recommendation', 'series', 'author',
        'goodreads', 'kindle unlimited', 'amazon', 'trigger warning', 'content warning'
    ]);

    // Extract book recommendations with better filtering
    function extractBookRecommendations(text, commentId, commentUrl) {
        const books = [];
        
        // Pattern 0: Reddit's {Book Title by Author} format - HIGHEST CONFIDENCE
        const pattern0 = /\{([^{}]+?)\s+by\s+([^{}]+?)\}/g;
        let match;
        while ((match = pattern0.exec(text)) !== null) {
            const title = match[1].trim();
            const author = match[2].trim();
            if (!FALSE_POSITIVES.has(title.toLowerCase()) && title.length > 2) {
                books.push({ 
                    title, 
                    author, 
                    confidence: 'high',
                    commentId,
                    commentUrl,
                    context: extractContext(text, match.index, 150)
                });
            }
        }
        
        // Pattern 1: "I recommend/suggest [Book] by [Author]" - HIGHEST CONFIDENCE
        const pattern1 = /(?:recommend|suggest|try|loved|enjoyed|read)\s+["""']([A-Z][^"""'\n]{3,60}?)["""']\s+by\s+([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?[A-Z][a-z]+)/gi;
        while ((match = pattern1.exec(text)) !== null) {
            const title = match[1].trim();
            const author = match[2].trim();
            if (!FALSE_POSITIVES.has(title.toLowerCase()) && title.length > 2) {
                books.push({ 
                    title, 
                    author, 
                    confidence: 'high',
                    commentId,
                    commentUrl,
                    context: extractContext(text, match.index, 150)
                });
            }
        }
        
        // Pattern 2: Just "Book Title" by Author (without quotes)
        const pattern2 = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})\s+by\s+([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?[A-Z][a-z]+)/g;
        while ((match = pattern2.exec(text)) !== null) {
            const title = match[1].trim();
            const author = match[2].trim();
            if (!FALSE_POSITIVES.has(title.toLowerCase()) && 
                title.length > 2 && 
                !title.match(/^(Check|Read|Try|Love|Loved|Recommend)$/i)) {
                books.push({ 
                    title, 
                    author, 
                    confidence: 'high',
                    commentId,
                    commentUrl,
                    context: extractContext(text, match.index, 150)
                });
            }
        }
        
        // Pattern 3: Book titles in quotes or italics (more selective)
        const pattern3 = /["""*]([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5})["""*]/g;
        while ((match = pattern3.exec(text)) !== null) {
            const title = match[1].trim();
            // More strict filtering for medium confidence
            if (!FALSE_POSITIVES.has(title.toLowerCase()) && 
                title.length > 5 &&
                !title.match(/^(I|The|A|An|This|That|It|You|We|They|Rating|Topics|Looking|Request)$/i) &&
                title.split(' ').length >= 2 && // At least 2 words
                title.split(' ').length <= 6) { // Not too long
                books.push({ 
                    title, 
                    author: null, 
                    confidence: 'medium',
                    commentId,
                    commentUrl,
                    context: extractContext(text, match.index, 150)
                });
            }
        }
        
        // Pattern 4: "{Author}'s {Book}" format
        const pattern4 = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'s\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})/g;
        while ((match = pattern4.exec(text)) !== null) {
            const author = match[1].trim();
            const title = match[2].trim();
            if (!FALSE_POSITIVES.has(title.toLowerCase())) {
                books.push({ 
                    title, 
                    author, 
                    confidence: 'high',
                    commentId,
                    commentUrl,
                    context: extractContext(text, match.index, 150)
                });
            }
        }
        
        return books;
    }

    // Extract context around the match
    function extractContext(text, matchIndex, length) {
        const start = Math.max(0, matchIndex - length);
        const end = Math.min(text.length, matchIndex + length);
        let context = text.substring(start, end);
        if (start > 0) context = '...' + context;
        if (end < text.length) context = context + '...';
        return context;
    }

    // Summarize post request
    function summarizeRequest(title, content) {
        const text = (title + ' ' + content).toLowerCase();
        
        const tropes = [];
        
        const tropePatterns = {
            'enemies to lovers': /enemies\s+to\s+lovers|e2l/gi,
            'forced proximity': /forced\s+proximity/gi,
            'age gap': /age\s+gap|older\s+(?:man|woman|mmc|fmc)/gi,
            'mafia': /mafia|mob\s+boss|organized\s+crime/gi,
            'dark romance': /dark\s+romance/gi,
            'morally grey': /morally\s+grey|morally\s+gray|antihero|anti-hero/gi,
            'captive/kidnapping': /captive|kidnap|stockholm/gi,
            'bully romance': /bully\s+romance|bully/gi,
            'vampire': /vampire/gi,
            'fae': /\bfae\b|faerie|fey/gi,
            'reverse harem': /reverse\s+harem|rh\s+/gi,
            'why choose': /why\s+choose/gi,
            'possessive': /possessive|obsessive/gi,
            'stalker': /stalker/gi,
            'revenge': /revenge/gi,
            'second chance': /second\s+chance/gi,
            'forbidden': /forbidden/gi
        };
        
        for (const [trope, pattern] of Object.entries(tropePatterns)) {
            if (pattern.test(text)) {
                tropes.push(trope);
            }
        }
        
        return {
            tropes,
            summary: `Looking for: ${tropes.length > 0 ? tropes.join(', ') : 'recommendations'}`
        };
    }

    function scrapePosts() {
        console.log('📋 Scraping posts...');
        const posts = [];
        
        const postElements = document.querySelectorAll('shreddit-post, div[data-testid="post-container"]');
        console.log(`Found ${postElements.length} posts`);

        postElements.forEach((post, index) => {
            try {
                let title, url, author, content;

                if (post.tagName === 'SHREDDIT-POST') {
                    title = post.getAttribute('post-title') || '';
                    url = post.getAttribute('content-href') || '';
                    author = post.getAttribute('author') || '';
                    
                    const contentEl = post.querySelector('[slot="text-body"]');
                    content = contentEl ? contentEl.textContent : '';
                } else {
                    const titleEl = post.querySelector('h3, [data-testid="post-title"]');
                    title = titleEl ? titleEl.textContent.trim() : '';
                    
                    const linkEl = post.querySelector('a[href*="/comments/"]');
                    url = linkEl ? linkEl.href : '';
                    
                    const authorEl = post.querySelector('[data-testid="post_author_link"]');
                    author = authorEl ? authorEl.textContent.replace('u/', '').trim() : 'Unknown';
                    
                    const contentEl = post.querySelector('[data-click-id="text"]');
                    content = contentEl ? contentEl.textContent : '';
                }

                if (title && url) {
                    posts.push({
                        title,
                        url: url.startsWith('http') ? url : `https://www.reddit.com${url}`,
                        author,
                        content,
                        recommendations: [],
                        request: null
                    });
                }
            } catch (err) {
                console.warn(`Error parsing post ${index}:`, err);
            }
        });

        console.log(`✅ Scraped ${posts.length} posts`);
        return posts;
    }

    async function analyzePostForRecs(postUrl, postTitle, postContent) {
        try {
            const jsonUrl = postUrl.replace(/\/$/, '') + '.json';
            console.log(`Analyzing: ${postTitle.substring(0, 50)}...`);
            
            const response = await fetch(jsonUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            const request = summarizeRequest(postTitle, postContent);
            const commentsData = data[1]?.data?.children || [];
            const recommendations = [];
            const seenBooks = new Set();
            
            commentsData.forEach(comment => {
                const c = comment.data;
                
                if (!c.body || 
                    c.body === '[deleted]' || 
                    c.body === '[removed]' ||
                    BOT_ACCOUNTS.includes(c.author?.toLowerCase())) {
                    return;
                }
                
                // Build comment URL
                const commentUrl = `${postUrl}${c.id}/`;
                
                // Extract book recommendations with comment link
                const books = extractBookRecommendations(c.body, c.id, commentUrl);
                
                books.forEach(book => {
                    const bookKey = (book.title + (book.author || '')).toLowerCase();
                    if (!seenBooks.has(bookKey)) {
                        seenBooks.add(bookKey);
                        recommendations.push({
                            ...book,
                            recommendedBy: c.author,
                            score: c.score || 0
                        });
                    }
                });
            });
            
            // Sort by confidence and score
            recommendations.sort((a, b) => {
                if (a.confidence === 'high' && b.confidence !== 'high') return -1;
                if (a.confidence !== 'high' && b.confidence === 'high') return 1;
                return b.score - a.score;
            });
            
            console.log(`✅ Found ${recommendations.length} book recommendations`);
            return { request, recommendations: recommendations.slice(0, 20) };
        } catch (err) {
            console.error('Error analyzing post:', err);
            return { request: null, recommendations: [] };
        }
    }

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        #book-rec-panel {
            position: fixed;
            top: 0;
            right: 0;
            width: 700px;
            height: 100vh;
            background: #0f0f10;
            color: #e8e6e3;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            box-shadow: -4px 0 20px rgba(0,0,0,0.7);
        }
        #br-header {
            background: linear-gradient(135deg, #8b0000 0%, #4a0000 100%);
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        #br-header h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
        }
        #br-close {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            width: 32px;
            height: 32px;
            border-radius: 50%;
        }
        #br-close:hover {
            background: rgba(255,255,255,0.3);
        }
        #br-controls {
            padding: 16px 20px;
            background: #1a1a1b;
            border-bottom: 1px solid #2a2a2b;
            overflow: visible;
        }
        #br-scan-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #8b0000 0%, #4a0000 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 0 10px rgba(220,38,38,0.5);
            transition: all 0.2s ease;
        }
        #br-scan-btn:hover {
            transform: scale(1.03);
            background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%);
        }
        #br-scan-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        #br-search {
            width: 100%;
            padding: 10px;
            background: #0f0f10;
            border: 1px solid #2a2a2b;
            border-radius: 6px;
            color: #e8e6e3;
            font-size: 14px;
        }
        #br-search:focus {
            outline: none;
            border-color: #8b0000;
        }
        #br-stats {
            display: flex;
            gap: 20px;
            margin-top: 12px;
            font-size: 12px;
            color: #a8a6a3;
        }
        #br-content {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }
        .br-post {
            background: #1a1a1b;
            border: 1px solid #2a2a2b;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .br-post-title {
            font-size: 16px;
            font-weight: 600;
            color: #e8e6e3;
            margin-bottom: 12px;
            cursor: pointer;
        }
        .br-post-title:hover {
            color: #ff6b6b;
        }
        .br-request {
            background: #2a2a2b;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 16px;
            border-left: 3px solid #8b0000;
        }
        .br-request-label {
            font-size: 11px;
            text-transform: uppercase;
            color: #8b0000;
            font-weight: 700;
            margin-bottom: 6px;
        }
        .br-tropes {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .br-trope {
            background: #8b0000;
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }
        .br-recommendations {
            margin-top: 12px;
        }
        .br-rec-header {
            font-size: 13px;
            font-weight: 700;
            color: #a8a6a3;
            margin-bottom: 12px;
            text-transform: uppercase;
        }
        .br-book {
            background: #0f0f10;
            padding: 14px;
            border-radius: 8px;
            margin-bottom: 12px;
            border-left: 3px solid #4a0000;
            cursor: pointer;
            transition: all 0.2s;
        }
        .br-book:hover {
            background: #1a1a1b;
            border-left-color: #ff6b6b;
        }
        .br-book-title {
            font-size: 15px;
            font-weight: 600;
            color: #ff6b6b;
            margin-bottom: 4px;
        }
        .br-book-author {
            font-size: 13px;
            color: #e8e6e3;
            margin-bottom: 8px;
        }
        .br-book-context {
            font-size: 12px;
            color: #a8a6a3;
            font-style: italic;
            margin-bottom: 8px;
            line-height: 1.4;
            border-left: 2px solid #2a2a2b;
            padding-left: 10px;
        }
        .br-book-meta {
            font-size: 11px;
            color: #a8a6a3;
            display: flex;
            gap: 12px;
            align-items: center;
        }
        .br-view-comment {
            background: #2a2a2b;
            color: #ff6b6b;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-decoration: none;
            display: inline-block;
        }
        .br-view-comment:hover {
            background: #8b0000;
            color: white;
        }
        .br-confidence-high {
            border-left-color: #00a86b;
        }
        .br-confidence-medium {
            border-left-color: #ffa500;
        }
        .br-loading {
            text-align: center;
            padding: 40px;
            color: #a8a6a3;
        }
        .br-empty {
            text-align: center;
            padding: 60px 20px;
            color: #a8a6a3;
            line-height: 1.6;
        }
        ::-webkit-scrollbar {
            width: 10px;
        }
        ::-webkit-scrollbar-track {
            background: #0f0f10;
        }
        ::-webkit-scrollbar-thumb {
            background: #2a2a2b;
            border-radius: 5px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #8b0000;
        }
    `;
    document.head.appendChild(style);

    // Create UI
    const panel = document.createElement('div');
    panel.id = 'book-rec-panel';
    panel.innerHTML = `
        <div id="br-header">
            <h2>📚 Book Rec Extractor</h2>
            <button id="br-close">✕</button>
        </div>
        <div id="br-controls">
            <button id="br-scan-btn">Extract All Book Recommendations</button>
            <input type="text" id="br-search" placeholder="Search by title, author, or trope...">
            <div id="br-stats">
                <span>Posts: <strong id="br-post-count">0</strong></span>
                <span>Books Found: <strong id="br-book-count">0</strong></span>
            </div>
        </div>
        <div id="br-content">
            <div class="br-empty">
                📖 Click "Extract All Book Recommendations" to scan!<br><br>
                💡 Click on any book card to view the original comment.
            </div>
        </div>
    `;
    document.body.appendChild(panel);

    document.getElementById('br-close').addEventListener('click', () => {
        panel.remove();
        window.bookRecExtractorActive = false;
    });

    document.getElementById('br-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        renderPosts(allPosts.filter(post => {
            const inTitle = post.title.toLowerCase().includes(query);
            const inRecs = post.recommendations.some(r => 
                r.title.toLowerCase().includes(query) || 
                (r.author && r.author.toLowerCase().includes(query))
            );
            const inTropes = post.request?.tropes.some(t => t.includes(query));
            return inTitle || inRecs || inTropes;
        }));
    });

    function renderPosts(posts) {
        const content = document.getElementById('br-content');
        
        if (posts.length === 0) {
            content.innerHTML = '<div class="br-empty">No posts with recommendations found.<br><br>Try scrolling to load more posts first!</div>';
            return;
        }

        content.innerHTML = posts.map(post => `
            <div class="br-post">
                <h3 class="br-post-title" onclick="window.open('${post.url}', '_blank')">
                    ${post.title}
                </h3>
                
                ${post.request && post.request.tropes.length > 0 ? `
                    <div class="br-request">
                        <div class="br-request-label">🎯 Looking for:</div>
                        <div class="br-tropes">
                            ${post.request.tropes.map(t => `<span class="br-trope">${t}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${post.recommendations.length > 0 ? `
                    <div class="br-recommendations">
                        <div class="br-rec-header">📖 Recommended Books (${post.recommendations.length})</div>
                        ${post.recommendations.map(rec => `
                            <div class="br-book br-confidence-${rec.confidence}" onclick="window.open('${rec.commentUrl}', '_blank')">
                                <div class="br-book-title">${rec.title}</div>
                                ${rec.author ? `<div class="br-book-author">by ${rec.author}</div>` : ''}
                                <div class="br-book-context">"${rec.context}"</div>
                                <div class="br-book-meta">
                                    <span>👤 u/${rec.recommendedBy}</span>
                                    <span>⬆️ ${rec.score}</span>
                                    <span>${rec.confidence === 'high' ? '✓ High' : '~ Medium'}</span>
                                    <a href="${rec.commentUrl}" class="br-view-comment" onclick="event.stopPropagation()">View Comment →</a>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<div style="color: #a8a6a3; font-size: 13px; margin-top: 8px;">No book recommendations found.</div>'}
            </div>
        `).join('');
    }

    function updateStats() {
        document.getElementById('br-post-count').textContent = allPosts.length;
        const totalBooks = allPosts.reduce((sum, p) => sum + p.recommendations.length, 0);
        document.getElementById('br-book-count').textContent = totalBooks;
    }

    document.getElementById('br-scan-btn').addEventListener('click', async () => {
        if (isLoading) return;
        
        isLoading = true;
        const btn = document.getElementById('br-scan-btn');
        const content = document.getElementById('br-content');
        
        btn.disabled = true;
        btn.textContent = 'Scanning posts...';
        content.innerHTML = '<div class="br-loading">🔍 Scanning posts on this page...</div>';
        
        allPosts = scrapePosts();
        
        if (allPosts.length === 0) {
            content.innerHTML = '<div class="br-empty">No posts found.<br><br>Try scrolling down to load more posts first!</div>';
            btn.disabled = false;
            btn.textContent = 'Extract All Book Recommendations';
            isLoading = false;
            return;
        }
        
        updateStats();
        renderPosts(allPosts);
        
        btn.textContent = `Analyzing comments (0/${allPosts.length})...`;
        
        for (let i = 0; i < allPosts.length; i++) {
            const post = allPosts[i];
            btn.textContent = `Analyzing (${i + 1}/${allPosts.length})...`;
            
            const { request, recommendations } = await analyzePostForRecs(post.url, post.title, post.content);
            post.request = request;
            post.recommendations = recommendations;
            
            updateStats();
            renderPosts(allPosts);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        btn.disabled = false;
        btn.textContent = 'Refresh Data';
        isLoading = false;
        
        console.log('✅ Extraction complete!');
    });

    console.log('📚 Book Rec Extractor v2 ready!');
})();
