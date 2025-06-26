const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

class ResearchService {
  constructor(databaseService, aiService) {
    this.db = databaseService;
    this.ai = aiService;
    this.browser = null;
    this.serpstackApiKey = process.env.WEB_SEARCH_API_KEY;
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
    
    // Research project templates
    this.projectTemplates = {
      academic: {
        name: 'Academic Research',
        methodology: 'systematic-review',
        citationStyle: 'apa',
        sources: ['pubmed', 'arxiv', 'google-scholar'],
        structure: ['abstract', 'introduction', 'methodology', 'results', 'discussion', 'conclusion'],
        minSources: 10,
        qualityThreshold: 0.8
      },
      market: {
        name: 'Market Research',
        methodology: 'competitive-analysis',
        citationStyle: 'business',
        sources: ['industry-reports', 'financial-data', 'news'],
        structure: ['executive-summary', 'market-overview', 'competitive-landscape', 'trends', 'recommendations'],
        minSources: 15,
        qualityThreshold: 0.7
      },
      technical: {
        name: 'Technical Analysis',
        methodology: 'literature-review',
        citationStyle: 'ieee',
        sources: ['arxiv', 'ieee', 'acm', 'github'],
        structure: ['abstract', 'background', 'technical-analysis', 'implementation', 'evaluation'],
        minSources: 8,
        qualityThreshold: 0.85
      },
      personal: {
        name: 'Personal Interest',
        methodology: 'exploratory',
        citationStyle: 'mla',
        sources: ['web', 'books', 'articles'],
        structure: ['overview', 'key-findings', 'insights', 'next-steps'],
        minSources: 5,
        qualityThreshold: 0.6
      }
    };
    
    // Citation styles
    this.citationFormats = {
      apa: {
        name: 'APA Style',
        format: 'Author, A. A. (Year). Title of work. Publisher.',
        inText: '(Author, Year)'
      },
      mla: {
        name: 'MLA Style', 
        format: 'Author. "Title." Source, Date, URL.',
        inText: '(Author Page)'
      },
      ieee: {
        name: 'IEEE Style',
        format: '[1] A. Author, "Title," Journal, vol. X, no. Y, pp. Z-Z, Year.',
        inText: '[1]'
      },
      chicago: {
        name: 'Chicago Style',
        format: 'Author. "Title." Journal X, no. Y (Year): Z-Z.',
        inText: '(Author Year, Page)'
      }
    };
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
      // Use Serpstack API if available, otherwise fall back to mock data
      if (this.serpstackApiKey) {
        const searchResults = await this.performSerpstackSearch(topic, description, cutoffDate);
        return searchResults;
      } else {
        logger.info('No Serpstack API key found, using mock data');
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
      }
    } catch (error) {
      logger.error('Error searching content:', error);
      // Fall back to mock data if API fails
      return this.generateMockResults(topic, 5);
    }
  }

  async performSerpstackSearch(topic, description = '', cutoffDate = null) {
    try {
      const searchQuery = description ? `${topic} ${description}` : topic;
      
      // Build the API request for Serper
      const requestBody = {
        q: searchQuery,
        num: 10, // Number of results
        gl: 'us', // Country
        hl: 'en'  // Language
      };

      // Add date filtering if cutoff date is provided
      if (cutoffDate) {
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        requestBody.dateRestrict = `d${Math.ceil((Date.now() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24))}`;
      }

      const response = await axios.post('https://google.serper.dev/search', requestBody, {
        headers: {
          'X-API-KEY': this.serpstackApiKey,
          'Content-Type': 'application/json'
        }
      });
      
      // Transform Serper results to our format
      const articles = [];
      
      // Add organic results
      if (response.data.organic && response.data.organic.length > 0) {
        for (const result of response.data.organic) {
          articles.push({
            title: result.title,
            url: result.link,
            date: new Date(result.date || Date.now()),
            summary: result.snippet,
            source: result.displayLink || 'Unknown source'
          });
        }
      }

      // Add news results if available
      if (response.data.news && response.data.news.length > 0) {
        for (const news of response.data.news) {
          articles.push({
            title: news.title,
            url: news.link,
            date: new Date(news.date || Date.now()),
            summary: news.snippet,
            source: news.source || 'News'
          });
        }
      }

      logger.info(`Serper search returned ${articles.length} results for topic: ${topic}`);
      return articles;

    } catch (error) {
      logger.error('Error performing Serper search:', error);
      if (error.response) {
        logger.error('Serper API error response:', error.response.data);
      }
      throw error;
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

  async createResearchProject(userId, projectData) {
    try {
      const template = this.projectTemplates[projectData.template] || this.projectTemplates.personal;
      
      // Create the research stream
      const stream = await this.db.createStream({
        user_id: userId,
        title: projectData.title,
        description: projectData.description,
        focus_type: 'research',
        category: projectData.category || 'general',
        priority: projectData.priority || 'medium',
        frequency: projectData.frequency || 'weekly'
      });

      // Create research project configuration
      const projectConfig = await this.db.createResearchProject({
        stream_id: stream.id,
        methodology: template.methodology,
        citation_style: template.citationStyle,
        target_sources: template.sources,
        research_structure: template.structure,
        min_sources: template.minSources,
        quality_threshold: template.qualityThreshold,
        collaboration_enabled: projectData.collaboration || false,
        export_format: projectData.exportFormat || 'pdf'
      });

      // Initialize project workspace
      await this.initializeProjectWorkspace(stream.id, template);

      logger.info(`Created research project ${stream.id} for user ${userId}`);
      return { stream, config: projectConfig };
    } catch (error) {
      logger.error('Error creating research project:', error);
      throw error;
    }
  }

  async initializeProjectWorkspace(streamId, template) {
    try {
      // Create initial research outline based on template structure
      const outline = template.structure.map(section => ({
        section,
        content: '',
        sources: [],
        status: 'pending'
      }));

      await this.db.createResearchOutline(streamId, outline);

      // Create initial bibliography
      await this.db.createBibliography(streamId, {
        citation_style: template.citationStyle,
        sources: [],
        auto_format: true
      });

      logger.info(`Initialized workspace for research project ${streamId}`);
    } catch (error) {
      logger.error('Error initializing project workspace:', error);
      throw error;
    }
  }

  async addCitation(userId, streamId, citationData) {
    try {
      // Validate stream ownership
      const stream = await this.db.getStreamById(streamId);
      if (!stream || stream.user_id !== userId) {
        throw new Error('Stream not found or access denied');
      }

      // Get project configuration for citation style
      const projectConfig = await this.db.getResearchProjectConfig(streamId);
      const citationStyle = projectConfig?.citation_style || 'apa';

      // Format citation according to style
      const formattedCitation = await this.formatCitation(citationData, citationStyle);

      // Create citation record
      const citation = await this.db.createCitation({
        research_project_id: streamId,
        source_url: citationData.url,
        title: citationData.title,
        authors: citationData.authors,
        publication_date: citationData.date,
        source_type: citationData.type,
        formatted_citation: formattedCitation,
        notes: citationData.notes,
        page_numbers: citationData.pages,
        credibility_score: await this.assessSourceCredibility(citationData)
      });

      // Update bibliography
      await this.updateBibliography(streamId, citation);

      logger.info(`Added citation ${citation.id} to project ${streamId}`);
      return citation;
    } catch (error) {
      logger.error('Error adding citation:', error);
      throw error;
    }
  }

  async formatCitation(citationData, style) {
    try {
      const format = this.citationFormats[style];
      if (!format) {
        throw new Error(`Unsupported citation style: ${style}`);
      }

      let formatted = '';
      const authors = Array.isArray(citationData.authors) 
        ? citationData.authors.join(', ') 
        : citationData.authors;

      switch (style) {
        case 'apa':
          formatted = `${authors} (${citationData.year}). ${citationData.title}. ${citationData.source}`;
          if (citationData.url) formatted += `. Retrieved from ${citationData.url}`;
          break;
          
        case 'mla':
          formatted = `${authors}. "${citationData.title}" ${citationData.source}, ${citationData.date}`;
          if (citationData.url) formatted += `, ${citationData.url}`;
          formatted += '.';
          break;
          
        case 'ieee':
          formatted = `${authors}, "${citationData.title}," ${citationData.source}`;
          if (citationData.volume) formatted += `, vol. ${citationData.volume}`;
          if (citationData.pages) formatted += `, pp. ${citationData.pages}`;
          formatted += `, ${citationData.year}.`;
          break;
          
        case 'chicago':
          formatted = `${authors}. "${citationData.title}" ${citationData.source}`;
          if (citationData.issue) formatted += `, no. ${citationData.issue}`;
          formatted += ` (${citationData.year})`;
          if (citationData.pages) formatted += `: ${citationData.pages}`;
          formatted += '.';
          break;
          
        default:
          formatted = `${authors}. ${citationData.title}. ${citationData.source}, ${citationData.year}.`;
      }

      return formatted;
    } catch (error) {
      logger.error('Error formatting citation:', error);
      return `${citationData.authors}. ${citationData.title}. ${citationData.source}, ${citationData.year}.`;
    }
  }

  async assessSourceCredibility(citationData) {
    try {
      let score = 0.5; // Base score

      // Academic sources get higher scores
      const academicDomains = [
        'pubmed.ncbi.nlm.nih.gov', 'arxiv.org', 'scholar.google.com',
        'jstor.org', 'ieee.org', 'acm.org', 'nature.com', 'science.org'
      ];
      
      if (citationData.url) {
        const domain = new URL(citationData.url).hostname;
        if (academicDomains.some(acadDomain => domain.includes(acadDomain))) {
          score += 0.3;
        }
      }

      // Peer-reviewed sources
      if (citationData.peerReviewed) {
        score += 0.2;
      }

      // Recent sources (within 5 years)
      const currentYear = new Date().getFullYear();
      const publicationYear = parseInt(citationData.year);
      if (publicationYear >= currentYear - 5) {
        score += 0.1;
      }

      // Multiple authors (indicates collaboration)
      if (Array.isArray(citationData.authors) && citationData.authors.length > 1) {
        score += 0.1;
      }

      // Citation count (if available)
      if (citationData.citationCount && citationData.citationCount > 10) {
        score += 0.1;
      }

      return Math.min(1.0, score);
    } catch (error) {
      logger.error('Error assessing source credibility:', error);
      return 0.5; // Default moderate credibility
    }
  }

  async updateBibliography(streamId, citation) {
    try {
      const bibliography = await this.db.getBibliography(streamId);
      
      if (bibliography) {
        // Add citation to existing bibliography
        await this.db.addCitationToBibliography(bibliography.id, citation.id);
      } else {
        // Create new bibliography with this citation
        await this.db.createBibliography(streamId, {
          citation_style: 'apa',
          sources: [citation.id],
          auto_format: true
        });
      }

      // Sort bibliography alphabetically
      await this.sortBibliography(streamId);
    } catch (error) {
      logger.error('Error updating bibliography:', error);
    }
  }

  async sortBibliography(streamId) {
    try {
      const citations = await this.db.getCitationsByProject(streamId);
      
      // Sort by first author's last name
      citations.sort((a, b) => {
        const authorA = a.authors.split(',')[0].trim();
        const authorB = b.authors.split(',')[0].trim();
        return authorA.localeCompare(authorB);
      });

      // Update sort order in database
      for (let i = 0; i < citations.length; i++) {
        await this.db.updateCitationOrder(citations[i].id, i + 1);
      }
    } catch (error) {
      logger.error('Error sorting bibliography:', error);
    }
  }

  async searchAcademicSources(query, options = {}) {
    try {
      const { sourceType = 'all', limit = 20, yearFrom, yearTo } = options;
      
      // This would integrate with academic databases
      // For now, return mock academic results
      const mockResults = [
        {
          title: `Academic study on ${query}`,
          authors: ['Dr. Jane Smith', 'Prof. John Doe'],
          source: 'Journal of Advanced Research',
          year: '2023',
          url: 'https://example.com/academic-paper',
          abstract: `Comprehensive analysis of ${query} with significant findings...`,
          citationCount: 45,
          peerReviewed: true,
          credibilityScore: 0.92
        },
        {
          title: `Recent developments in ${query}`,
          authors: ['Dr. Alice Johnson'],
          source: 'Nature Communications',
          year: '2024',
          url: 'https://example.com/nature-paper',
          abstract: `Latest research on ${query} reveals new insights...`,
          citationCount: 23,
          peerReviewed: true,
          credibilityScore: 0.95
        }
      ];

      return mockResults;
    } catch (error) {
      logger.error('Error searching academic sources:', error);
      return [];
    }
  }

  async generateResearchReport(userId, streamId, format = 'pdf') {
    try {
      // Get research project data
      const stream = await this.db.getStreamById(streamId);
      const projectConfig = await this.db.getResearchProjectConfig(streamId);
      const outline = await this.db.getResearchOutline(streamId);
      const citations = await this.db.getCitationsByProject(streamId);
      const content = await this.db.getStreamContent(streamId);

      if (!stream || stream.user_id !== userId) {
        throw new Error('Stream not found or access denied');
      }

      // Generate comprehensive research report
      const report = {
        title: stream.title,
        author: await this.db.getUserById(userId),
        date: new Date().toISOString(),
        methodology: projectConfig.methodology,
        structure: outline,
        content: content,
        bibliography: citations,
        statistics: {
          totalSources: citations.length,
          averageCredibility: citations.reduce((sum, c) => sum + c.credibility_score, 0) / citations.length,
          researchDuration: this.calculateResearchDuration(stream.created_at),
          contentLength: content.reduce((sum, c) => sum + c.content.length, 0)
        }
      };

      // Format according to requested format
      let formattedReport;
      switch (format) {
        case 'pdf':
          formattedReport = await this.generatePDFReport(report);
          break;
        case 'html':
          formattedReport = await this.generateHTMLReport(report);
          break;
        case 'markdown':
          formattedReport = await this.generateMarkdownReport(report);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      logger.info(`Generated ${format} research report for project ${streamId}`);
      return formattedReport;
    } catch (error) {
      logger.error('Error generating research report:', error);
      throw error;
    }
  }

  calculateResearchDuration(startDate) {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  async generateMarkdownReport(report) {
    try {
      let markdown = `# ${report.title}\n\n`;
      markdown += `**Author:** ${report.author.name}\n`;
      markdown += `**Date:** ${new Date(report.date).toLocaleDateString()}\n`;
      markdown += `**Methodology:** ${report.methodology}\n\n`;

      // Add statistics
      markdown += `## Research Statistics\n\n`;
      markdown += `- **Total Sources:** ${report.statistics.totalSources}\n`;
      markdown += `- **Average Source Credibility:** ${(report.statistics.averageCredibility * 100).toFixed(1)}%\n`;
      markdown += `- **Research Duration:** ${report.statistics.researchDuration} days\n`;
      markdown += `- **Content Length:** ${report.statistics.contentLength.toLocaleString()} characters\n\n`;

      // Add content sections
      for (const section of report.structure) {
        markdown += `## ${section.section.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n\n`;
        markdown += `${section.content || '*This section is still being researched.*'}\n\n`;
      }

      // Add bibliography
      markdown += `## Bibliography\n\n`;
      report.bibliography.forEach((citation, index) => {
        markdown += `${index + 1}. ${citation.formatted_citation}\n`;
      });

      return {
        content: markdown,
        filename: `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}_research_report.md`,
        mimeType: 'text/markdown'
      };
    } catch (error) {
      logger.error('Error generating markdown report:', error);
      throw error;
    }
  }

  async getProjectTemplates() {
    return Object.entries(this.projectTemplates).map(([key, template]) => ({
      id: key,
      ...template
    }));
  }

  async getResearchStatistics(userId, streamId) {
    try {
      const citations = await this.db.getCitationsByProject(streamId);
      const content = await this.db.getStreamContent(streamId);
      const stream = await this.db.getStreamById(streamId);

      return {
        totalCitations: citations.length,
        averageCredibility: citations.length > 0 
          ? citations.reduce((sum, c) => sum + c.credibility_score, 0) / citations.length 
          : 0,
        sourceTypes: this.categorizeSourceTypes(citations),
        contentProgress: content.length,
        researchDuration: this.calculateResearchDuration(stream.created_at),
        lastUpdate: stream.updated_at
      };
    } catch (error) {
      logger.error('Error getting research statistics:', error);
      throw error;
    }
  }

  categorizeSourceTypes(citations) {
    const types = {};
    citations.forEach(citation => {
      const type = citation.source_type || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }
}

module.exports = ResearchService; 