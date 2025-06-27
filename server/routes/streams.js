const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Middleware to require authentication for all stream routes
router.use(async (req, res, next) => {
  try {
    const authService = req.app.get('services').auth;
    const token = req.headers.authorization;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// GET /api/streams - Get all streams for the authenticated user
router.get('/', async (req, res) => {
  try {
    const databaseService = req.app.get('services').database;
    const streams = await databaseService.getUserStreams(req.user.id);
    
    res.json({ streams });
  } catch (error) {
    res.status(500).json({ 
      error: error.message || 'Failed to fetch streams' 
    });
  }
});

// GET /api/streams/:id - Get a specific stream
router.get('/:id', async (req, res) => {
  try {
    const databaseService = req.app.get('services').database;
    const stream = await databaseService.getStreamById(req.params.id);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    // Check if stream belongs to user
    if (stream.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ stream });
  } catch (error) {
    res.status(500).json({ 
      error: error.message || 'Failed to fetch stream' 
    });
  }
});

// POST /api/streams - Create a new stream
router.post('/', [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('category').optional().trim().isLength({ max: 50 }),
  body('priority').optional().isIn(['high', 'medium', 'low']),
  body('color').optional().isIn(['emerald', 'blue', 'purple', 'orange']),
  body('focusType').isIn(['news', 'research']).withMessage('Focus type must be either news or research'),
  body('frequency').optional().isIn(['daily', 'weekly', 'bi-weekly', 'monthly']),
  body('dayOfWeek').optional().isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  body('time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Time must be in HH:MM format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const databaseService = req.app.get('services').database;
    
    const streamData = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      priority: req.body.priority || 'medium',
      color: req.body.color || 'blue',
      focus_type: req.body.focusType,
      frequency: req.body.frequency,
      day_of_week: req.body.dayOfWeek,
      schedule_time: req.body.time,
      is_active: req.body.is_active !== false,
      user_id: req.user.id
    };
    
    const stream = await databaseService.createStream(streamData);
    
    // Create focus-specific configuration
    if (req.body.focusType === 'news' && req.body.newsConfig) {
      await databaseService.createNewsStreamConfig(stream.id, req.body.newsConfig);
    } else if (req.body.focusType === 'research' && req.body.researchConfig) {
      await databaseService.createResearchProjectConfig(stream.id, req.body.researchConfig);
    }
    
    res.status(201).json({
      message: 'Stream created successfully',
      stream
    });
  } catch (error) {
    console.error('Error creating stream:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create stream' 
    });
  }
});

// POST /api/streams/:id/research - Trigger manual research
router.post('/:id/research', async (req, res) => {
  try {
    const databaseService = req.app.get('services').database;
    const researchService = req.app.get('services').research;
    
    const stream = await databaseService.getStreamById(req.params.id);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    // Check if stream belongs to user
    if (stream.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Trigger manual research
    const newsletter = await researchService.triggerManualResearch(req.params.id, req.user.id);
    
    res.json({
      message: 'Research triggered successfully',
      newsletter
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message || 'Failed to trigger research' 
    });
  }
});

module.exports = router; 