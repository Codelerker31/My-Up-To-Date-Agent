const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class SupabaseService {
  constructor() {
    this.supabase = null;
    this.connected = false;
  }

  async initialize() {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
      }

      this.supabase = createClient(supabaseUrl, supabaseServiceKey);
      this.connected = true;
      
      logger.info('Connected to Supabase');
    } catch (error) {
      logger.error('Failed to initialize Supabase:', error);
      throw error;
    }
  }

  // Authentication methods
  async verifyToken(token) {
    try {
      const cleanToken = token.replace('Bearer ', '');
      const { data: { user }, error } = await this.supabase.auth.getUser(cleanToken);
      
      if (error || !user) {
        throw new Error('Invalid token');
      }
      
      return user;
    } catch (error) {
      logger.error('Token verification failed:', error);
      throw error;
    }
  }

  // Stream operations
  async createStream(streamData) {
    try {
      const { data, error } = await this.supabase
        .from('streams')
        .insert({
          id: uuidv4(),
          user_id: streamData.user_id,
          title: streamData.title,
          description: streamData.description,
          category: streamData.category,
          priority: streamData.priority || 'medium',
          color: streamData.color || 'blue',
          focus_type: streamData.focus_type,
          frequency: streamData.frequency,
          day_of_week: streamData.day_of_week,
          schedule_time: streamData.schedule_time,
          is_active: streamData.is_active !== false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating stream:', error);
      throw error;
    }
  }

  async getStreamById(id) {
    try {
      const { data, error } = await this.supabase
        .from('streams')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      return data;
    } catch (error) {
      logger.error('Error fetching stream:', error);
      throw error;
    }
  }

  async getUserStreams(userId, focusType = null) {
    try {
      let query = this.supabase
        .from('streams')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (focusType) {
        query = query.eq('focus_type', focusType);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform data to match frontend expectations
      return data.map(stream => ({
        id: stream.id,
        title: stream.title,
        description: stream.description,
        category: stream.category,
        priority: stream.priority,
        color: stream.color,
        focusType: stream.focus_type,
        frequency: stream.frequency,
        dayOfWeek: stream.day_of_week,
        time: stream.schedule_time,
        isActive: stream.is_active,
        hasNewUpdate: false, // TODO: Implement update checking logic
        lastUpdate: stream.last_update ? new Date(stream.last_update) : null,
        createdAt: new Date(stream.created_at),
        sourcesCount: stream.sources_count || 0,
        insightsCount: stream.insights_count || 0
      }));
    } catch (error) {
      logger.error('Error fetching user streams:', error);
      throw error;
    }
  }

  async updateStream(id, updates) {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('streams')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating stream:', error);
      throw error;
    }
  }

  // Focus-specific configuration methods
  async createNewsStreamConfig(streamId, config) {
    try {
      const { data, error } = await this.supabase
        .from('news_streams')
        .insert({
          stream_id: streamId,
          alert_threshold: config.alert_threshold,
          source_types: config.source_types,
          breaking_news_enabled: config.breaking_news_enabled,
          trend_tracking: config.trend_tracking,
          bias_analysis_enabled: config.bias_analysis_enabled
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating news stream config:', error);
      // Don't throw error if table doesn't exist yet
      logger.warn('News stream config table may not exist yet');
      return null;
    }
  }

  async createResearchProjectConfig(streamId, config) {
    try {
      const { data, error } = await this.supabase
        .from('research_projects')
        .insert({
          stream_id: streamId,
          methodology: config.methodology,
          citation_style: config.citation_style,
          collaboration_enabled: config.collaboration_enabled,
          academic_sources_only: config.academic_sources_only,
          export_format: config.export_format
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating research project config:', error);
      // Don't throw error if table doesn't exist yet
      logger.warn('Research project config table may not exist yet');
      return null;
    }
  }

  async getNewsStreamConfig(streamId) {
    try {
      const { data, error } = await this.supabase
        .from('news_streams')
        .select('*')
        .eq('stream_id', streamId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Error fetching news stream config:', error);
      return null;
    }
  }

  async getResearchProjectConfig(streamId) {
    try {
      const { data, error } = await this.supabase
        .from('research_projects')
        .select('*')
        .eq('stream_id', streamId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Error fetching research project config:', error);
      return null;
    }
  }

  // Message operations
  async createMessage(messageData) {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .insert({
          id: uuidv4(),
          stream_id: messageData.streamId,
          user_id: messageData.userId,
          type: messageData.type,
          content: messageData.content,
          metadata: messageData.metadata ? JSON.stringify(messageData.metadata) : null,
          message_timestamp: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return {
        id: data.id,
        streamId: data.stream_id,
        userId: data.user_id,
        type: data.type,
        content: data.content,
        metadata: data.metadata ? JSON.parse(data.metadata) : null,
        timestamp: data.message_timestamp
      };
    } catch (error) {
      logger.error('Error creating message:', error);
      throw error;
    }
  }

  async getStreamMessages(streamId, limit = 50) {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('stream_id', streamId)
        .order('message_timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      return data.map(msg => ({
        id: msg.id,
        streamId: msg.stream_id,
        userId: msg.user_id,
        type: msg.type,
        content: msg.content,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
        timestamp: msg.message_timestamp
      }));
    } catch (error) {
      logger.error('Error fetching stream messages:', error);
      throw error;
    }
  }

  // Newsletter operations
  async createNewsletter(newsletterData) {
    try {
      const { data, error } = await this.supabase
        .from('newsletters')
        .insert({
          id: uuidv4(),
          stream_id: newsletterData.streamId,
          user_id: newsletterData.userId,
          title: newsletterData.title,
          summary: newsletterData.summary,
          content: newsletterData.content,
          sources: newsletterData.sources ? JSON.stringify(newsletterData.sources) : null,
          key_insights: newsletterData.keyInsights ? JSON.stringify(newsletterData.keyInsights) : null,
          confidence: newsletterData.confidence,
          is_automated: newsletterData.isAutomated || false,
          report_number: newsletterData.reportNumber || 1,
          generated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating newsletter:', error);
      throw error;
    }
  }

  async getLatestNewsletter(streamId) {
    try {
      const { data, error } = await this.supabase
        .from('newsletters')
        .select('*')
        .eq('stream_id', streamId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Error fetching latest newsletter:', error);
      return null;
    }
  }

  // Scheduled task operations
  async createScheduledTask(taskData) {
    try {
      const { data, error } = await this.supabase
        .from('scheduled_tasks')
        .insert({
          id: uuidv4(),
          stream_id: taskData.streamId,
          user_id: taskData.userId,
          task_type: taskData.taskType,
          frequency: taskData.frequency,
          day_of_week: taskData.dayOfWeek,
          schedule_time: taskData.time,
          next_run: taskData.nextRun,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating scheduled task:', error);
      throw error;
    }
  }

  async updateScheduledTask(id, updates) {
    try {
      const { data, error } = await this.supabase
        .from('scheduled_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating scheduled task:', error);
      throw error;
    }
  }

  // News alerts operations
  async markNewsAlertAsRead(alertId, userId) {
    try {
      const { data, error } = await this.supabase
        .from('news_alerts')
        .update({ is_read: true })
        .eq('id', alertId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error marking news alert as read:', error);
      return null;
    }
  }

  // Utility methods
  isConnected() {
    return this.connected && this.supabase !== null;
  }

  async close() {
    // Supabase client doesn't need explicit closing
    this.connected = false;
    logger.info('Supabase connection closed');
  }
}

module.exports = SupabaseService; 