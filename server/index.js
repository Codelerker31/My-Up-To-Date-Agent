const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import services
const SupabaseService = require('./services/SupabaseService');
const ChatService = require('./services/ChatService');
const AIService = require('./services/AIService');
const SchedulerService = require('./services/SchedulerService');
const ResearchService = require('./services/ResearchService');
const NewsService = require('./services/NewsService');
const AlertService = require('./services/AlertService');
const EmailService = require('./services/EmailService');
const AcademicService = require('./services/AcademicService');
const CollaborationService = require('./services/CollaborationService');
const AnalyticsService = require('./services/AnalyticsService');
const ExportService = require('./services/ExportService');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const streamRoutes = require('./routes/streams');
const chatRoutes = require('./routes/chat');
const newsletterRoutes = require('./routes/newsletters');
const newsRoutes = require('./routes/news');
const alertRoutes = require('./routes/alerts');
const researchRoutes = require('./routes/research');
const academicRoutes = require('./routes/academic');
const collaborationRoutes = require('./routes/collaboration');
const analyticsRoutes = require('./routes/analytics');
const exportRoutes = require('./routes/export');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize services
const supabaseService = new SupabaseService();
const emailService = new EmailService();
const chatService = new ChatService(io, supabaseService);
const aiService = new AIService();
const researchService = new ResearchService(supabaseService, aiService);
const newsService = new NewsService(supabaseService, aiService);
const alertService = new AlertService(supabaseService, emailService, io);
const schedulerService = new SchedulerService(supabaseService, researchService, chatService);
const academicService = new AcademicService();
const collaborationService = new CollaborationService(supabaseService, io);
const analyticsService = new AnalyticsService(aiService);
const exportService = new ExportService();

// Make services available globally
app.set('services', {
  database: supabaseService, // Keep 'database' key for backward compatibility
  supabase: supabaseService,
  auth: supabaseService, // Auth is now handled by SupabaseService
  chat: chatService,
  ai: aiService,
  research: researchService,
  news: newsService,
  alert: alertService,
  scheduler: schedulerService,
  email: emailService,
  academic: academicService,
  collaboration: collaborationService,
  analytics: analyticsService,
  export: exportService
});

// Make services available to routes
app.set('academicService', academicService);
app.set('collaborationService', collaborationService);
app.set('analyticsService', analyticsService);
app.set('exportService', exportService);
app.set('databaseService', supabaseService);

