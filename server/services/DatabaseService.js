const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class DatabaseService {
  constructor() {
    this.db = null;
    this.connected = false;
  }

  async initialize() {
    const dbPath = path.join(__dirname, '../database/updates_agent.db');
    
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          logger.error('Error opening database:', err);
          reject(err);
        } else {
          logger.info('Connected to SQLite database');
          this.connected = true;
          this.createTables()
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  async createTables() {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        preferences TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Update streams table
      `CREATE TABLE IF NOT EXISTS streams (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        priority TEXT DEFAULT 'medium',
        color TEXT DEFAULT 'blue',
        is_active BOOLEAN DEFAULT true,
        frequency TEXT,
        day_of_week TEXT,
        time TEXT,
        next_update DATETIME,
        last_update DATETIME,
        sources_count INTEGER DEFAULT 0,
        insights_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Chat messages table
      `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        stream_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (stream_id) REFERENCES streams (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Newsletters table
      `CREATE TABLE IF NOT EXISTS newsletters (
        id TEXT PRIMARY KEY,
        stream_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        content TEXT NOT NULL,
        sources TEXT,
        key_insights TEXT,
        confidence REAL,
        is_automated BOOLEAN DEFAULT false,
        report_number INTEGER,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (stream_id) REFERENCES streams (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Research sessions table
      `CREATE TABLE IF NOT EXISTS research_sessions (
        id TEXT PRIMARY KEY,
        stream_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        sources_analyzed INTEGER DEFAULT 0,
        key_findings INTEGER DEFAULT 0,
        confidence REAL DEFAULT 0,
        methodology TEXT,
        is_automated BOOLEAN DEFAULT false,
        FOREIGN KEY (stream_id) REFERENCES streams (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Scheduled tasks table
      `CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id TEXT PRIMARY KEY,
        stream_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        task_type TEXT NOT NULL,
        frequency TEXT NOT NULL,
        day_of_week TEXT,
        time TEXT NOT NULL,
        next_run DATETIME NOT NULL,
        last_run DATETIME,
        is_active BOOLEAN DEFAULT true,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (stream_id) REFERENCES streams (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`
    ];

    for (const table of tables) {
      await this.runQuery(table);
    }

    logger.info('Database tables created/verified');
  }

  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          logger.error('Database error:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('Database error:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('Database error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // User operations
  async createUser(userData) {
    const id = uuidv4();
    const sql = `INSERT INTO users (id, email, password_hash, name, preferences) 
                 VALUES (?, ?, ?, ?, ?)`;
    
    await this.runQuery(sql, [
      id, 
      userData.email, 
      userData.passwordHash, 
      userData.name || null,
      userData.preferences ? JSON.stringify(userData.preferences) : null
    ]);

    return this.getUserById(id);
  }

  async getUserById(id) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const user = await this.getQuery(sql, [id]);
    
    if (user && user.preferences) {
      user.preferences = JSON.parse(user.preferences);
    }
    
    return user;
  }

  async getUserByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const user = await this.getQuery(sql, [email]);
    
    if (user && user.preferences) {
      user.preferences = JSON.parse(user.preferences);
    }
    
    return user;
  }

  // Stream operations
  async createStream(streamData) {
    const id = uuidv4();
    const sql = `INSERT INTO streams 
                 (id, user_id, title, description, category, priority, color, frequency, day_of_week, time, next_update) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    await this.runQuery(sql, [
      id,
      streamData.userId,
      streamData.title,
      streamData.description || null,
      streamData.category || null,
      streamData.priority || 'medium',
      streamData.color || 'blue',
      streamData.frequency || null,
      streamData.dayOfWeek || null,
      streamData.time || null,
      streamData.nextUpdate || null
    ]);

    return this.getStreamById(id);
  }

  async getStreamById(id) {
    const sql = 'SELECT * FROM streams WHERE id = ?';
    return await this.getQuery(sql, [id]);
  }

  async getUserStreams(userId) {
    const sql = 'SELECT * FROM streams WHERE user_id = ? ORDER BY created_at DESC';
    return await this.allQuery(sql, [userId]);
  }

  async updateStream(id, updates) {
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const sql = `UPDATE streams SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const values = [...Object.values(updates), id];
    
    await this.runQuery(sql, values);
    return this.getStreamById(id);
  }

  // Message operations
  async createMessage(messageData) {
    const id = uuidv4();
    const sql = `INSERT INTO messages (id, stream_id, user_id, type, content, metadata) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    await this.runQuery(sql, [
      id,
      messageData.streamId,
      messageData.userId,
      messageData.type,
      messageData.content,
      messageData.metadata ? JSON.stringify(messageData.metadata) : null
    ]);

    return this.getMessageById(id);
  }

  async getMessageById(id) {
    const sql = 'SELECT * FROM messages WHERE id = ?';
    const message = await this.getQuery(sql, [id]);
    
    if (message && message.metadata) {
      message.metadata = JSON.parse(message.metadata);
    }
    
    return message;
  }

  async getStreamMessages(streamId, limit = 50) {
    const sql = `SELECT * FROM messages WHERE stream_id = ? 
                 ORDER BY timestamp DESC LIMIT ?`;
    const messages = await this.allQuery(sql, [streamId, limit]);
    
    return messages.map(message => {
      if (message.metadata) {
        message.metadata = JSON.parse(message.metadata);
      }
      return message;
    }).reverse();
  }

  // Newsletter operations
  async createNewsletter(newsletterData) {
    const id = uuidv4();
    const sql = `INSERT INTO newsletters 
                 (id, stream_id, user_id, title, summary, content, sources, key_insights, confidence, is_automated, report_number) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    await this.runQuery(sql, [
      id,
      newsletterData.streamId,
      newsletterData.userId,
      newsletterData.title,
      newsletterData.summary || null,
      newsletterData.content,
      newsletterData.sources ? JSON.stringify(newsletterData.sources) : null,
      newsletterData.keyInsights ? JSON.stringify(newsletterData.keyInsights) : null,
      newsletterData.confidence || null,
      newsletterData.isAutomated || false,
      newsletterData.reportNumber || 1
    ]);

    return this.getNewsletterById(id);
  }

  async getNewsletterById(id) {
    const sql = 'SELECT * FROM newsletters WHERE id = ?';
    const newsletter = await this.getQuery(sql, [id]);
    
    if (newsletter) {
      if (newsletter.sources) newsletter.sources = JSON.parse(newsletter.sources);
      if (newsletter.key_insights) newsletter.key_insights = JSON.parse(newsletter.key_insights);
    }
    
    return newsletter;
  }

  async getStreamNewsletters(streamId) {
    const sql = 'SELECT * FROM newsletters WHERE stream_id = ? ORDER BY generated_at DESC';
    const newsletters = await this.allQuery(sql, [streamId]);
    
    return newsletters.map(newsletter => {
      if (newsletter.sources) newsletter.sources = JSON.parse(newsletter.sources);
      if (newsletter.key_insights) newsletter.key_insights = JSON.parse(newsletter.key_insights);
      return newsletter;
    });
  }

  async getLatestNewsletter(streamId) {
    const sql = 'SELECT * FROM newsletters WHERE stream_id = ? ORDER BY generated_at DESC LIMIT 1';
    const newsletter = await this.getQuery(sql, [streamId]);
    
    if (newsletter) {
      if (newsletter.sources) newsletter.sources = JSON.parse(newsletter.sources);
      if (newsletter.key_insights) newsletter.key_insights = JSON.parse(newsletter.key_insights);
    }
    
    return newsletter;
  }

  // Scheduled task operations
  async createScheduledTask(taskData) {
    const id = uuidv4();
    const sql = `INSERT INTO scheduled_tasks 
                 (id, stream_id, user_id, task_type, frequency, day_of_week, time, next_run) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    await this.runQuery(sql, [
      id,
      taskData.streamId,
      taskData.userId,
      taskData.taskType,
      taskData.frequency,
      taskData.dayOfWeek || null,
      taskData.time,
      taskData.nextRun
    ]);

    return this.getScheduledTaskById(id);
  }

  async getScheduledTaskById(id) {
    const sql = 'SELECT * FROM scheduled_tasks WHERE id = ?';
    return await this.getQuery(sql, [id]);
  }

  async getActiveScheduledTasks() {
    const sql = 'SELECT * FROM scheduled_tasks WHERE is_active = true AND next_run <= datetime("now")';
    return await this.allQuery(sql);
  }

  async updateScheduledTask(id, updates) {
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const sql = `UPDATE scheduled_tasks SET ${setClause} WHERE id = ?`;
    const values = [...Object.values(updates), id];
    
    await this.runQuery(sql, values);
    return this.getScheduledTaskById(id);
  }

  isConnected() {
    return this.connected;
  }

  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            logger.error('Error closing database:', err);
          } else {
            logger.info('Database connection closed');
          }
          this.connected = false;
          resolve();
        });
      });
    }
  }
}

module.exports = DatabaseService; 