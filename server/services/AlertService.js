const logger = require('../utils/logger');

class AlertService {
  constructor(databaseService, emailService, socketIo) {
    this.db = databaseService;
    this.email = emailService;
    this.io = socketIo;
    this.alertThresholds = {
      low: 3,
      normal: 5,
      high: 7,
      critical: 9
    };
    
    // Real-time monitoring intervals
    this.monitoringIntervals = new Map();
    this.isMonitoring = false;
  }

  async initialize() {
    try {
      logger.info('Alert service initializing...');
      await this.startRealTimeMonitoring();
      logger.info('Alert service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize alert service:', error);
      throw error;
    }
  }

  async startRealTimeMonitoring() {
    if (this.isMonitoring) {
      logger.warn('Real-time monitoring already running');
      return;
    }

    this.isMonitoring = true;
    
    // Monitor news streams every 5 minutes
    const monitoringInterval = setInterval(async () => {
      try {
        await this.checkAllNewsStreams();
      } catch (error) {
        logger.error('Error in real-time monitoring:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    this.monitoringIntervals.set('news-monitoring', monitoringInterval);
    logger.info('Real-time news monitoring started');
  }

  async stopRealTimeMonitoring() {
    this.isMonitoring = false;
    
    for (const [name, interval] of this.monitoringIntervals) {
      clearInterval(interval);
      logger.info(`Stopped monitoring: ${name}`);
    }
    
    this.monitoringIntervals.clear();
  }

  async checkAllNewsStreams() {
    try {
      // Get all active news streams with real-time alerts enabled
      const newsStreams = await this.db.getActiveNewsStreamsWithAlerts();
      
      for (const stream of newsStreams) {
        await this.checkStreamForBreakingNews(stream);
      }
    } catch (error) {
      logger.error('Error checking news streams:', error);
    }
  }

  async checkStreamForBreakingNews(stream) {
    try {
      const newsConfig = await this.db.getNewsStreamConfig(stream.id);
      
      if (!newsConfig?.real_time_alerts) {
        return; // Real-time alerts not enabled for this stream
      }

      // Get latest articles for this stream topic
      const cutoffTime = new Date(Date.now() - 30 * 60 * 1000); // Last 30 minutes
      const recentArticles = await this.searchRecentNews(stream.title, cutoffTime);
      
      // Analyze for breaking news
      const breakingNews = this.identifyBreakingNews(recentArticles, newsConfig);
      
      if (breakingNews.length > 0) {
        await this.sendBreakingNewsAlerts(stream, breakingNews);
      }
    } catch (error) {
      logger.error(`Error checking stream ${stream.id} for breaking news:`, error);
    }
  }

  async searchRecentNews(topic, cutoffTime) {
    try {
      // This would integrate with news APIs
      // For now, return mock breaking news data
      const mockBreakingNews = [
        {
          title: `BREAKING: Major development in ${topic}`,
          content: `Urgent update regarding ${topic} has just been reported by multiple sources.`,
          source: 'Reuters',
          url: 'https://example.com/breaking-news',
          publishedAt: new Date().toISOString(),
          urgency: 'high',
          credibilityScore: 0.95
        }
      ];
      
      return mockBreakingNews;
    } catch (error) {
      logger.error('Error searching recent news:', error);
      return [];
    }
  }

  identifyBreakingNews(articles, newsConfig) {
    const breakingKeywords = [
      'breaking', 'urgent', 'alert', 'developing', 'live',
      'just in', 'confirmed', 'emergency', 'critical'
    ];

    return articles.filter(article => {
      // Check for breaking keywords
      const titleLower = article.title.toLowerCase();
      const hasBreakingKeywords = breakingKeywords.some(keyword => 
        titleLower.includes(keyword)
      );

      // Check urgency level
      const meetsUrgencyThreshold = article.urgency === 'high' || article.urgency === 'critical';
      
      // Check credibility score
      const meetsCredibilityThreshold = article.credibilityScore >= 0.8;
      
      // Check if it meets the alert threshold
      const importanceScore = this.calculateImportanceScore(article);
      const meetsAlertThreshold = importanceScore >= (newsConfig.alert_threshold || 5);

      return hasBreakingKeywords && meetsUrgencyThreshold && 
             meetsCredibilityThreshold && meetsAlertThreshold;
    });
  }

  calculateImportanceScore(article) {
    let score = 5; // Base score
    
    // Boost for high credibility
    if (article.credibilityScore > 0.9) score += 2;
    else if (article.credibilityScore > 0.8) score += 1;
    
    // Boost for urgency
    if (article.urgency === 'critical') score += 3;
    else if (article.urgency === 'high') score += 2;
    else if (article.urgency === 'medium') score += 1;
    
    // Boost for premium sources
    const premiumSources = ['Reuters', 'Associated Press', 'BBC', 'CNN'];
    if (premiumSources.includes(article.source)) score += 1;
    
    return Math.min(10, score); // Cap at 10
  }

  async sendBreakingNewsAlerts(stream, breakingNews) {
    try {
      const user = await this.db.getUserById(stream.user_id);
      
      for (const article of breakingNews) {
        // Create alert in database
        const alert = await this.db.createNewsAlert({
          news_stream_id: stream.id,
          user_id: stream.user_id,
          title: `🚨 ${article.title}`,
          content: article.content,
          source_url: article.url,
          importance_score: this.calculateImportanceScore(article),
          alert_type: 'breaking'
        });

        // Send real-time notification via WebSocket
        this.io.to(`user-${stream.user_id}`).emit('breaking-news-alert', {
          alert,
          stream: {
            id: stream.id,
            title: stream.title
          },
          article
        });

        // Send email notification if enabled
        if (user.preferences?.emailNotifications) {
          await this.sendEmailAlert(user, stream, article);
        }

        logger.info(`Sent breaking news alert for stream ${stream.id}: ${article.title}`);
      }
    } catch (error) {
      logger.error('Error sending breaking news alerts:', error);
    }
  }

  async sendEmailAlert(user, stream, article) {
    try {
      const subject = `🚨 Breaking News Alert: ${stream.title}`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🚨 Breaking News Alert</h1>
          </div>
          
          <div style="padding: 20px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-top: 0;">${article.title}</h2>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 0; line-height: 1.6;">${article.content}</p>
            </div>
            
            <div style="margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Source:</strong> ${article.source}</p>
              <p style="margin: 5px 0;"><strong>Stream:</strong> ${stream.title}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${article.url}" 
                 style="background: #2563eb; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Read Full Article
              </a>
            </div>
          </div>
          
          <div style="padding: 15px; background: #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This alert was sent by Your Updates Agent for the "${stream.title}" news stream.</p>
            <p>To manage your alert preferences, visit your dashboard.</p>
          </div>
        </div>
      `;

      await this.email.sendEmail({
        to: user.email,
        subject,
        html: htmlContent
      });
    } catch (error) {
      logger.error('Error sending email alert:', error);
    }
  }

  async createCustomAlert(userId, streamId, alertConfig) {
    try {
      // Validate stream ownership
      const stream = await this.db.getStreamById(streamId);
      if (!stream || stream.user_id !== userId) {
        throw new Error('Stream not found or access denied');
      }

      // Create custom alert configuration
      const customAlert = await this.db.createCustomAlert({
        user_id: userId,
        stream_id: streamId,
        trigger_keywords: alertConfig.keywords,
        importance_threshold: alertConfig.threshold,
        notification_methods: alertConfig.methods, // email, push, sms
        is_active: true
      });

      logger.info(`Created custom alert for user ${userId}, stream ${streamId}`);
      return customAlert;
    } catch (error) {
      logger.error('Error creating custom alert:', error);
      throw error;
    }
  }

  async updateAlertSettings(userId, streamId, settings) {
    try {
      // Update news stream alert configuration
      await this.db.updateNewsStreamConfig(streamId, {
        alert_threshold: settings.threshold,
        real_time_alerts: settings.realTimeEnabled,
        breaking_news_enabled: settings.breakingNewsEnabled,
        max_articles_per_hour: settings.maxArticlesPerHour
      });

      logger.info(`Updated alert settings for stream ${streamId}`);
    } catch (error) {
      logger.error('Error updating alert settings:', error);
      throw error;
    }
  }

  async getAlertHistory(userId, options = {}) {
    try {
      const { limit = 50, streamId, alertType, unreadOnly } = options;
      
      const alerts = await this.db.getUserNewsAlerts(userId, {
        limit,
        streamId,
        alertType,
        unreadOnly
      });

      return alerts;
    } catch (error) {
      logger.error('Error getting alert history:', error);
      throw error;
    }
  }

  async markAlertAsRead(userId, alertId) {
    try {
      await this.db.markNewsAlertAsRead(alertId, userId);
      
      // Notify client via WebSocket
      this.io.to(`user-${userId}`).emit('alert-marked-read', { alertId });
      
      logger.info(`Alert ${alertId} marked as read by user ${userId}`);
    } catch (error) {
      logger.error('Error marking alert as read:', error);
      throw error;
    }
  }

  async getAlertStatistics(userId) {
    try {
      const stats = await this.db.getAlertStatistics(userId);
      
      return {
        totalAlerts: stats.total || 0,
        unreadAlerts: stats.unread || 0,
        breakingNewsAlerts: stats.breaking || 0,
        alertsLast24h: stats.recent || 0,
        mostActiveStream: stats.topStream || null
      };
    } catch (error) {
      logger.error('Error getting alert statistics:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      await this.stopRealTimeMonitoring();
      logger.info('Alert service cleaned up');
    } catch (error) {
      logger.error('Error cleaning up alert service:', error);
    }
  }
}

module.exports = AlertService; 