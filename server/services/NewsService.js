const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

class NewsService {
  constructor(databaseService, aiService) {
    this.db = databaseService;
    this.ai = aiService;
    this.browser = null;
    
    // News-specific API keys and configurations
    this.newsApiKey = process.env.NEWS_API_KEY;
    this.serpstackApiKey = process.env.WEB_SEARCH_API_KEY;
    
    // News-specific sources with faster refresh rates
    this.newsSources = [
      {
        name: 'Google News',
        url: 'https://news.google.com/search',
        type: 'rss',
        priority: 'high',
        refreshRate: 5 // minutes
      },
      {
        name: 'Reuters',
        url: 'https://www.reuters.com',
        type: 'rss',
        priority: 'high',
        refreshRate: 5
      },
      {
        name: 'Associated Press',
        url: 'https://apnews.com',
        type: 'rss',
        priority: 'high',
        refreshRate: 10
      },
      {
        name: 'BBC News',
        url: 'https://www.bbc.com/news',
        type: 'rss',
        priority: 'medium',
        refreshRate: 15
      }
    ];

    // Breaking news keywords for priority detection
    this.breakingNewsKeywords = [
      'breaking', 'urgent', 'alert', 'developing', 'live',
      'just in', 'update', 'confirmed', 'reports', 'emergency'
    ];
  }

  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      logger.info('News service initialized with browser');
    } catch (error) {
      logger.error('Failed to initialize news service:', error);
    }
  }

  async triggerNewsUpdate(streamId, userId) {
    try {
      logger.info(`Starting news update for stream ${streamId}`);
      
      const stream = await this.db.getStreamById(streamId);
      if (!stream || stream.focus_type !== 'news') {
        throw new Error('Stream not found or not a news stream');
      }

      // Get news stream configuration
      const newsConfig = await this.db.getNewsStreamConfig(streamId);
      
      // Get last newsletter to find cutoff time
      const lastNewsletter = await this.db.getLatestNewsletter(streamId);
      const cutoffTime = lastNewsletter ? 
        new Date(lastNewsletter.generated_at) : 
        new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours ago

      // Perform fast news search
      const newsResults = await this.performNewsSearch(
        stream.title, 
        stream.description, 
        cutoffTime,
        newsConfig
      );

      if (newsResults.articles.length === 0) {
        logger.info(`No new news found for stream ${streamId}`);
        return null;
      }

      // Check for breaking news
      const breakingNews = this.identifyBreakingNews(newsResults.articles);
      
      // Send breaking news alerts if enabled
      if (breakingNews.length > 0 && newsConfig?.breaking_news_enabled) {
        await this.sendBreakingNewsAlerts(streamId, userId, breakingNews);
      }

      // Generate news digest
      const digest = await this.generateNewsDigest(
        streamId, 
        userId, 
        stream.title, 
        newsResults,
        breakingNews.length > 0
      );

      // Update stream with latest data
      await this.db.updateStream(streamId, { 
        last_update: new Date(),
        sources_count: newsResults.articles.length,
        insights_count: newsResults.trends.length
      });
      
      return digest;
    } catch (error) {
      logger.error('Error in news update:', error);
      throw error;
    }
  }

  async performNewsSearch(topic, description = '', cutoffTime = null, newsConfig = {}) {
    try {
      const searchResults = await this.searchNewsContent(topic, description, cutoffTime);
      const analyzedNews = await this.analyzeNewsContent(searchResults, topic, newsConfig);
      
      return {
        topic,
        articles: searchResults,
        trends: analyzedNews.trends || [],
        sentiment: analyzedNews.sentiment || 'neutral',
        urgency: analyzedNews.urgency || 'normal',
        confidence: analyzedNews.confidence || 0.8,
        sourcesAnalyzed: searchResults.length,
        timebound: true,
        cutoffTime
      };
    } catch (error) {
      logger.error('Error performing news search:', error);
      return {
        topic,
        articles: [],
        trends: [],
        sentiment: 'neutral',
        urgency: 'normal',
        confidence: 0,
        sourcesAnalyzed: 0
      };
    }
  }

  async searchNewsContent(topic, description = '', cutoffTime = null) {
    try {
      let allResults = [];

      // Use NewsAPI if available
      if (this.newsApiKey) {
        const newsApiResults = await this.performNewsApiSearch(topic, cutoffTime);
        allResults = allResults.concat(newsApiResults);
      }

      // Use Serpstack for additional results
      if (this.serpstackApiKey) {
        const serpResults = await this.performSerpstackNewsSearch(topic, cutoffTime);
        allResults = allResults.concat(serpResults);
      }

      // Fallback to RSS feeds
      if (allResults.length === 0) {
        const rssResults = await this.performRSSSearch(topic, cutoffTime);
        allResults = allResults.concat(rssResults);
      }

      // Remove duplicates and sort by recency
      const uniqueResults = this.deduplicateArticles(allResults);
      return uniqueResults.sort((a, b) => new Date(b.date) - new Date(a.date));

    } catch (error) {
      logger.error('Error searching news content:', error);
      return this.generateMockNewsResults(topic, 5);
    }
  }

  async performNewsApiSearch(topic, cutoffTime) {
    try {
      const fromDate = cutoffTime ? cutoffTime.toISOString().split('T')[0] : null;
      
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: topic,
          from: fromDate,
          sortBy: 'publishedAt',
          language: 'en',
          pageSize: 50,
          apiKey: this.newsApiKey
        },
        timeout: 10000
      });

      return response.data.articles.map(article => ({
        title: article.title,
        url: article.url,
        content: article.description || article.content,
        date: article.publishedAt,
        source: article.source.name,
        author: article.author,
        imageUrl: article.urlToImage,
        relevanceScore: this.calculateRelevanceScore(article.title, topic)
      }));
    } catch (error) {
      logger.error('NewsAPI search error:', error);
      return [];
    }
  }

  async performSerpstackNewsSearch(topic, cutoffTime) {
    try {
      const response = await axios.get('http://api.serpstack.com/search', {
        params: {
          access_key: this.serpstackApiKey,
          query: topic,
          type: 'news',
          num: 20
        },
        timeout: 15000
      });

      if (!response.data.news_results) {
        return [];
      }

      return response.data.news_results
        .filter(article => {
          if (!cutoffTime) return true;
          const articleDate = new Date(article.date);
          return articleDate > cutoffTime;
        })
        .map(article => ({
          title: article.title,
          url: article.link,
          content: article.snippet,
          date: article.date,
          source: article.source,
          imageUrl: article.thumbnail,
          relevanceScore: this.calculateRelevanceScore(article.title, topic)
        }));
    } catch (error) {
      logger.error('Serpstack news search error:', error);
      return [];
    }
  }

  async performRSSSearch(topic, cutoffTime) {
    // Fallback RSS parsing implementation
    const results = [];
    
    for (const source of this.newsSources) {
      try {
        // This would implement RSS feed parsing
        // For now, return mock data
        const mockResults = this.generateMockNewsResults(topic, 3);
        results.push(...mockResults);
      } catch (error) {
        logger.error(`RSS search error for ${source.name}:`, error);
      }
    }
    
    return results;
  }

  async analyzeNewsContent(articles, topic, newsConfig = {}) {
    try {
      if (articles.length === 0) {
        return { trends: [], sentiment: 'neutral', urgency: 'normal', confidence: 0 };
      }

      const prompt = `
        Analyze these news articles about "${topic}" and provide:
        1. Key trends and developments (max 5)
        2. Overall sentiment (positive/negative/neutral)
        3. Urgency level (low/normal/high/critical)
        4. Confidence score (0.0-1.0)

        Articles:
        ${articles.slice(0, 10).map((article, i) => 
          `${i + 1}. ${article.title}\n   ${article.content}\n   Source: ${article.source}\n`
        ).join('\n')}

        Respond in JSON format:
        {
          "trends": ["trend1", "trend2", ...],
          "sentiment": "neutral",
          "urgency": "normal",
          "confidence": 0.8,
          "summary": "Brief summary of developments"
        }
      `;

      const analysis = await this.ai.generateResponse(prompt, {
        maxTokens: 500,
        temperature: 0.3
      });

      try {
        return JSON.parse(analysis);
      } catch (parseError) {
        logger.error('Failed to parse news analysis JSON:', parseError);
        return {
          trends: ['Unable to analyze trends'],
          sentiment: 'neutral',
          urgency: 'normal',
          confidence: 0.5,
          summary: 'Analysis unavailable'
        };
      }
    } catch (error) {
      logger.error('Error analyzing news content:', error);
      return {
        trends: [],
        sentiment: 'neutral',
        urgency: 'normal',
        confidence: 0
      };
    }
  }

  identifyBreakingNews(articles) {
    return articles.filter(article => {
      const titleLower = article.title.toLowerCase();
      const contentLower = (article.content || '').toLowerCase();
      
      // Check for breaking news keywords
      const hasBreakingKeywords = this.breakingNewsKeywords.some(keyword => 
        titleLower.includes(keyword) || contentLower.includes(keyword)
      );
      
      // Check recency (within last 2 hours)
      const articleDate = new Date(article.date);
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const isRecent = articleDate > twoHoursAgo;
      
      // Check high relevance score
      const isHighRelevance = article.relevanceScore > 0.8;
      
      return hasBreakingKeywords && isRecent && isHighRelevance;
    });
  }

  async sendBreakingNewsAlerts(streamId, userId, breakingNews) {
    try {
      for (const article of breakingNews) {
        await this.db.createNewsAlert({
          news_stream_id: streamId,
          user_id: userId,
          title: `Breaking: ${article.title}`,
          content: article.content,
          source_url: article.url,
          importance_score: Math.min(10, Math.floor(article.relevanceScore * 10)),
          alert_type: 'breaking'
        });
      }
      
      logger.info(`Sent ${breakingNews.length} breaking news alerts for stream ${streamId}`);
    } catch (error) {
      logger.error('Error sending breaking news alerts:', error);
    }
  }

  async generateNewsDigest(streamId, userId, topic, newsResults, hasBreakingNews = false) {
    try {
      const digestContent = this.generateDigestContent(topic, newsResults, hasBreakingNews);
      
      const newsletter = await this.db.createNewsletter({
        stream_id: streamId,
        user_id: userId,
        title: `${hasBreakingNews ? '🚨 Breaking News: ' : '📰 News Digest: '}${topic}`,
        summary: newsResults.summary || `Latest news updates on ${topic}`,
        content: digestContent,
        sources: JSON.stringify(newsResults.articles.map(a => a.url)),
        key_insights: JSON.stringify(newsResults.trends),
        confidence: newsResults.confidence,
        is_automated: true,
        focus_type: 'news'
      });

      return newsletter;
    } catch (error) {
      logger.error('Error generating news digest:', error);
      throw error;
    }
  }

  generateDigestContent(topic, newsResults, hasBreakingNews) {
    const { articles, trends, sentiment, urgency } = newsResults;
    
    let content = `# ${hasBreakingNews ? '🚨 Breaking News Update' : '📰 News Digest'}: ${topic}\n\n`;
    
    if (hasBreakingNews) {
      content += `⚡ **Urgent developments detected** - This digest contains breaking news requiring immediate attention.\n\n`;
    }
    
    content += `## 📊 Overview\n`;
    content += `- **Articles Analyzed**: ${articles.length}\n`;
    content += `- **Overall Sentiment**: ${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}\n`;
    content += `- **Urgency Level**: ${urgency.charAt(0).toUpperCase() + urgency.slice(1)}\n`;
    content += `- **Last Updated**: ${new Date().toLocaleString()}\n\n`;

    if (trends.length > 0) {
      content += `## 🔥 Key Trends\n`;
      trends.forEach((trend, i) => {
        content += `${i + 1}. ${trend}\n`;
      });
      content += '\n';
    }

    content += `## 📰 Latest Articles\n`;
    articles.slice(0, 10).forEach((article, i) => {
      content += `### ${i + 1}. ${article.title}\n`;
      content += `**Source**: ${article.source} | **Published**: ${new Date(article.date).toLocaleString()}\n`;
      content += `${article.content}\n`;
      content += `[Read more](${article.url})\n\n`;
    });

    content += `---\n`;
    content += `*This digest was automatically generated from ${articles.length} news sources.*`;
    
    return content;
  }

  calculateRelevanceScore(title, topic) {
    const titleLower = title.toLowerCase();
    const topicLower = topic.toLowerCase();
    const topicWords = topicLower.split(' ');
    
    let score = 0;
    let matches = 0;
    
    topicWords.forEach(word => {
      if (titleLower.includes(word)) {
        matches++;
        score += word.length > 3 ? 0.3 : 0.1; // Longer words get higher weight
      }
    });
    
    // Bonus for exact phrase match
    if (titleLower.includes(topicLower)) {
      score += 0.4;
    }
    
    // Normalize score
    return Math.min(1.0, score);
  }

  deduplicateArticles(articles) {
    const seen = new Set();
    return articles.filter(article => {
      const key = `${article.title}-${article.source}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  generateMockNewsResults(topic, count = 5) {
    const mockSources = ['Reuters', 'AP News', 'BBC', 'CNN', 'Bloomberg'];
    const results = [];
    
    for (let i = 0; i < count; i++) {
      results.push({
        title: `Breaking: Latest developments in ${topic} - Update ${i + 1}`,
        url: `https://example.com/news/${i + 1}`,
        content: `Recent developments regarding ${topic} have emerged. This is a mock article for testing purposes.`,
        date: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
        source: mockSources[i % mockSources.length],
        author: `Reporter ${i + 1}`,
        relevanceScore: 0.8 - (i * 0.1)
      });
    }
    
    return results;
  }

  async cleanup() {
    try {
      if (this.browser) {
        await this.browser.close();
        logger.info('News service browser closed');
      }
    } catch (error) {
      logger.error('Error cleaning up news service:', error);
    }
  }
}

module.exports = NewsService; 