const logger = require('../utils/logger');

class AnalyticsService {
  constructor(aiService) {
    this.ai = aiService;
    this.isInitialized = false;
    
    // Bias detection patterns
    this.biasPatterns = {
      political: {
        keywords: [
          'liberal', 'conservative', 'left-wing', 'right-wing', 'progressive', 'traditional',
          'socialist', 'capitalist', 'democrat', 'republican', 'partisan'
        ],
        phrases: [
          'fake news', 'mainstream media', 'deep state', 'establishment', 'radical agenda'
        ]
      },
      commercial: {
        keywords: [
          'sponsored', 'advertisement', 'promoted', 'paid content', 'affiliate'
        ],
        phrases: [
          'buy now', 'limited offer', 'exclusive deal', 'best price'
        ]
      },
      emotional: {
        keywords: [
          'shocking', 'outrageous', 'devastating', 'incredible', 'amazing', 'terrible'
        ],
        phrases: [
          'you won\'t believe', 'this will shock you', 'experts hate this'
        ]
      },
      confirmation: {
        keywords: [
          'obviously', 'clearly', 'undeniably', 'certainly', 'definitely'
        ],
        phrases: [
          'everyone knows', 'it\'s obvious that', 'there\'s no doubt'
        ]
      }
    };

    // Source credibility indicators
    this.credibilityFactors = {
      domain: {
        high: [
          'nature.com', 'science.org', 'cell.com', 'nejm.org', 'thelancet.com',
          'pubmed.ncbi.nlm.nih.gov', 'arxiv.org', 'ieee.org', 'acm.org',
          'reuters.com', 'ap.org', 'bbc.com', 'npr.org'
        ],
        medium: [
          'cnn.com', 'nytimes.com', 'washingtonpost.com', 'theguardian.com',
          'wsj.com', 'economist.com', 'sciencedirect.com', 'springer.com'
        ],
        questionable: [
          'infowars.com', 'breitbart.com', 'naturalnews.com', 'dailymail.co.uk'
        ]
      },
      indicators: {
        positive: [
          'peer-reviewed', 'published in', 'doi:', 'methodology', 'statistical analysis',
          'control group', 'sample size', 'confidence interval', 'p-value'
        ],
        negative: [
          'unverified', 'anonymous source', 'rumored', 'allegedly', 'conspiracy',
          'miracle cure', 'secret', 'they don\'t want you to know'
        ]
      }
    };

    // Citation network analysis cache
    this.citationCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  async initialize() {
    try {
      logger.info('Analytics service initializing...');
      
      // Initialize AI models for bias detection
      await this.initializeBiasDetection();
      
      this.isInitialized = true;
      logger.info('Analytics service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize analytics service:', error);
      throw error;
    }
  }

  async initializeBiasDetection() {
    // Initialize bias detection models
    // In production, this would load trained models
    logger.info('Bias detection models initialized');
  }

  async analyzeBias(content, metadata = {}) {
    try {
      const analysis = {
        overallBiasScore: 0, // 0 = neutral, 1 = highly biased
        biasTypes: {},
        confidence: 0,
        details: [],
        recommendations: []
      };

      // Analyze different types of bias
      analysis.biasTypes.political = await this.detectPoliticalBias(content);
      analysis.biasTypes.commercial = await this.detectCommercialBias(content);
      analysis.biasTypes.emotional = await this.detectEmotionalBias(content);
      analysis.biasTypes.confirmation = await this.detectConfirmationBias(content);

      // Calculate overall bias score
      const biasScores = Object.values(analysis.biasTypes);
      analysis.overallBiasScore = biasScores.reduce((sum, score) => sum + score, 0) / biasScores.length;

      // Analyze source credibility if URL provided
      if (metadata.url) {
        analysis.sourceCredibility = await this.analyzeSourceCredibility(metadata.url, content);
      }

      // Use AI for advanced bias detection
      if (this.ai) {
        const aiAnalysis = await this.performAIBiasAnalysis(content);
        analysis.aiInsights = aiAnalysis;
        
        // Adjust confidence based on AI analysis
        analysis.confidence = this.calculateConfidence(analysis, aiAnalysis);
      }

      // Generate recommendations
      analysis.recommendations = this.generateBiasRecommendations(analysis);

      logger.info(`Bias analysis completed: overall score ${analysis.overallBiasScore.toFixed(2)}`);
      return analysis;

    } catch (error) {
      logger.error('Error analyzing bias:', error);
      throw error;
    }
  }

  async detectPoliticalBias(content) {
    const text = content.toLowerCase();
    let biasScore = 0;
    let detectedTerms = [];

    // Check for political keywords
    this.biasPatterns.political.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        biasScore += matches.length * 0.1;
        detectedTerms.push(keyword);
      }
    });

    // Check for political phrases
    this.biasPatterns.political.phrases.forEach(phrase => {
      if (text.includes(phrase.toLowerCase())) {
        biasScore += 0.2;
        detectedTerms.push(phrase);
      }
    });

    return Math.min(1, biasScore);
  }

  async detectCommercialBias(content) {
    const text = content.toLowerCase();
    let biasScore = 0;

    // Check for commercial indicators
    this.biasPatterns.commercial.keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        biasScore += 0.15;
      }
    });

    this.biasPatterns.commercial.phrases.forEach(phrase => {
      if (text.includes(phrase.toLowerCase())) {
        biasScore += 0.25;
      }
    });

    return Math.min(1, biasScore);
  }

  async detectEmotionalBias(content) {
    const text = content.toLowerCase();
    let biasScore = 0;

    // Count emotional words
    let emotionalWords = 0;
    this.biasPatterns.emotional.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        emotionalWords += matches.length;
      }
    });

    // Check for emotional phrases
    this.biasPatterns.emotional.phrases.forEach(phrase => {
      if (text.includes(phrase.toLowerCase())) {
        biasScore += 0.3;
      }
    });

    // Calculate emotional bias based on word density
    const wordCount = text.split(/\s+/).length;
    const emotionalDensity = emotionalWords / wordCount;
    biasScore += emotionalDensity * 2; // Scale emotional density

    return Math.min(1, biasScore);
  }

  async detectConfirmationBias(content) {
    const text = content.toLowerCase();
    let biasScore = 0;

    // Check for absolute statements
    this.biasPatterns.confirmation.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        biasScore += matches.length * 0.1;
      }
    });

    // Check for confirmation phrases
    this.biasPatterns.confirmation.phrases.forEach(phrase => {
      if (text.includes(phrase.toLowerCase())) {
        biasScore += 0.2;
      }
    });

    return Math.min(1, biasScore);
  }

  async analyzeSourceCredibility(url, content) {
    try {
      const domain = new URL(url).hostname.toLowerCase();
      let credibilityScore = 0.5; // Neutral starting point
      const factors = [];

      // Domain-based credibility
      if (this.credibilityFactors.domain.high.some(d => domain.includes(d))) {
        credibilityScore += 0.3;
        factors.push('High-credibility domain');
      } else if (this.credibilityFactors.domain.medium.some(d => domain.includes(d))) {
        credibilityScore += 0.1;
        factors.push('Medium-credibility domain');
      } else if (this.credibilityFactors.domain.questionable.some(d => domain.includes(d))) {
        credibilityScore -= 0.3;
        factors.push('Questionable domain reputation');
      }

      // Content-based indicators
      const text = content.toLowerCase();
      
      // Positive indicators
      this.credibilityFactors.indicators.positive.forEach(indicator => {
        if (text.includes(indicator)) {
          credibilityScore += 0.05;
          factors.push(`Contains: ${indicator}`);
        }
      });

      // Negative indicators
      this.credibilityFactors.indicators.negative.forEach(indicator => {
        if (text.includes(indicator)) {
          credibilityScore -= 0.1;
          factors.push(`Warning: ${indicator}`);
        }
      });

      // Check for citations and references
      const citationPattern = /\[?\d+\]?|doi:|http[s]?:\/\/|www\./gi;
      const citations = text.match(citationPattern);
      if (citations && citations.length > 5) {
        credibilityScore += 0.1;
        factors.push('Well-cited content');
      }

      return {
        score: Math.max(0, Math.min(1, credibilityScore)),
        factors: factors,
        domain: domain
      };

    } catch (error) {
      logger.error('Error analyzing source credibility:', error);
      return { score: 0.5, factors: ['Unable to analyze source'], domain: 'unknown' };
    }
  }

  async performAIBiasAnalysis(content) {
    try {
      if (!this.ai) {
        return null;
      }

      const prompt = `Analyze the following text for bias and provide a detailed assessment:

Text: "${content}"

Please analyze for:
1. Political bias (left/right leaning)
2. Emotional manipulation
3. Factual accuracy concerns
4. Source reliability indicators
5. Overall objectivity

Provide a score from 0-1 (0 = completely objective, 1 = heavily biased) and explain your reasoning.`;

      const response = await this.ai.generateResponse(prompt, {
        maxTokens: 500,
        temperature: 0.3 // Lower temperature for more consistent analysis
      });

      // Parse AI response (this would need more sophisticated parsing in production)
      const aiAnalysis = {
        rawResponse: response,
        extractedScore: this.extractScoreFromResponse(response),
        insights: this.extractInsightsFromResponse(response)
      };

      return aiAnalysis;

    } catch (error) {
      logger.error('Error in AI bias analysis:', error);
      return null;
    }
  }

  extractScoreFromResponse(response) {
    // Extract numerical score from AI response
    const scoreMatch = response.match(/score[:\s]+([0-9]*\.?[0-9]+)/i);
    return scoreMatch ? parseFloat(scoreMatch[1]) : null;
  }

  extractInsightsFromResponse(response) {
    // Extract key insights from AI response
    const insights = [];
    
    if (response.includes('political')) {
      insights.push('Political bias detected');
    }
    if (response.includes('emotional')) {
      insights.push('Emotional language present');
    }
    if (response.includes('objective')) {
      insights.push('Generally objective tone');
    }
    
    return insights;
  }

  calculateConfidence(analysis, aiAnalysis) {
    let confidence = 0.7; // Base confidence

    // Increase confidence if AI analysis agrees with pattern-based analysis
    if (aiAnalysis && aiAnalysis.extractedScore) {
      const scoreDifference = Math.abs(analysis.overallBiasScore - aiAnalysis.extractedScore);
      if (scoreDifference < 0.2) {
        confidence += 0.2;
      } else if (scoreDifference > 0.5) {
        confidence -= 0.2;
      }
    }

    // Increase confidence for well-known sources
    if (analysis.sourceCredibility && analysis.sourceCredibility.score > 0.8) {
      confidence += 0.1;
    }

    return Math.max(0.1, Math.min(1, confidence));
  }

  generateBiasRecommendations(analysis) {
    const recommendations = [];

    if (analysis.overallBiasScore > 0.7) {
      recommendations.push('This source shows high bias. Consider finding additional sources for balanced perspective.');
    } else if (analysis.overallBiasScore > 0.4) {
      recommendations.push('This source shows moderate bias. Cross-reference with other sources.');
    }

    if (analysis.biasTypes.political > 0.5) {
      recommendations.push('Strong political bias detected. Seek sources from different political perspectives.');
    }

    if (analysis.biasTypes.emotional > 0.5) {
      recommendations.push('High emotional content detected. Look for more neutral, fact-based sources.');
    }

    if (analysis.biasTypes.commercial > 0.3) {
      recommendations.push('Commercial bias detected. This may be sponsored or promotional content.');
    }

    if (analysis.sourceCredibility && analysis.sourceCredibility.score < 0.4) {
      recommendations.push('Low source credibility. Verify information with more authoritative sources.');
    }

    if (recommendations.length === 0) {
      recommendations.push('This source appears relatively unbiased and credible.');
    }

    return recommendations;
  }

  async analyzeCitationNetwork(papers) {
    try {
      const networkAnalysis = {
        totalPapers: papers.length,
        citationConnections: [],
        influentialPapers: [],
        researchClusters: [],
        impactMetrics: {}
      };

      // Build citation connections
      const citationMap = new Map();
      
      papers.forEach(paper => {
        if (paper.citationCount) {
          citationMap.set(paper.id, {
            paper: paper,
            citationCount: paper.citationCount,
            connections: []
          });
        }
      });

      // Identify influential papers (top 10% by citation count)
      const sortedByCitations = [...citationMap.values()]
        .sort((a, b) => b.citationCount - a.citationCount);
      
      const topPercentile = Math.ceil(sortedByCitations.length * 0.1);
      networkAnalysis.influentialPapers = sortedByCitations
        .slice(0, topPercentile)
        .map(item => ({
          ...item.paper,
          influence: this.calculateInfluenceScore(item.paper, papers)
        }));

      // Calculate impact metrics
      networkAnalysis.impactMetrics = this.calculateImpactMetrics(papers);

      // Identify research clusters (simplified clustering by keywords/topics)
      networkAnalysis.researchClusters = this.identifyResearchClusters(papers);

      logger.info(`Citation network analysis completed for ${papers.length} papers`);
      return networkAnalysis;

    } catch (error) {
      logger.error('Error analyzing citation network:', error);
      throw error;
    }
  }

  calculateInfluenceScore(paper, allPapers) {
    let score = 0;

    // Base score from citation count
    score += Math.log(paper.citationCount + 1) * 0.4;

    // Boost for recent papers (recency factor)
    const currentYear = new Date().getFullYear();
    const paperAge = currentYear - parseInt(paper.year);
    if (paperAge <= 3) score += 0.3;
    else if (paperAge <= 5) score += 0.2;
    else if (paperAge <= 10) score += 0.1;

    // Boost for high-credibility sources
    if (paper.credibilityScore > 0.8) score += 0.2;

    // Boost for papers with many co-authors (collaboration indicator)
    if (paper.authors && paper.authors.length > 5) score += 0.1;

    return Math.min(1, score);
  }

  calculateImpactMetrics(papers) {
    const metrics = {
      totalCitations: 0,
      averageCitations: 0,
      hIndex: 0,
      topCitedPaper: null,
      yearDistribution: {},
      sourceDistribution: {}
    };

    // Calculate basic metrics
    papers.forEach(paper => {
      if (paper.citationCount) {
        metrics.totalCitations += paper.citationCount;
      }

      // Year distribution
      if (paper.year) {
        metrics.yearDistribution[paper.year] = (metrics.yearDistribution[paper.year] || 0) + 1;
      }

      // Source distribution
      if (paper.database) {
        metrics.sourceDistribution[paper.database] = (metrics.sourceDistribution[paper.database] || 0) + 1;
      }
    });

    metrics.averageCitations = metrics.totalCitations / papers.length;

    // Calculate h-index
    const citationCounts = papers
      .map(p => p.citationCount || 0)
      .sort((a, b) => b - a);
    
    for (let i = 0; i < citationCounts.length; i++) {
      if (citationCounts[i] >= i + 1) {
        metrics.hIndex = i + 1;
      } else {
        break;
      }
    }

    // Find top cited paper
    metrics.topCitedPaper = papers.reduce((top, paper) => {
      return (paper.citationCount || 0) > (top?.citationCount || 0) ? paper : top;
    }, null);

    return metrics;
  }

  identifyResearchClusters(papers) {
    const clusters = [];
    const keywordFreq = new Map();

    // Extract keywords from titles and abstracts
    papers.forEach(paper => {
      const text = `${paper.title} ${paper.abstract || ''}`.toLowerCase();
      const words = text.match(/\b[a-z]{4,}\b/g) || [];
      
      words.forEach(word => {
        keywordFreq.set(word, (keywordFreq.get(word) || 0) + 1);
      });
    });

    // Find most common keywords (potential cluster centers)
    const topKeywords = [...keywordFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword]) => keyword);

    // Group papers by dominant keywords
    topKeywords.forEach(keyword => {
      const clusterPapers = papers.filter(paper => {
        const text = `${paper.title} ${paper.abstract || ''}`.toLowerCase();
        return text.includes(keyword);
      });

      if (clusterPapers.length >= 2) {
        clusters.push({
          keyword: keyword,
          paperCount: clusterPapers.length,
          papers: clusterPapers.slice(0, 5), // Limit to top 5 for brevity
          averageCitations: clusterPapers.reduce((sum, p) => sum + (p.citationCount || 0), 0) / clusterPapers.length
        });
      }
    });

    return clusters.slice(0, 5); // Return top 5 clusters
  }

  async validateCrossReferences(citations) {
    try {
      const validation = {
        totalCitations: citations.length,
        validatedCitations: 0,
        crossReferences: [],
        inconsistencies: [],
        recommendations: []
      };

      // Check for cross-references between citations
      for (let i = 0; i < citations.length; i++) {
        for (let j = i + 1; j < citations.length; j++) {
          const similarity = this.calculateCitationSimilarity(citations[i], citations[j]);
          
          if (similarity > 0.8) {
            validation.crossReferences.push({
              citation1: citations[i],
              citation2: citations[j],
              similarity: similarity,
              type: 'potential_duplicate'
            });
          } else if (similarity > 0.3) {
            validation.crossReferences.push({
              citation1: citations[i],
              citation2: citations[j],
              similarity: similarity,
              type: 'related_work'
            });
          }
        }
      }

      // Check for inconsistencies
      validation.inconsistencies = this.findCitationInconsistencies(citations);

      // Generate recommendations
      validation.recommendations = this.generateValidationRecommendations(validation);

      logger.info(`Cross-reference validation completed for ${citations.length} citations`);
      return validation;

    } catch (error) {
      logger.error('Error validating cross-references:', error);
      throw error;
    }
  }

  calculateCitationSimilarity(citation1, citation2) {
    let similarity = 0;

    // Compare titles
    const title1 = citation1.title.toLowerCase();
    const title2 = citation2.title.toLowerCase();
    const titleSimilarity = this.calculateTextSimilarity(title1, title2);
    similarity += titleSimilarity * 0.5;

    // Compare authors
    const authors1 = citation1.authors.toLowerCase();
    const authors2 = citation2.authors.toLowerCase();
    const authorSimilarity = this.calculateTextSimilarity(authors1, authors2);
    similarity += authorSimilarity * 0.3;

    // Compare years
    if (citation1.year === citation2.year) {
      similarity += 0.1;
    }

    // Compare DOIs if available
    if (citation1.doi && citation2.doi && citation1.doi === citation2.doi) {
      similarity = 1.0; // Exact match
    }

    return similarity;
  }

  calculateTextSimilarity(text1, text2) {
    // Simple Jaccard similarity
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  findCitationInconsistencies(citations) {
    const inconsistencies = [];

    citations.forEach((citation, index) => {
      // Check for missing required fields
      if (!citation.title || citation.title.trim().length === 0) {
        inconsistencies.push({
          type: 'missing_title',
          citation: citation,
          index: index,
          severity: 'high'
        });
      }

      if (!citation.authors || citation.authors.trim().length === 0) {
        inconsistencies.push({
          type: 'missing_authors',
          citation: citation,
          index: index,
          severity: 'high'
        });
      }

      if (!citation.year || !/^\d{4}$/.test(citation.year)) {
        inconsistencies.push({
          type: 'invalid_year',
          citation: citation,
          index: index,
          severity: 'medium'
        });
      }

      // Check for suspicious patterns
      if (citation.title && citation.title.length < 10) {
        inconsistencies.push({
          type: 'suspiciously_short_title',
          citation: citation,
          index: index,
          severity: 'low'
        });
      }
    });

    return inconsistencies;
  }

  generateValidationRecommendations(validation) {
    const recommendations = [];

    if (validation.crossReferences.length > 0) {
      const duplicates = validation.crossReferences.filter(ref => ref.type === 'potential_duplicate');
      if (duplicates.length > 0) {
        recommendations.push(`Found ${duplicates.length} potential duplicate citations. Review and remove duplicates.`);
      }

      const related = validation.crossReferences.filter(ref => ref.type === 'related_work');
      if (related.length > 0) {
        recommendations.push(`Found ${related.length} related citations. Consider organizing them thematically.`);
      }
    }

    const highSeverityIssues = validation.inconsistencies.filter(inc => inc.severity === 'high');
    if (highSeverityIssues.length > 0) {
      recommendations.push(`${highSeverityIssues.length} citations have critical issues that need immediate attention.`);
    }

    if (validation.totalCitations < 5) {
      recommendations.push('Consider adding more sources to strengthen your research foundation.');
    }

    return recommendations;
  }

  async cleanup() {
    try {
      // Clear caches
      this.citationCache.clear();
      
      logger.info('Analytics service cleaned up');
    } catch (error) {
      logger.error('Error cleaning up analytics service:', error);
    }
  }
}

module.exports = AnalyticsService; 