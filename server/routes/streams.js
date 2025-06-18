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
  body('color').optional().isIn(['emerald', 'blue', 'purple', 'orange'])
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
      ...req.body,
      userId: req.user.id
    };
    
    const stream = await databaseService.createStream(streamData);
    
    res.status(201).json({
      message: 'Stream created successfully',
      stream
    });
  } catch (error) {
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