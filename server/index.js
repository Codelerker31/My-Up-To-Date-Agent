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
const EmailService = require('./services/EmailService');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const streamRoutes = require('./routes/streams');
const chatRoutes = require('./routes/chat');
const newsletterRoutes = require('./routes/newsletters');

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
const chatService = new ChatService(io, supabaseService);
const aiService = new AIService();
const researchService = new ResearchService(supabaseService, aiService);
const schedulerService = new SchedulerService(supabaseService, researchService, chatService);
const emailService = new EmailService();

// Make services available globally
app.set('services', {
  database: supabaseService, // Keep 'database' key for backward compatibility
  supabase: supabaseService,
  auth: supabaseService, // Auth is now handled by SupabaseService
  chat: chatService,
  ai: aiService,
  research: researchService,
  scheduler: schedulerService,
  email: emailService
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/newsletters', newsletterRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      database: supabaseService.isConnected(),
      scheduler: schedulerService.isRunning()
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

  // Handle stream creation
  socket.on('create-stream', async (data) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const stream = await supabaseService.createStream({
        ...data,
        user_id: socket.userId,
        created_at: new Date()
      });
      
      socket.emit('stream-created', stream);
      
      // Notify chat service to start conversation for new stream
      await chatService.initializeStream(socket.userId, stream.id, socket);
    } catch (error) {
      logger.error('Error creating stream:', error);
      socket.emit('error', { message: 'Failed to create stream' });
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

  // Handle manual research trigger
  socket.on('trigger-research', async (data) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      await researchService.triggerManualResearch(data.streamId, socket.userId);
      socket.emit('research-triggered', { streamId: data.streamId });
    } catch (error) {
      logger.error('Error triggering research:', error);
      socket.emit('error', { message: 'Failed to trigger research' });
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

    // Start scheduler service
    await schedulerService.start();
    logger.info('Scheduler service started');

    // Start server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
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
    await databaseService.close();
    server.close(() => {
      logger.info('Server shut down successfully');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

startServer();

module.exports = { app, server, io }; 