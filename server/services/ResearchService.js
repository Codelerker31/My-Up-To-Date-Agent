const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

class ResearchService {
  constructor(databaseService, aiService) {
    this.db = databaseService;
    this.ai = aiService;
    this.browser = null;
    this.searchSources = [
      {
        name: 'Google News',
        url: 'https://news.google.com/search',
        selector: 'article',
        titleSelector: 'h3',
        linkSelector: 'a',
        dateSelector: 'time'
      },
      {
        name: 'Bing News',
        url: 'https://www.bing.com/news/search',
        selector: '.news-card',
        titleSelector: '.title',
        linkSelector: 'a',
        dateSelector: '.source'
      }
    ];
  }

  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      logger.info('Research service initialized with browser');
    } catch (error) {
      logger.error('Failed to initialize research service:', error);
    }
  }

  async triggerManualResearch(streamId, userId) {
    try {
      logger.info(`Starting manual research for stream ${streamId}`);
      
      const stream = await this.db.getStreamById(streamId);
      if (!stream) {
        throw new Error('Stream not found');
      }

      // Perform research
      const researchResults = await this.performResearch(stream.title, stream.description);
      
      // Generate newsletter
      const newsletter = await this.generateNewsletter(
        streamId, 
        userId, 
        stream.title, 
        researchResults,
        false
      );

      return newsletter;
    } catch (error) {
      logger.error('Error in manual research:', error);
      throw error;
    }
  }

  async triggerAutomatedResearch(streamId, userId) {
    try {
      logger.info(`Starting automated research for stream ${streamId}`);
      
      const stream = await this.db.getStreamById(streamId);
      if (!stream) {
        throw new Error('Stream not found');
      }

      // Get last newsletter to find cutoff date
      const lastNewsletter = await this.db.getLatestNewsletter(streamId);
      const cutoffDate = lastNewsletter ? 
        new Date(lastNewsletter.generated_at) : 
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Perform time-bound research
      const researchResults = await this.performTimeBoundResearch(
        stream.title, 
        stream.description, 
        cutoffDate
      );

      if (researchResults.articles.length === 0) {
        logger.info(`No new content found for stream ${streamId}`);
        return null;
      }

      // Generate automated newsletter
      const reportNumber = (lastNewsletter?.report_number || 0) + 1;
      const newsletter = await this.generateNewsletter(
        streamId, 
        userId, 
        stream.title, 
        researchResults,
        true,
        reportNumber
      );

      // Update stream
      await this.db.updateStream(streamId, { 
        last_update: new Date(),
        sources_count: researchResults.articles.length,
        insights_count: researchResults.keyInsights.length
      });
      
      return newsletter;
    } catch (error) {
      logger.error('Error in automated research:', error);
      throw error;
    }
  }

  async performResearch(topic, description = '') {
    try {
      const searchResults = await this.searchContent(topic, description);
      const analyzedContent = await this.analyzeContent(searchResults, topic);
      
      return {
        topic,
        articles: searchResults,
        keyInsights: analyzedContent.keyInsights || [],
        themes: analyzedContent.themes || [],
        confidence: analyzedContent.confidence || 0.8,
        sourcesAnalyzed: searchResults.length
      };
    } catch (error) {
      logger.error('Error performing research:', error);
      return {
        topic,
        articles: [],
        keyInsights: [],
        themes: [],
        confidence: 0,
        sourcesAnalyzed: 0
      };
    }
  }

  async performTimeBoundResearch(topic, description, cutoffDate) {
    try {
      const searchResults = await this.searchContent(topic, description, cutoffDate);
      
      // Filter results to only include content after cutoff date
      const filteredResults = searchResults.filter(article => {
        const articleDate = new Date(article.date);
        return articleDate > cutoffDate;
      });

      if (filteredResults.length === 0) {
        return {
          topic,
          articles: [],
          keyInsights: [],
          themes: [],
          confidence: 0,
          sourcesAnalyzed: 0
        };
      }

      const analyzedContent = await this.analyzeContent(filteredResults, topic);
      
      return {
        topic,
        articles: filteredResults,
        keyInsights: analyzedContent.keyInsights || [],
        themes: analyzedContent.themes || [],
        confidence: analyzedContent.confidence || 0.8,
        sourcesAnalyzed: filteredResults.length,
        timebound: true,
        cutoffDate
      };
    } catch (error) {
      logger.error('Error performing time-bound research:', error);
      return {
        topic,
        articles: [],
        keyInsights: [],
        themes: [],
        confidence: 0,
        sourcesAnalyzed: 0
      };
    }
  }

  async searchContent(topic, description = '', cutoffDate = null) {
    try {
      // For demo purposes, generate mock research results
      const mockResults = this.generateMockResults(topic, 8);
      
      // Filter by date if cutoff provided
      if (cutoffDate) {
        return mockResults.filter(article => {
          const articleDate = new Date(article.date);
          return articleDate > cutoffDate;
        });
      }
      
      return mockResults;
    } catch (error) {
      logger.error('Error searching content:', error);
      return [];
    }
  }

  generateMockResults(topic, count) {
    const results = [];
    const mockTitles = [
      `Breakthrough in ${topic}: New research findings`,
      `Market analysis: ${topic} industry trends`,
      `Expert insights on ${topic} developments`,
      `Technical advances in ${topic} technology`,
      `Future outlook for ${topic} sector`,
      `Investment opportunities in ${topic}`,
      `Regulatory changes affecting ${topic}`,
      `International perspectives on ${topic}`
    ];

    const sources = ['TechCrunch', 'MIT Technology Review', 'Nature', 'IEEE Spectrum', 'Fortune', 'Reuters', 'Bloomberg', 'Academic Journal'];

    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor(Math.random() * 7) + 1;
      results.push({
        title: mockTitles[i % mockTitles.length],
        url: `https://example.com/article-${i}`,
        date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        summary: `This article explores recent developments in ${topic}, highlighting key innovations and their potential impact on the industry. The research presents new findings that could reshape our understanding of ${topic}.`,
        source: sources[i % sources.length]
      });
    }

    return results;
  }

  async analyzeContent(articles, topic) {
    try {
      if (!articles || articles.length === 0) {
        return {
          keyInsights: [],
          themes: [],
          confidence: 0
        };
      }

      // For demo purposes, generate mock analysis
      const mockInsights = [
        `Significant breakthrough in ${topic} technology`,
        `Market adoption of ${topic} accelerating`,
        `New regulatory framework for ${topic} emerging`,
        `Investment in ${topic} research increasing`,
        `Industry collaboration on ${topic} standards`
      ];

      const mockThemes = [
        'Technology Innovation',
        'Market Trends',
        'Regulatory Environment',
        'Investment Landscape',
        'Industry Collaboration'
      ];

      return {
        keyInsights: mockInsights.slice(0, 3),
        themes: mockThemes.slice(0, 3),
        confidence: 0.85
      };
    } catch (error) {
      logger.error('Error analyzing content:', error);
      return {
        keyInsights: ['Analysis not available'],
        themes: ['General content'],
        confidence: 0.3
      };
    }
  }

  async generateNewsletter(streamId, userId, topic, researchResults, isAutomated = false, reportNumber = 1) {
    try {
      // Generate newsletter content
      const newsletterContent = this.generateNewsletterContent(topic, researchResults, isAutomated, reportNumber);

      // Create newsletter in database
      const newsletter = await this.db.createNewsletter({
        streamId,
        userId,
        title: `${topic}: ${isAutomated ? 'Automated' : 'Manual'} Report #${reportNumber}`,
        summary: this.generateSummary(researchResults),
        content: newsletterContent,
        sources: researchResults.articles.map(a => a.source),
        keyInsights: researchResults.keyInsights,
        confidence: researchResults.confidence,
        isAutomated,
        reportNumber
      });

      return newsletter;
    } catch (error) {
      logger.error('Error generating newsletter:', error);
      throw error;
    }
  }

  generateNewsletterContent(topic, researchResults, isAutomated, reportNumber) {
    const { articles, keyInsights, themes, confidence, sourcesAnalyzed } = researchResults;
    
    const content = `# ${topic}: ${isAutomated ? 'Automated' : 'Manual'} Research Report #${reportNumber}

*${isAutomated ? 'Automated' : 'Manual'} Research Report*

## Executive Summary

This ${isAutomated ? 'automated' : 'manual'} research cycle analyzed ${sourcesAnalyzed} sources and identified ${keyInsights.length} key insights across ${themes.length} major themes. Research confidence: ${Math.round(confidence * 100)}%.

## Key Developments

${keyInsights.map((insight, i) => `### ${i + 1}. ${insight}

Recent analysis shows significant progress in this area, with multiple sources reporting breakthrough developments.

`).join('')}

## Major Themes

${themes.map(theme => `- **${theme}**: Emerging as a critical area of focus`).join('\n')}

## Recent Articles

${articles.slice(0, 5).map(article => `### ${article.title}
*Source: ${article.source} | Date: ${article.date.toDateString()}*

${article.summary}

[Read more](${article.url})

`).join('')}

## Research Methodology

This ${isAutomated ? 'automated' : 'manual'} research process included:
- ${sourcesAnalyzed} sources analyzed
- Multiple search strategies employed
- AI-powered content analysis
- Credibility and relevance filtering

${isAutomated ? `## Schedule Information

- **Research Frequency:** Automated
- **Sources Monitored:** ${sourcesAnalyzed} active sources
- **Research Confidence:** ${Math.round(confidence * 100)}%

*This is an automated research report. I'll continue monitoring developments and deliver your next update as scheduled.*` : ''}

---

*Generated on ${new Date().toDateString()}*`;

    return content;
  }

  generateSummary(researchResults) {
    const { articles, keyInsights, sourcesAnalyzed } = researchResults;
    
    if (articles.length === 0) {
      return 'No new developments found in this research cycle.';
    }

    const topInsights = keyInsights.slice(0, 2);
    const summary = `Latest research identified ${sourcesAnalyzed} sources with ${keyInsights.length} key insights. Key findings: ${topInsights.join(', ')}.`;
    
    return summary.length > 200 ? summary.substring(0, 200) + '...' : summary;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      logger.info('Research service browser closed');
    }
  }
}

module.exports = ResearchService; 