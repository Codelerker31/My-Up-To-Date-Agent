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

// GET /api/chat/streams/:streamId/messages - Get messages for a stream
router.get('/streams/:streamId/messages', async (req, res) => {
  try {
    const databaseService = req.app.get('services').database;
    
    // Verify user owns the stream
    const stream = await databaseService.getStreamById(req.params.streamId);
    if (!stream || stream.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const messages = await databaseService.getStreamMessages(req.params.streamId, limit);
    
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ 
      error: error.message || 'Failed to fetch messages' 
    });
  }
});

// GET /api/chat/streams/:streamId/latest - Get latest message for a stream
router.get('/streams/:streamId/latest', async (req, res) => {
  try {
    const databaseService = req.app.get('services').database;
    
    // Verify user owns the stream
    const stream = await databaseService.getStreamById(req.params.streamId);
    if (!stream || stream.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const messages = await databaseService.getStreamMessages(req.params.streamId, 1);
    const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    
    res.json({ message: latestMessage });
  } catch (error) {
    res.status(500).json({ 
      error: error.message || 'Failed to fetch latest message' 
    });
  }
});

module.exports = router; 