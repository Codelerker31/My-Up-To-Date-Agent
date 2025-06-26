const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Academic search endpoint
router.get('/search', async (req, res) => {
  try {
    const { 
      query, 
      sources = 'pubmed,arxiv,crossref,semanticScholar',
      maxResults = 20,
      yearFrom,
      yearTo,
      sourceType = 'all',
      sortBy = 'relevance',
      includeAbstracts = true
    } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const academicService = req.app.get('academicService');
    if (!academicService) {
      return res.status(503).json({ error: 'Academic service not available' });
    }

    const searchOptions = {
      sources: sources.split(','),
      maxResults: parseInt(maxResults),
      yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
      yearTo: yearTo ? parseInt(yearTo) : undefined,
      sourceType,
      sortBy,
      includeAbstracts: includeAbstracts === 'true'
    };

    const results = await academicService.searchAcademicSources(query, searchOptions);

    res.json({
      success: true,
      query,
      totalResults: results.length,
      searchOptions,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Academic search error:', error);
    res.status(500).json({ 
      error: 'Failed to perform academic search',
      details: error.message 
    });
  }
});

// PubMed specific search
router.get('/pubmed', async (req, res) => {
  try {
    const { query, maxResults = 10, yearFrom, yearTo, includeAbstracts = true } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const academicService = req.app.get('academicService');
    if (!academicService) {
      return res.status(503).json({ error: 'Academic service not available' });
    }

    const results = await academicService.searchPubMed(query, {
      maxResults: parseInt(maxResults),
      yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
      yearTo: yearTo ? parseInt(yearTo) : undefined,
      includeAbstracts: includeAbstracts === 'true'
    });

    res.json({
      success: true,
      source: 'PubMed',
      query,
      totalResults: results.length,
      results
    });

  } catch (error) {
    logger.error('PubMed search error:', error);
    res.status(500).json({ 
      error: 'Failed to search PubMed',
      details: error.message 
    });
  }
});

// arXiv specific search
router.get('/arxiv', async (req, res) => {
  try {
    const { query, maxResults = 10, yearFrom, yearTo } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const academicService = req.app.get('academicService');
    if (!academicService) {
      return res.status(503).json({ error: 'Academic service not available' });
    }

    const results = await academicService.searchArXiv(query, {
      maxResults: parseInt(maxResults),
      yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
      yearTo: yearTo ? parseInt(yearTo) : undefined
    });

    res.json({
      success: true,
      source: 'arXiv',
      query,
      totalResults: results.length,
      results
    });

  } catch (error) {
    logger.error('arXiv search error:', error);
    res.status(500).json({ 
      error: 'Failed to search arXiv',
      details: error.message 
    });
  }
});

// CrossRef specific search
router.get('/crossref', async (req, res) => {
  try {
    const { query, rows = 10, yearFrom, yearTo } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const academicService = req.app.get('academicService');
    if (!academicService) {
      return res.status(503).json({ error: 'Academic service not available' });
    }

    const results = await academicService.searchCrossRef(query, {
      rows: parseInt(rows),
      yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
      yearTo: yearTo ? parseInt(yearTo) : undefined
    });

    res.json({
      success: true,
      source: 'CrossRef',
      query,
      totalResults: results.length,
      results
    });

  } catch (error) {
    logger.error('CrossRef search error:', error);
    res.status(500).json({ 
      error: 'Failed to search CrossRef',
      details: error.message 
    });
  }
});

// Semantic Scholar specific search
router.get('/semantic-scholar', async (req, res) => {
  try {
    const { query, limit = 10, yearFrom, yearTo } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const academicService = req.app.get('academicService');
    if (!academicService) {
      return res.status(503).json({ error: 'Academic service not available' });
    }

    const results = await academicService.searchSemanticScholar(query, {
      limit: parseInt(limit),
      yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
      yearTo: yearTo ? parseInt(yearTo) : undefined
    });

    res.json({
      success: true,
      source: 'Semantic Scholar',
      query,
      totalResults: results.length,
      results
    });

  } catch (error) {
    logger.error('Semantic Scholar search error:', error);
    res.status(500).json({ 
      error: 'Failed to search Semantic Scholar',
      details: error.message 
    });
  }
});

// Full-text availability check
router.post('/full-text-availability', async (req, res) => {
  try {
    const { papers } = req.body;

    if (!papers || !Array.isArray(papers)) {
      return res.status(400).json({ error: 'Papers array is required' });
    }

    const academicService = req.app.get('academicService');
    if (!academicService) {
      return res.status(503).json({ error: 'Academic service not available' });
    }

    const availability = await academicService.getFullTextAvailability(papers);

    res.json({
      success: true,
      totalPapers: papers.length,
      availability
    });

  } catch (error) {
    logger.error('Full-text availability check error:', error);
    res.status(500).json({ 
      error: 'Failed to check full-text availability',
      details: error.message 
    });
  }
});

// Test academic connections
router.get('/test-connections', async (req, res) => {
  try {
    const academicService = req.app.get('academicService');
    if (!academicService) {
      return res.status(503).json({ error: 'Academic service not available' });
    }

    const connections = await academicService.testConnections();

    res.json({
      success: true,
      connections,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Connection test error:', error);
    res.status(500).json({ 
      error: 'Failed to test connections',
      details: error.message 
    });
  }
});

// Get academic service status
router.get('/status', async (req, res) => {
  try {
    const academicService = req.app.get('academicService');
    
    if (!academicService) {
      return res.json({
        success: false,
        status: 'unavailable',
        message: 'Academic service not initialized'
      });
    }

    const status = {
      initialized: academicService.isInitialized,
      availableAPIs: Object.keys(academicService.apis),
      cacheSize: academicService.searchCache.size,
      rateLimitStatus: Object.fromEntries(academicService.rateLimits)
    };

    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Status check error:', error);
    res.status(500).json({ 
      error: 'Failed to get service status',
      details: error.message 
    });
  }
});

module.exports = router; 