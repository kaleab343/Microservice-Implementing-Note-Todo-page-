import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { Sequelize, DataTypes } from 'sequelize';
import Redis from 'redis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Database connection
const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'micronote',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Redis client for caching
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect().catch(console.error);

// Note model
const Note = sequelize.define('Note', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_pinned'
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_archived'
  }
}, {
  tableName: 'notes',
  indexes: [
    { fields: ['user_id', 'created_at'] },
    { fields: ['user_id', 'is_pinned', 'created_at'] }
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Cache middleware
const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();
    
    const key = `cache:notes:${req.user.id}:${req.originalUrl}`;
    
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      // Store original send function
      const originalSend = res.json;
      res.json = function(data) {
        // Cache the response
        redisClient.setEx(key, duration, JSON.stringify(data)).catch(console.error);
        // Call original send
        originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      next();
    }
  };
};

// Clear cache helper
const clearUserCache = async (userId) => {
  const keys = await redisClient.keys(`cache:notes:${userId}:*`);
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
};

// Routes

// Health check
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'healthy',
      service: 'notes-service',
      timestamp: new Date().toISOString(),
      database: 'connected',
      redis: redisClient.isReady ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'notes-service',
      error: error.message
    });
  }
});

// Get all notes for user
app.get('/', authenticateToken, cacheMiddleware(300), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, archived = false, pinned } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {
      userId: req.user.id,
      isArchived: archived === 'true'
    };
    
    if (pinned !== undefined) {
      whereClause.isPinned = pinned === 'true';
    }
    
    if (search) {
      whereClause[Sequelize.Op.or] = [
        { title: { [Sequelize.Op.like]: `%${search}%` } },
        { text: { [Sequelize.Op.like]: `%${search}%` } }
      ];
    }
    
    const notes = await Note.findAndCountAll({
      where: whereClause,
      order: [
        ['isPinned', 'DESC'],
        ['updatedAt', 'DESC']
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: {
        notes: notes.rows,
        pagination: {
          total: notes.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(notes.count / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create new note
app.post('/', authenticateToken, [
  body('title').trim().isLength({ min: 1, max: 100 }),
  body('text').trim().isLength({ min: 1 }),
  body('tags').optional().isArray(),
  body('isPinned').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { title, text, tags = [], isPinned = false } = req.body;
    
    const note = await Note.create({
      title,
      text,
      tags,
      isPinned,
      userId: req.user.id
    });
    
    // Clear user cache
    await clearUserCache(req.user.id);
    
    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: { note }
    });
    
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create note',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update note
app.put('/:id', authenticateToken, [
  body('title').optional().trim().isLength({ min: 1, max: 100 }),
  body('text').optional().trim().isLength({ min: 1 }),
  body('tags').optional().isArray(),
  body('isPinned').optional().isBoolean(),
  body('isArchived').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    const note = await Note.findOne({
      where: { id, userId: req.user.id }
    });
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    
    await note.update(updates);
    
    // Clear user cache
    await clearUserCache(req.user.id);
    
    res.json({
      success: true,
      message: 'Note updated successfully',
      data: { note }
    });
    
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update note',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete note
app.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const note = await Note.findOne({
      where: { id, userId: req.user.id }
    });
    
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    
    await note.destroy();
    
    // Clear user cache
    await clearUserCache(req.user.id);
    
    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete note',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Search notes
app.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query required'
      });
    }
    
    const notes = await Note.findAll({
      where: {
        userId: req.user.id,
        isArchived: false,
        [Sequelize.Op.or]: [
          { title: { [Sequelize.Op.like]: `%${query}%` } },
          { text: { [Sequelize.Op.like]: `%${query}%` } }
        ]
      },
      order: [['updatedAt', 'DESC']],
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: { notes, query }
    });
    
  } catch (error) {
    console.error('Search notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Initialize database and start server
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    await sequelize.sync();
    console.log('📊 Database synced successfully');
    
    app.listen(PORT, () => {
      console.log(`📝 Notes Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start Notes Service:', error);
    process.exit(1);
  }
};

startServer();