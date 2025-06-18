const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class ChatService {
  constructor(io, databaseService) {
    this.io = io;
    this.db = databaseService;
    this.activeConnections = new Map(); // userId -> socket
  }

  async handleMessage(userId, streamId, content, socket) {
    try {
      // Store user message
      const userMessage = await this.db.createMessage({
        streamId,
        userId,
        type: 'user',
        content,
        metadata: { timestamp: new Date().toISOString() }
      });

      // Emit user message
      this.io.to(`user-${userId}`).emit('message', {
        id: userMessage.id,
        type: 'user',
        content,
        timestamp: userMessage.timestamp,
        streamId
      });

      // Process with AI and respond
      await this.processUserMessage(userId, streamId, content, socket);

    } catch (error) {
      logger.error('Error in ChatService.handleMessage:', error);
      socket.emit('error', { message: 'Failed to process message' });
    }
  }

  async processUserMessage(userId, streamId, content, socket) {
    // Simple intent detection for now
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('pause') || lowerContent.includes('stop')) {
      await this.handlePauseRequest(userId, streamId, socket);
    } else if (lowerContent.includes('resume') || lowerContent.includes('start')) {
      await this.handleResumeRequest(userId, streamId, socket);
    } else if (this.isScheduleResponse(content)) {
      await this.handleScheduleResponse(userId, streamId, content, socket);
    } else {
      await this.handleGeneralMessage(userId, streamId, content, socket);
    }
  }

  async handleScheduleResponse(userId, streamId, content, socket) {
    const schedule = this.parseScheduleFromMessage(content);
    
    if (schedule) {
      // Update stream with schedule
      await this.db.updateStream(streamId, {
        frequency: schedule.frequency,
        day_of_week: schedule.dayOfWeek,
        time: schedule.time,
        is_active: true
      });

      const confirmationMessage = `Perfect! I've set up automated ${schedule.frequency} updates for your topic. I'll start researching and deliver your first newsletter shortly.`;
      
      await this.sendAgentMessage(userId, streamId, socket, confirmationMessage, {
        type: 'schedule_confirmation',
        schedule
      });

      // Trigger initial research
      setTimeout(() => this.triggerInitialResearch(streamId, userId), 2000);
    } else {
      await this.sendAgentMessage(userId, streamId, socket, 
        'I need clarification on your preferred schedule. Would you like daily, weekly, bi-weekly, or monthly updates?');
    }
  }

  async handleGeneralMessage(userId, streamId, content, socket) {
    // Check if this looks like a new topic request
    if (this.isNewTopicRequest(content)) {
      await this.handleNewTopicRequest(userId, streamId, content, socket);
    } else {
      // General conversational response
      const response = this.generateContextualResponse(content);
      await this.sendAgentMessage(userId, streamId, socket, response);
    }
  }

  async handleNewTopicRequest(userId, streamId, content, socket) {
    // Extract topic from message
    const topic = this.extractTopicFromMessage(content);
    
    // Update stream with topic
    await this.db.updateStream(streamId, {
      title: topic,
      description: content
    });

    const response = `Great! I'll help you stay updated on "${topic}". How often would you like me to research and deliver updates? I recommend:
    
- Daily (for fast-moving topics like news or stocks)
- Weekly (for most topics - good balance of freshness and depth)  
- Bi-weekly (for slower-moving subjects)
- Monthly (for long-term trends)

What frequency works best for you?`;

    await this.sendAgentMessage(userId, streamId, socket, response, {
      type: 'schedule_request',
      scheduleOptions: ['daily', 'weekly', 'bi-weekly', 'monthly']
    });
  }

  async sendAgentMessage(userId, streamId, socket, content, metadata = {}) {
    try {
      const message = await this.db.createMessage({
        streamId,
        userId,
        type: metadata.type || 'agent',
        content,
        metadata: { ...metadata, timestamp: new Date().toISOString() }
      });

      this.io.to(`user-${userId}`).emit('message', {
        id: message.id,
        type: metadata.type || 'agent',
        content,
        timestamp: message.timestamp,
        streamId,
        metadata: message.metadata
      });

      return message;
    } catch (error) {
      logger.error('Error sending agent message:', error);
      throw error;
    }
  }

  async initializeStream(userId, streamId, socket) {
    const welcomeMessage = `Hello! I'm your Updates Agent. I can help you stay continuously informed on any topic through automated research and scheduled newsletters. What would you like me to research and how often should I update you?`;
    
    await this.sendAgentMessage(userId, streamId, socket, welcomeMessage);
  }

  async triggerInitialResearch(streamId, userId) {
    // Placeholder for triggering research - will be implemented with ResearchService
    logger.info(`Triggering initial research for stream ${streamId}`);
  }

  // Utility methods for message processing
  isNewTopicRequest(content) {
    const lowerContent = content.toLowerCase();
    const topicIndicators = [
      'want to', 'research', 'track', 'monitor', 'follow', 'stay updated',
      'keep me informed', 'learn about', 'watch for', 'news about',
      'developments in', 'breakthroughs', 'advances'
    ];
    return topicIndicators.some(indicator => lowerContent.includes(indicator));
  }

  isScheduleResponse(content) {
    const lowerContent = content.toLowerCase();
    return lowerContent.includes('daily') || lowerContent.includes('weekly') || 
           lowerContent.includes('monthly') || lowerContent.includes('bi-weekly');
  }

  extractTopicFromMessage(message) {
    // Simple extraction - in production, would use AI
    const cleaned = message.replace(/^(i want to|please|can you|help me|i'd like to)\s*/i, '')
                          .replace(/(track|monitor|research|follow|stay updated on|learn about)\s*/i, '')
                          .trim();
    return cleaned.substring(0, 100);
  }

  parseScheduleFromMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    let frequency = null;
    if (lowerMessage.includes('daily')) {
      frequency = 'daily';
    } else if (lowerMessage.includes('weekly')) {
      frequency = 'weekly';
    } else if (lowerMessage.includes('bi-weekly') || lowerMessage.includes('biweekly')) {
      frequency = 'bi-weekly';
    } else if (lowerMessage.includes('monthly')) {
      frequency = 'monthly';
    }

    if (!frequency) return null;

    return {
      frequency,
      dayOfWeek: frequency === 'weekly' ? 'monday' : null,
      time: '09:00'
    };
  }

  generateContextualResponse(content) {
    // Simple response generator - in production, would use AI
    const responses = [
      "I understand. Could you provide more details about what you'd like me to help you with?",
      "That's interesting! How can I assist you with automated research and updates?",
      "I'm here to help you stay informed. What topic would you like me to research for you?",
      "Tell me more about what you'd like to track or monitor, and I'll set up automated updates for you."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async handlePauseRequest(userId, streamId, socket) {
    await this.db.updateStream(streamId, { is_active: false });
    await this.sendAgentMessage(userId, streamId, socket, 
      'I\'ve paused your automated updates. You can resume them anytime by saying "resume updates".');
  }

  async handleResumeRequest(userId, streamId, socket) {
    await this.db.updateStream(streamId, { is_active: true });
    await this.sendAgentMessage(userId, streamId, socket, 
      'I\'ve resumed your automated updates. I\'ll continue monitoring and delivering newsletters on schedule.');
  }

  // Track active connections
  addConnection(userId, socket) {
    this.activeConnections.set(userId, socket);
  }

  removeConnection(userId) {
    this.activeConnections.delete(userId);
  }

  getActiveConnection(userId) {
    return this.activeConnections.get(userId);
  }

  isUserOnline(userId) {
    return this.activeConnections.has(userId);
  }
}

module.exports = ChatService; 