const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// News-specific routes for the dual-focus architecture

// GET /api/news/streams - Get all news streams for user
router.get('/streams', async (req, res) => {
  try {
    const { userId } = req.user;
    
    // Get news streams from database
    const newsStreams = await req.app.locals.db.getUserStreams(userId, 'news');
    
    res.json({
      success: true,
      data: {
        streams: newsStreams,
        count: newsStreams.length
      }
    });
  } catch (error) {
    logger.error('Error fetching news streams:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news streams'
    });
  }
});

// POST /api/news/streams - Create a new news stream
router.post('/streams', async (req, res) => {
  try {
    const { userId } = req.user;
    const { title, description, category, priority, frequency, newsConfig } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    // Create the stream with news focus
    const streamData = {
      userId,
      title,
      description,
      category,
      priority: priority || 'medium',
      frequency,
      focusType: 'news'
    };

    const stream = await req.app.locals.db.createStream(streamData);
    
    // Create news stream configuration
    if (newsConfig) {
      await req.app.locals.db.createNewsStreamConfig(stream.id, newsConfig);
    }

    res.json({
      success: true,
      data: stream
    });
  } catch (error) {
    logger.error('Error creating news stream:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create news stream'
    });
  }
});

// GET /api/news/alerts - Get news alerts for user
router.get('/alerts', async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 50, unreadOnly = false } = req.query;
    
    const alerts = await req.app.locals.db.getUserNewsAlerts(userId, {
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    });
    
    const unreadCount = await req.app.locals.db.getUnreadNewsAlertsCount(userId);
    
    res.json({
      success: true,
      data: {
        alerts,
        unreadCount,
        totalCount: alerts.length
      }
    });
  } catch (error) {
    logger.error('Error fetching news alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news alerts'
    });
  }
});

// PUT /api/news/alerts/:alertId/read - Mark alert as read
router.put('/alerts/:alertId/read', async (req, res) => {
  try {
    const { userId } = req.user;
    const { alertId } = req.params;
    
    await req.app.locals.db.markNewsAlertAsRead(alertId, userId);
    
    res.json({
      success: true,
      message: 'Alert marked as read'
    });
  } catch (error) {
    logger.error('Error marking alert as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark alert as read'
    });
  }
});

// POST /api/news/streams/:streamId/update - Trigger manual news update
router.post('/streams/:streamId/update', async (req, res) => {
  try {
    const { userId } = req.user;
    const { streamId } = req.params;
    
    // Verify stream ownership and focus type
    const stream = await req.app.locals.db.getStreamById(streamId);
    if (!stream || stream.user_id !== userId || stream.focus_type !== 'news') {
      return res.status(404).json({
        success: false,
        error: 'News stream not found'
      });
    }
    
    // Trigger news update
    const newsletter = await req.app.locals.newsService.triggerNewsUpdate(streamId, userId);
    
    if (!newsletter) {
      return res.json({
        success: true,
        message: 'No new content found'
      });
    }
    
    res.json({
      success: true,
      data: newsletter
    });
  } catch (error) {
    logger.error('Error triggering news update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger news update'
    });
  }
});

// PUT /api/news/streams/:streamId/config - Update news stream configuration
router.put('/streams/:streamId/config', async (req, res) => {
  try {
    const { userId } = req.user;
    const { streamId } = req.params;
    const { newsConfig } = req.body;
    
    // Verify stream ownership and focus type
    const stream = await req.app.locals.db.getStreamById(streamId);
    if (!stream || stream.user_id !== userId || stream.focus_type !== 'news') {
      return res.status(404).json({
        success: false,
        error: 'News stream not found'
      });
    }
    
    // Update news configuration
    await req.app.locals.db.updateNewsStreamConfig(streamId, newsConfig);
    
    res.json({
      success: true,
      message: 'News stream configuration updated'
    });
  } catch (error) {
    logger.error('Error updating news stream config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update news stream configuration'
    });
  }
});

// GET /api/news/trending - Get trending topics
router.get('/trending', async (req, res) => {
  try {
    const { category = 'general', limit = 10 } = req.query;
    
    // This would integrate with news APIs to get trending topics
    // For now, return mock data
    const trendingTopics = [
      { topic: 'AI Technology Breakthrough', relevance: 0.95, mentions: 1250 },
      { topic: 'Climate Change Summit', relevance: 0.89, mentions: 980 },
      { topic: 'Market Volatility', relevance: 0.82, mentions: 750 },
      { topic: 'Space Exploration', relevance: 0.78, mentions: 620 },
      { topic: 'Cybersecurity Alert', relevance: 0.75, mentions: 580 }
    ];
    
    res.json({
      success: true,
      data: {
        trends: trendingTopics.slice(0, parseInt(limit)),
        category,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error fetching trending topics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending topics'
    });
  }
});

// GET /api/news/sources - Get available news sources
router.get('/sources', async (req, res) => {
  try {
    const { category = 'all' } = req.query;
    
    const sources = await req.app.locals.db.getContentSources('news', category);
    
    res.json({
      success: true,
      data: {
        sources,
        count: sources.length
      }
    });
  } catch (error) {
    logger.error('Error fetching news sources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news sources'
    });
  }
});

module.exports = router; 