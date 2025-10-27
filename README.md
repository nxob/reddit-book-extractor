✨ Features

📖 Smart Book Detection - Detects Reddit's {Book by Author} format plus multiple patterns
🎯 Trope Recognition - Identifies enemies-to-lovers, age gap, mafia, dark romance, and more
💬 Clickable Comments - Every book links to the original comment for context
📊 Upvote Sorting - Books sorted by confidence and community engagement
🔎 Live Search - Search across posts, books, authors, and tropes
🚫 Bot Filtering - Automatically filters AutoModerator and bot accounts


🚀 Quick Start
Installation (30 seconds)

Drag the "📚 Extract Books" button to your bookmarks bar
Done! No downloads, no extensions, no sign-ups

Usage

Go to any book subreddit (e.g., r/DarkRomance)
Click the bookmarklet
Click "Extract All Book Recommendations"
Browse all recommendations in one place!
Click any book to see the original comment


📊 How It Works
Book Detection Patterns
The extractor uses multiple regex patterns to find book recommendations:
Pattern 0: Reddit Format (Highest Confidence)
{Book Title by Author Name}
Example: {Mind to Bend by Aurelia Knight}
Pattern 1: Quoted Recommendations
"I recommend [Book] by [Author]"
Example: I recommend "Dark Lover" by J.R. Ward
Pattern 2: Direct Format
Book Title by Author Name
Example: A Court of Thorns and Roses by Sarah J. Maas
Pattern 3: Author's Book
{Author}'s {Book}
Example: Colleen Hoover's It Ends With Us
Trope Detection
Automatically detects popular romance tropes:

Enemies to Lovers
Forced Proximity
Age Gap
Mafia/Mob Boss
Dark Romance
Morally Grey Characters
Captive/Kidnapping
Bully Romance
Reverse Harem
Why Choose
Possessive MMC
Stalker Romance
And more!

Smart Filtering

❌ Filters AutoModerator, bots, and deleted comments
❌ Removes false positives (e.g., "Rating", "Topics")
❌ Skips generic words and common phrases
✅ Only shows real book recommendations


🛠️ Technical Details
Architecture
Bookmarklet (tiny JS loader)
    ↓
Loads extractor.js from GitHub Pages
    ↓
Scrapes visible posts from subreddit
    ↓
Fetches comments via Reddit JSON API
    ↓
Analyzes with regex patterns + NLP
    ↓
Displays in sliding panel
Technologies

Vanilla JavaScript - No dependencies
Reddit JSON API - Public API, no auth needed
Regex + NLP - Pattern matching and text analysis
Client-side only - Privacy focused, no server

Browser Compatibility

✅ Chrome/Edge (Chromium)
✅ Firefox
✅ Safari
✅ Brave
✅ Opera
