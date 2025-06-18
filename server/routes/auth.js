const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Note: Authentication is now handled entirely by Supabase on the frontend
// These routes are kept for backward compatibility and server-side operations

// GET /api/auth/verify-token - For server-side token verification
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const supabaseService = req.app.get('services').supabase;
    const user = await supabaseService.verifyToken(token);
    
    res.json({
      message: 'Token is valid',
      user
    });
  } catch (error) {
    res.status(401).json({ 
      error: error.message || 'Invalid token' 
    });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const supabaseService = req.app.get('services').supabase;
    const token = req.headers.authorization;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await supabaseService.verifyToken(token);
    res.json({ user });
  } catch (error) {
    res.status(401).json({ 
      error: error.message || 'Invalid token' 
    });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const authService = req.app.get('services').auth;
    const token = req.headers.authorization;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const result = await authService.refreshToken(token);
    
    res.json({
      message: 'Token refreshed successfully',
      user: result.user,
      token: result.token
    });
  } catch (error) {
    res.status(401).json({ 
      error: error.message || 'Token refresh failed' 
    });
  }
});

// POST /api/auth/change-password
router.post('/change-password', [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const authService = req.app.get('services').auth;
    const token = req.headers.authorization;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const { currentPassword, newPassword } = req.body;
    
    const result = await authService.changePassword(user.id, currentPassword, newPassword);
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ 
      error: error.message || 'Password change failed' 
    });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const authService = req.app.get('services').auth;
    const emailService = req.app.get('services').email;
    
    const { email } = req.body;
    const result = await authService.resetPassword(email);
    
    // Send reset email if user exists
    if (result.resetToken && emailService.isInitialized()) {
      // Get user to send personalized email
      const databaseService = req.app.get('services').database;
      const user = await databaseService.getUserByEmail(email);
      
      if (user) {
        await emailService.sendPasswordResetEmail(email, user.name, result.resetToken);
      }
    }
    
    res.json({
      message: result.message
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message || 'Password reset failed' 
    });
  }
});

// POST /api/auth/reset-password-confirm
router.post('/reset-password-confirm', [
  body('token').notEmpty(),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const authService = req.app.get('services').auth;
    const { token, newPassword } = req.body;
    
    const result = await authService.resetPasswordWithToken(token, newPassword);
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ 
      error: error.message || 'Password reset confirmation failed' 
    });
  }
});

// PUT /api/auth/profile
router.put('/profile', [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('preferences').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const authService = req.app.get('services').auth;
    const token = req.headers.authorization;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await authService.verifyToken(token);
    const updatedUser = await authService.updateUserProfile(user.id, req.body);
    
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message || 'Profile update failed' 
    });
  }
});

module.exports = router; 