// Make services available to routes via app.locals
app.locals.db = supabaseService;
app.locals.researchService = researchService;
app.locals.newsService = newsService;

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/newsletters', newsletterRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/alerts', alertRoutes(alertService, supabaseService));
app.use('/api/research', researchRoutes(researchService, supabaseService));
app.use('/api/academic', academicRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export', exportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      database: supabaseService.isConnected(),
      scheduler: schedulerService.isRunning(),
      news: newsService ? 'initialized' : 'not initialized',
      research: researchService ? 'initialized' : 'not initialized',
      academic: academicService.isInitialized ? 'initialized' : 'not initialized',
      collaboration: collaborationService.isInitialized ? 'initialized' : 'not initialized',
      analytics: analyticsService.isInitialized ? 'initialized' : 'not initialized',
      export: exportService.isInitialized ? 'initialized' : 'not initialized'
    }
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  // Handle user authentication
  socket.on('authenticate', async (token) => {
    try {
      const user = await supabaseService.verifyToken(token);
      socket.userId = user.id;
      socket.join(`user-${user.id}`);
      
      // Send user's active streams
      const streams = await supabaseService.getUserStreams(user.id);
      socket.emit('streams-updated', streams);
      
      logger.info(`User authenticated: ${user.id}`);
    } catch (error) {
      socket.emit('auth-error', { message: 'Authentication failed' });
      logger.error('Authentication error:', error);
    }
  });

  // Handle chat messages
  socket.on('send-message', async (data) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      await chatService.handleMessage(socket.userId, data.streamId, data.content, socket);
    } catch (error) {
      logger.error('Error handling message:', error);
      socket.emit('error', { message: 'Failed to process message' });
    }
  });

  // Handle stream creation (enhanced for dual focus)
  socket.on('create-stream', async (data) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const stream = await supabaseService.createStream({
        ...data,
        user_id: socket.userId,
        focus_type: data.focusType || 'research', // Default to research
        created_at: new Date()
      });
      
      // Create focus-specific configuration
      if (data.focusType === 'news' && data.newsConfig) {
        await supabaseService.createNewsStreamConfig(stream.id, data.newsConfig);
      } else if (data.focusType === 'research' && data.researchConfig) {
        await supabaseService.createResearchProjectConfig(stream.id, data.researchConfig);
      }
      
      socket.emit('stream-created', stream);
      
      // Notify chat service to start conversation for new stream
      await chatService.initializeStream(socket.userId, stream.id, socket);
    } catch (error) {
      logger.error('Error creating stream:', error);
      socket.emit('error', { message: 'Failed to create stream' });
    }
  });

  // Handle focus switching
  socket.on('switch-focus', async (data) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Get streams for the new focus
      const streams = await supabaseService.getUserStreams(socket.userId, data.focusType);
      socket.emit('focus-switched', { 
        focusType: data.focusType, 
        streams 
      });
      
      logger.info(`User ${socket.userId} switched to ${data.focusType} focus`);
    } catch (error) {
      logger.error('Error switching focus:', error);
      socket.emit('error', { message: 'Failed to switch focus' });
    }
  });

  // Handle schedule updates
  socket.on('update-schedule', async (data) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      await schedulerService.updateStreamSchedule(data.streamId, data.schedule);
      socket.emit('schedule-updated', { streamId: data.streamId, schedule: data.schedule });
    } catch (error) {
      logger.error('Error updating schedule:', error);
      socket.emit('error', { message: 'Failed to update schedule' });
    }
  });

  // Handle manual research trigger (enhanced for dual focus)
  socket.on('trigger-research', async (data) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const stream = await supabaseService.getStreamById(data.streamId);
      
      if (stream.focus_type === 'news') {
        await newsService.triggerNewsUpdate(data.streamId, socket.userId);
        socket.emit('news-update-triggered', { streamId: data.streamId });
      } else {
        await researchService.triggerManualResearch(data.streamId, socket.userId);
        socket.emit('research-triggered', { streamId: data.streamId });
      }
    } catch (error) {
      logger.error('Error triggering research/news update:', error);
      socket.emit('error', { message: 'Failed to trigger update' });
    }
  });

  // Handle news alert marking
  socket.on('mark-alert-read', async (data) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      await supabaseService.markNewsAlertAsRead(data.alertId, socket.userId);
      socket.emit('alert-marked-read', { alertId: data.alertId });
    } catch (error) {
      logger.error('Error marking alert as read:', error);
      socket.emit('error', { message: 'Failed to mark alert as read' });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Initialize services and start server
async function startServer() {
  try {
    // Supabase service is already initialized in constructor
    logger.info('Supabase service initialized');

    // Initialize NewsService
    await newsService.initialize();
    logger.info('News service initialized');

    // Initialize AlertService
    await alertService.initialize();
    logger.info('Alert service initialized');

    // Initialize Phase 3 services
    await academicService.initialize();
    logger.info('Academic service initialized');

    await collaborationService.initialize();
    logger.info('Collaboration service initialized');

    await analyticsService.initialize();
    logger.info('Analytics service initialized');

    await exportService.initialize();
    logger.info('Export service initialized');

    // Start scheduler service
    await schedulerService.start();
    logger.info('Scheduler service started');

    // Start server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Dual-focus architecture enabled: News & Research`);
      logger.info(`Phase 3 features enabled: Academic Search, Collaboration, Analytics, Export`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  
  try {
    await schedulerService.stop();
    await newsService.cleanup();
    await researchService.cleanup();
    await alertService.cleanup();
    await academicService.cleanup();
    await collaborationService.cleanup();
    await analyticsService.cleanup();
    await exportService.cleanup();
    logger.info('Services cleaned up');
    
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

startServer();

module.exports = { app, server, io }; 