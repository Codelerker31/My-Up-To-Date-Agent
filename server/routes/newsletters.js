const express = require('express');
const router = express.Router();

// Middleware to require authentication
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

// GET /api/newsletters/:id - Get a specific newsletter
router.get('/:id', async (req, res) => {
  try {
    const databaseService = req.app.get('services').database;
    const newsletter = await databaseService.getNewsletterById(req.params.id);
    
    if (!newsletter) {
      return res.status(404).json({ error: 'Newsletter not found' });
    }
    
    // Verify user has access to this newsletter
    const stream = await databaseService.getStreamById(newsletter.stream_id);
    if (!stream || stream.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ newsletter });
  } catch (error) {
    res.status(500).json({ 
      error: error.message || 'Failed to fetch newsletter' 
    });
  }
});

// GET /api/newsletters/streams/:streamId - Get newsletters for a stream
router.get('/streams/:streamId', async (req, res) => {
  try {
    const databaseService = req.app.get('services').database;
    
    // Verify user owns the stream
    const stream = await databaseService.getStreamById(req.params.streamId);
    if (!stream || stream.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const newsletters = await databaseService.getStreamNewsletters(req.params.streamId);
    
    res.json({ newsletters });
  } catch (error) {
    res.status(500).json({ 
      error: error.message || 'Failed to fetch newsletters' 
    });
  }
});

// GET /api/newsletters/streams/:streamId/latest - Get latest newsletter for a stream
router.get('/streams/:streamId/latest', async (req, res) => {
  try {
    const databaseService = req.app.get('services').database;
    
    // Verify user owns the stream
    const stream = await databaseService.getStreamById(req.params.streamId);
    if (!stream || stream.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const newsletter = await databaseService.getLatestNewsletter(req.params.streamId);
    
    res.json({ newsletter });
  } catch (error) {
    res.status(500).json({ 
      error: error.message || 'Failed to fetch latest newsletter' 
    });
  }
});

module.exports = router; 