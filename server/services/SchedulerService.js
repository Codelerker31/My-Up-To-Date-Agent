const cron = require('node-cron');
const logger = require('../utils/logger');

class SchedulerService {
  constructor(databaseService, researchService, chatService) {
    this.db = databaseService;
    this.research = researchService;
    this.chat = chatService;
    this.scheduledTasks = new Map();
    this.running = false;
  }

  async start() {
    try {
      this.running = true;
      
      // Start the main scheduler that checks for tasks every minute
      this.mainScheduler = cron.schedule('* * * * *', async () => {
        await this.checkScheduledTasks();
      }, {
        scheduled: false
      });

      this.mainScheduler.start();
      
      // Load existing scheduled tasks
      await this.loadExistingTasks();
      
      logger.info('Scheduler service started');
    } catch (error) {
      logger.error('Error starting scheduler service:', error);
      throw error;
    }
  }

  async stop() {
    try {
      this.running = false;
      
      if (this.mainScheduler) {
        this.mainScheduler.stop();
      }
      
      // Stop all individual scheduled tasks
      for (const [taskId, task] of this.scheduledTasks) {
        if (task.cronJob) {
          task.cronJob.stop();
        }
      }
      
      this.scheduledTasks.clear();
      logger.info('Scheduler service stopped');
    } catch (error) {
      logger.error('Error stopping scheduler service:', error);
    }
  }

  async createScheduledTask(taskData) {
    try {
      const { streamId, userId, taskType, frequency, dayOfWeek, time, nextRun } = taskData;
      
      // Generate cron expression
      const cronExpression = this.generateCronExpression(frequency, dayOfWeek, time);
      
      // Create scheduled task in database
      const scheduledTask = await this.db.createScheduledTask({
        streamId,
        userId,
        taskType,
        frequency,
        dayOfWeek,
        time,
        nextRun: nextRun || this.calculateNextRun(frequency, dayOfWeek, time)
      });

      // Create cron job
      const cronJob = cron.schedule(cronExpression, async () => {
        await this.executeTask(scheduledTask);
      }, {
        scheduled: false,
        timezone: 'America/New_York' // Default timezone
      });

      // Store the task
      this.scheduledTasks.set(scheduledTask.id, {
        ...scheduledTask,
        cronJob,
        cronExpression
      });

      cronJob.start();
      
      logger.info(`Created scheduled task ${scheduledTask.id} with cron expression: ${cronExpression}`);
      
      return scheduledTask;
    } catch (error) {
      logger.error('Error creating scheduled task:', error);
      throw error;
    }
  }

  async updateStreamSchedule(streamId, newSchedule) {
    try {
      const { frequency, dayOfWeek, time } = newSchedule;
      
      // Find existing scheduled task for this stream
      const existingTasks = Array.from(this.scheduledTasks.values())
        .filter(task => task.streamId === streamId);
      
      // Remove existing tasks
      for (const task of existingTasks) {
        await this.removeScheduledTask(task.id);
      }
      
      // Update stream schedule
      const nextRun = this.calculateNextRun(frequency, dayOfWeek, time);
      await this.db.updateStream(streamId, {
        frequency,
        day_of_week: dayOfWeek,
        time,
        next_update: nextRun
      });
      
      // Create new scheduled task
      const stream = await this.db.getStreamById(streamId);
      await this.createScheduledTask({
        streamId,
        userId: stream.user_id,
        taskType: 'newsletter_generation',
        frequency,
        dayOfWeek,
        time,
        nextRun
      });
      
      logger.info(`Updated schedule for stream ${streamId}`);
    } catch (error) {
      logger.error('Error updating stream schedule:', error);
      throw error;
    }
  }

  async pauseStream(streamId) {
    try {
      // Find and pause scheduled tasks for this stream
      const tasks = Array.from(this.scheduledTasks.values())
        .filter(task => task.streamId === streamId);
      
      for (const task of tasks) {
        if (task.cronJob) {
          task.cronJob.stop();
        }
        await this.db.updateScheduledTask(task.id, { is_active: false });
      }
      
      logger.info(`Paused scheduled tasks for stream ${streamId}`);
    } catch (error) {
      logger.error('Error pausing stream:', error);
      throw error;
    }
  }

  async resumeStream(streamId) {
    try {
      // Find and resume scheduled tasks for this stream
      const tasks = Array.from(this.scheduledTasks.values())
        .filter(task => task.streamId === streamId);
      
      for (const task of tasks) {
        if (task.cronJob) {
          task.cronJob.start();
        }
        await this.db.updateScheduledTask(task.id, { is_active: true });
      }
      
      logger.info(`Resumed scheduled tasks for stream ${streamId}`);
    } catch (error) {
      logger.error('Error resuming stream:', error);
      throw error;
    }
  }

