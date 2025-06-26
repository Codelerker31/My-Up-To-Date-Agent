const express = require('express');
const router = express.Router();

// Alert routes for breaking news and notifications
module.exports = (alertService, authService) => {
  // Get user's alert history
  router.get('/', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { limit, streamId, alertType, unreadOnly } = req.query;
      
      const options = {
        limit: parseInt(limit) || 50,
        streamId: streamId ? parseInt(streamId) : undefined,
        alertType,
        unreadOnly: unreadOnly === 'true'
      };

      const alerts = await alertService.getAlertHistory(userId, options);
      
      res.json({
        success: true,
        alerts
      });
    } catch (error) {
      console.error('Error getting alert history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get alert history'
      });
    }
  });

  // Get alert statistics
  router.get('/statistics', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const stats = await alertService.getAlertStatistics(userId);
      
      res.json({
        success: true,
        statistics: stats
      });
    } catch (error) {
      console.error('Error getting alert statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get alert statistics'
      });
    }
  });

  // Mark alert as read
  router.put('/:alertId/read', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const alertId = parseInt(req.params.alertId);
      
      await alertService.markAlertAsRead(userId, alertId);
      
      res.json({
        success: true,
        message: 'Alert marked as read'
      });
    } catch (error) {
      console.error('Error marking alert as read:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark alert as read'
      });
    }
  });

  // Create custom alert for a stream
  router.post('/custom', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { streamId, keywords, threshold, methods } = req.body;

      if (!streamId || !keywords || !threshold || !methods) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: streamId, keywords, threshold, methods'
        });
      }

      const alertConfig = {
        keywords: Array.isArray(keywords) ? keywords : [keywords],
        threshold: parseInt(threshold),
        methods: Array.isArray(methods) ? methods : [methods]
      };

      const customAlert = await alertService.createCustomAlert(userId, streamId, alertConfig);
      
      res.json({
        success: true,
        alert: customAlert,
        message: 'Custom alert created successfully'
      });
    } catch (error) {
      console.error('Error creating custom alert:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create custom alert'
      });
    }
  });

  // Update alert settings for a stream
  router.put('/settings/:streamId', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const streamId = parseInt(req.params.streamId);
      const { threshold, realTimeEnabled, breakingNewsEnabled, maxArticlesPerHour } = req.body;

      const settings = {
        threshold: threshold !== undefined ? parseInt(threshold) : undefined,
        realTimeEnabled: realTimeEnabled !== undefined ? realTimeEnabled : undefined,
        breakingNewsEnabled: breakingNewsEnabled !== undefined ? breakingNewsEnabled : undefined,
        maxArticlesPerHour: maxArticlesPerHour !== undefined ? parseInt(maxArticlesPerHour) : undefined
      };

      // Remove undefined values
      Object.keys(settings).forEach(key => {
        if (settings[key] === undefined) {
          delete settings[key];
        }
      });

      await alertService.updateAlertSettings(userId, streamId, settings);
      
      res.json({
        success: true,
        message: 'Alert settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating alert settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update alert settings'
      });
    }
  });

  // Get breaking news alerts (real-time endpoint)
  router.get('/breaking', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { limit = 10 } = req.query;
      
      const alerts = await alertService.getAlertHistory(userId, {
        limit: parseInt(limit),
        alertType: 'breaking',
        unreadOnly: true
      });
      
      res.json({
        success: true,
        breakingAlerts: alerts
      });
    } catch (error) {
      console.error('Error getting breaking news alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get breaking news alerts'
      });
    }
  });

  // Test alert system (development endpoint)
  router.post('/test', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { streamId, alertType = 'test' } = req.body;

      if (!streamId) {
        return res.status(400).json({
          success: false,
          error: 'streamId is required for test alert'
        });
      }

      // Create a test alert
      const testArticle = {
        title: 'TEST: Breaking News Alert System',
        content: 'This is a test alert to verify the alert system is working correctly.',
        source: 'Alert System Test',
        url: 'https://example.com/test-alert',
        publishedAt: new Date().toISOString(),
        urgency: 'high',
        credibilityScore: 1.0
      };

      // Get stream information
      const stream = { id: streamId, title: 'Test Stream', user_id: userId };
      
      // Send test alert
      await alertService.sendBreakingNewsAlerts(stream, [testArticle]);
      
      res.json({
        success: true,
        message: 'Test alert sent successfully'
      });
    } catch (error) {
      console.error('Error sending test alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send test alert'
      });
    }
  });

  // Get alert configuration for a stream
  router.get('/config/:streamId', authService.authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const streamId = parseInt(req.params.streamId);
      
      // This would get the alert configuration from database
      // For now, return default configuration
      const defaultConfig = {
        streamId,
        alertThreshold: 5,
        realTimeAlerts: true,
        breakingNewsEnabled: true,
        maxArticlesPerHour: 10,
        notificationMethods: ['email', 'push'],
        keywords: [],
        isActive: true
      };
      
      res.json({
        success: true,
        config: defaultConfig
      });
    } catch (error) {
      console.error('Error getting alert configuration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get alert configuration'
      });
    }
  });

  return router;
}; 