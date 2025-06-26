const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Analyze bias in content
router.post('/bias-analysis', async (req, res) => {
  try {
    const { content, metadata = {} } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required for bias analysis' });
    }

    const analyticsService = req.app.get('analyticsService');
    if (!analyticsService) {
      return res.status(503).json({ error: 'Analytics service not available' });
    }

    const analysis = await analyticsService.analyzeBias(content, metadata);

    res.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Bias analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze bias',
      details: error.message 
    });
  }
});

// Analyze source credibility
router.post('/credibility-analysis', async (req, res) => {
  try {
    const { url, content } = req.body;

    if (!url || !content) {
      return res.status(400).json({ error: 'URL and content are required for credibility analysis' });
    }

    const analyticsService = req.app.get('analyticsService');
    if (!analyticsService) {
      return res.status(503).json({ error: 'Analytics service not available' });
    }

    const credibility = await analyticsService.analyzeSourceCredibility(url, content);

    res.json({
      success: true,
      credibility,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Credibility analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze source credibility',
      details: error.message 
    });
  }
});

// Analyze citation network
router.post('/citation-network', async (req, res) => {
  try {
    const { papers } = req.body;

    if (!papers || !Array.isArray(papers)) {
      return res.status(400).json({ error: 'Papers array is required for citation network analysis' });
    }

    const analyticsService = req.app.get('analyticsService');
    if (!analyticsService) {
      return res.status(503).json({ error: 'Analytics service not available' });
    }

    const networkAnalysis = await analyticsService.analyzeCitationNetwork(papers);

    res.json({
      success: true,
      networkAnalysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Citation network analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze citation network',
      details: error.message 
    });
  }
});