  async removeScheduledTask(taskId) {
    try {
      const task = this.scheduledTasks.get(taskId);
      if (task && task.cronJob) {
        task.cronJob.stop();
      }
      
      this.scheduledTasks.delete(taskId);
      
      // Update database
      await this.db.updateScheduledTask(taskId, { is_active: false });
      
      logger.info(`Removed scheduled task ${taskId}`);
    } catch (error) {
      logger.error('Error removing scheduled task:', error);
    }
  }

  async checkScheduledTasks() {
    try {
      // This is a backup method to catch any missed tasks
      // The main scheduling is handled by individual cron jobs
      const now = new Date();
      const tasks = Array.from(this.scheduledTasks.values())
        .filter(task => task.is_active && new Date(task.next_run) <= now);
      
      for (const task of tasks) {
        logger.info(`Backup execution of task ${task.id}`);
        await this.executeTask(task);
      }
    } catch (error) {
      logger.error('Error checking scheduled tasks:', error);
    }
  }

  async executeTask(task) {
    try {
      logger.info(`Executing scheduled task ${task.id} for stream ${task.streamId}`);
      
      if (task.taskType === 'newsletter_generation') {
        // Trigger automated research
        const newsletter = await this.research.triggerAutomatedResearch(
          task.streamId, 
          task.userId
        );
        
        if (newsletter) {
          // Notify user via chat
          await this.notifyNewsletterGenerated(task.userId, task.streamId, newsletter);
        }
      }
      
      // Update next run time
      const nextRun = this.calculateNextRun(task.frequency, task.dayOfWeek, task.time);
      await this.db.updateScheduledTask(task.id, { 
        last_run: new Date(),
        next_run: nextRun
      });
      
      // Update the in-memory task
      const updatedTask = this.scheduledTasks.get(task.id);
      if (updatedTask) {
        updatedTask.last_run = new Date();
        updatedTask.next_run = nextRun;
      }
      
    } catch (error) {
      logger.error(`Error executing task ${task.id}:`, error);
    }
  }

  async loadExistingTasks() {
    try {
      // In a real implementation, you'd load from database
      // For now, we'll start fresh each time
      logger.info('Loaded existing scheduled tasks');
    } catch (error) {
      logger.error('Error loading existing tasks:', error);
    }
  }

  generateCronExpression(frequency, dayOfWeek, time) {
    const [hours, minutes] = time.split(':').map(Number);
    
    switch (frequency) {
      case 'daily':
        return `${minutes} ${hours} * * *`;
      
      case 'weekly':
        const dayNumber = this.getDayNumber(dayOfWeek);
        return `${minutes} ${hours} * * ${dayNumber}`;
      
      case 'bi-weekly':
        // Run every 2 weeks on the specified day
        const biWeeklyDay = this.getDayNumber(dayOfWeek);
        return `${minutes} ${hours} * * ${biWeeklyDay}`;
      
      case 'monthly':
        // Run on the 1st of every month
        return `${minutes} ${hours} 1 * *`;
      
      default:
        // Default to weekly
        return `${minutes} ${hours} * * 1`;
    }
  }

  getDayNumber(dayOfWeek) {
    const days = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };
    return days[dayOfWeek?.toLowerCase()] || 1;
  }

  calculateNextRun(frequency, dayOfWeek, time) {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    
    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);
    
    // If the time has already passed today, move to the next occurrence
    if (nextRun <= now) {
      switch (frequency) {
        case 'daily':
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        case 'weekly':
          nextRun.setDate(nextRun.getDate() + 7);
          break;
        case 'bi-weekly':
          nextRun.setDate(nextRun.getDate() + 14);
          break;
        case 'monthly':
          nextRun.setMonth(nextRun.getMonth() + 1);
          nextRun.setDate(1);
          break;
        default:
          nextRun.setDate(nextRun.getDate() + 7);
      }
    }
    
    // For weekly/bi-weekly, adjust to the correct day of week
    if ((frequency === 'weekly' || frequency === 'bi-weekly') && dayOfWeek) {
      const targetDay = this.getDayNumber(dayOfWeek);
      const currentDay = nextRun.getDay();
      const daysUntilTarget = (targetDay - currentDay + 7) % 7;
      
      if (daysUntilTarget > 0) {
        nextRun.setDate(nextRun.getDate() + daysUntilTarget);
      }
    }
    
    return nextRun;
  }

  async notifyNewsletterGenerated(userId, streamId, newsletter) {
    try {
      // This would integrate with ChatService to send the newsletter message
      logger.info(`Newsletter ${newsletter.id} generated for user ${userId}, stream ${streamId}`);
      
      // In a real implementation, you'd call:
      // await this.chat.sendNewsletterMessage(userId, streamId, newsletter);
    } catch (error) {
      logger.error('Error notifying newsletter generated:', error);
    }
  }

  isRunning() {
    return this.running;
  }

  getScheduledTasksCount() {
    return this.scheduledTasks.size;
  }

  getActiveTasksForStream(streamId) {
    return Array.from(this.scheduledTasks.values())
      .filter(task => task.streamId === streamId && task.is_active);
  }
}

module.exports = SchedulerService; 