// Validate cross-references
router.post('/validate-citations', async (req, res) => {
  try {
    const { citations } = req.body;

    if (!citations || !Array.isArray(citations)) {
      return res.status(400).json({ error: 'Citations array is required for validation' });
    }

    const analyticsService = req.app.get('analyticsService');
    if (!analyticsService) {
      return res.status(503).json({ error: 'Analytics service not available' });
    }

    const validation = await analyticsService.validateCrossReferences(citations);

    res.json({
      success: true,
      validation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Citation validation error:', error);
    res.status(500).json({ 
      error: 'Failed to validate citations',
      details: error.message 
    });
  }
});

// Batch analysis for multiple sources
router.post('/batch-analysis', async (req, res) => {
  try {
    const { sources, analysisTypes = ['bias', 'credibility'] } = req.body;

    if (!sources || !Array.isArray(sources)) {
      return res.status(400).json({ error: 'Sources array is required for batch analysis' });
    }

    const analyticsService = req.app.get('analyticsService');
    if (!analyticsService) {
      return res.status(503).json({ error: 'Analytics service not available' });
    }

    const results = [];

    for (const source of sources) {
      const sourceResult = {
        id: source.id,
        url: source.url,
        title: source.title,
        analyses: {}
      };

      try {
        // Bias analysis
        if (analysisTypes.includes('bias')) {
          sourceResult.analyses.bias = await analyticsService.analyzeBias(
            source.content, 
            { url: source.url }
          );
        }

        // Credibility analysis  
        if (analysisTypes.includes('credibility') && source.url) {
          sourceResult.analyses.credibility = await analyticsService.analyzeSourceCredibility(
            source.url, 
            source.content
          );
        }

        results.push(sourceResult);

      } catch (error) {
        logger.error(`Error analyzing source ${source.id}:`, error);
        sourceResult.error = error.message;
        results.push(sourceResult);
      }
    }

    res.json({
      success: true,
      totalSources: sources.length,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Batch analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to perform batch analysis',
      details: error.message 
    });
  }
});

// Get analytics summary for a research project
router.get('/project-summary/:streamId', async (req, res) => {
  try {
    const { streamId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const databaseService = req.app.get('databaseService');
    const analyticsService = req.app.get('analyticsService');
    
    if (!databaseService || !analyticsService) {
      return res.status(503).json({ error: 'Required services not available' });
    }

    // Get stream content and citations
    const stream = await databaseService.getStream(streamId, userId);
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    const citations = await databaseService.getStreamCitations(streamId);
    const content = await databaseService.getStreamContent(streamId);

    // Analyze citations if available
    let citationAnalysis = null;
    if (citations.length > 0) {
      citationAnalysis = await analyticsService.validateCrossReferences(citations);
    }

    // Analyze content bias if available
    let biasAnalysis = null;
    if (content && content.length > 0) {
      const combinedContent = content.map(c => c.content).join(' ');
      biasAnalysis = await analyticsService.analyzeBias(combinedContent);
    }

    const summary = {
      streamId,
      streamTitle: stream.title,
      focusType: stream.focus_type,
      totalCitations: citations.length,
      totalContent: content.length,
      citationAnalysis,
      biasAnalysis,
      lastUpdated: stream.updated_at
    };

    res.json({
      success: true,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Project summary error:', error);
    res.status(500).json({ 
      error: 'Failed to generate project summary',
      details: error.message 
    });
  }
});

// Compare sources for bias and credibility
router.post('/compare-sources', async (req, res) => {
  try {
    const { sources } = req.body;

    if (!sources || !Array.isArray(sources) || sources.length < 2) {
      return res.status(400).json({ error: 'At least 2 sources are required for comparison' });
    }

    const analyticsService = req.app.get('analyticsService');
    if (!analyticsService) {
      return res.status(503).json({ error: 'Analytics service not available' });
    }

    const comparisons = [];

    // Analyze each source
    for (const source of sources) {
      const analysis = {
        id: source.id,
        title: source.title,
        url: source.url
      };

      try {
        analysis.bias = await analyticsService.analyzeBias(source.content, { url: source.url });
        if (source.url) {
          analysis.credibility = await analyticsService.analyzeSourceCredibility(source.url, source.content);
        }
      } catch (error) {
        analysis.error = error.message;
      }

      comparisons.push(analysis);
    }

    // Generate comparison insights
    const insights = {
      averageBias: 0,
      averageCredibility: 0,
      mostBiased: null,
      mostCredible: null,
      leastBiased: null,
      leastCredible: null
    };

    const validAnalyses = comparisons.filter(c => !c.error && c.bias && c.credibility);
    
    if (validAnalyses.length > 0) {
      insights.averageBias = validAnalyses.reduce((sum, a) => sum + a.bias.overallBiasScore, 0) / validAnalyses.length;
      insights.averageCredibility = validAnalyses.reduce((sum, a) => sum + a.credibility.score, 0) / validAnalyses.length;

      // Find extremes
      insights.mostBiased = validAnalyses.reduce((max, a) => 
        a.bias.overallBiasScore > max.bias.overallBiasScore ? a : max
      );
      insights.leastBiased = validAnalyses.reduce((min, a) => 
        a.bias.overallBiasScore < min.bias.overallBiasScore ? a : min
      );
      insights.mostCredible = validAnalyses.reduce((max, a) => 
        a.credibility.score > max.credibility.score ? a : max
      );
      insights.leastCredible = validAnalyses.reduce((min, a) => 
        a.credibility.score < min.credibility.score ? a : min
      );
    }

    res.json({
      success: true,
      totalSources: sources.length,
      comparisons,
      insights,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Source comparison error:', error);
    res.status(500).json({ 
      error: 'Failed to compare sources',
      details: error.message 
    });
  }
});

// Get bias patterns and trends
router.get('/bias-patterns', async (req, res) => {
  try {
    const analyticsService = req.app.get('analyticsService');
    if (!analyticsService) {
      return res.status(503).json({ error: 'Analytics service not available' });
    }

    const patterns = {
      biasTypes: Object.keys(analyticsService.biasPatterns),
      credibilityFactors: {
        highCredibilityDomains: analyticsService.credibilityFactors.domain.high,
        mediumCredibilityDomains: analyticsService.credibilityFactors.domain.medium,
        questionableDomains: analyticsService.credibilityFactors.domain.questionable,
        positiveIndicators: analyticsService.credibilityFactors.indicators.positive,
        negativeIndicators: analyticsService.credibilityFactors.indicators.negative
      }
    };

    res.json({
      success: true,
      patterns,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Get bias patterns error:', error);
    res.status(500).json({ 
      error: 'Failed to get bias patterns',
      details: error.message 
    });
  }
});

// Analytics service health check
router.get('/health', async (req, res) => {
  try {
    const analyticsService = req.app.get('analyticsService');
    
    if (!analyticsService) {
      return res.json({
        success: false,
        status: 'unavailable',
        message: 'Analytics service not initialized'
      });
    }

    const health = {
      initialized: analyticsService.isInitialized,
      aiServiceAvailable: !!analyticsService.ai,
      cacheSize: analyticsService.citationCache?.size || 0,
      biasPatternTypes: Object.keys(analyticsService.biasPatterns || {}),
      credibilityFactorsLoaded: !!(analyticsService.credibilityFactors)
    };

    res.json({
      success: true,
      health,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Analytics health check error:', error);
    res.status(500).json({ 
      error: 'Failed to check analytics service health',
      details: error.message 
    });
  }
});

module.exports = router; 