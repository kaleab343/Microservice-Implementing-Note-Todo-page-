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
const PORT = process.env.PORT || 3003;

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

// Todo model
const Todo = sequelize.define('Todo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  text: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'due_date'
  },
  category: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  }
}, {
  tableName: 'todos',
  indexes: [
    { fields: ['user_id', 'completed', 'created_at'] },
    { fields: ['user_id', 'due_date'] },
    { fields: ['user_id', 'priority'] }
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
const clearUserCache = async (userId) => {
  const keys = await redisClient.keys(`cache:todos:${userId}:*`);
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
      service: 'todos-service',
      timestamp: new Date().toISOString(),
      database: 'connected',
      redis: redisClient.isReady ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'todos-service',
      error: error.message
    });
  }
});

// Get all todos for user
app.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, completed, priority, category } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = { userId: req.user.id };
    
    if (completed !== undefined) {
      whereClause.completed = completed === 'true';
    }
    
    if (priority) {
      whereClause.priority = priority;
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    const todos = await Todo.findAndCountAll({
      where: whereClause,
      order: [
        ['completed', 'ASC'],
        ['priority', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: {
        todos: todos.rows,
        pagination: {
          total: todos.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(todos.count / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Get todos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve todos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create new todo
app.post('/', authenticateToken, [
  body('text').trim().isLength({ min: 1, max: 200 }),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('category').optional().isLength({ max: 30 }),
  body('dueDate').optional().isISO8601()
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
    
    const { text, priority = 'medium', category, dueDate } = req.body;
    
    const todo = await Todo.create({
      text,
      priority,
      category,
      dueDate: dueDate ? new Date(dueDate) : null,
      userId: req.user.id
    });
    
    // Clear user cache
    await clearUserCache(req.user.id);
    
    res.status(201).json({
      success: true,
      message: 'Todo created successfully',
      data: { todo }
    });
    
  } catch (error) {
    console.error('Create todo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create todo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Toggle todo completion
app.patch('/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const todo = await Todo.findOne({
      where: { id, userId: req.user.id }
    });
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }
    
    const completed = !todo.completed;
    await todo.update({
      completed,
      completedAt: completed ? new Date() : null
    });
    
    // Clear user cache
    await clearUserCache(req.user.id);
    
    res.json({
      success: true,
      message: 'Todo updated successfully',
      data: { todo }
    });
    
  } catch (error) {
    console.error('Toggle todo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update todo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update todo
app.put('/:id', authenticateToken, [
  body('text').optional().trim().isLength({ min: 1, max: 200 }),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('category').optional().isLength({ max: 30 }),
  body('dueDate').optional().isISO8601(),
  body('completed').optional().isBoolean()
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
    
    const todo = await Todo.findOne({
      where: { id, userId: req.user.id }
    });
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }
    
    // Handle completion date
    if ('completed' in updates) {
      updates.completedAt = updates.completed ? new Date() : null;
    }
    
    // Handle due date
    if (updates.dueDate) {
      updates.dueDate = new Date(updates.dueDate);
    }
    
    await todo.update(updates);
    
    // Clear user cache
    await clearUserCache(req.user.id);
    
    res.json({
      success: true,
      message: 'Todo updated successfully',
      data: { todo }
    });
    
  } catch (error) {
    console.error('Update todo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update todo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete todo
app.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const todo = await Todo.findOne({
      where: { id, userId: req.user.id }
    });
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }
    
    await todo.destroy();
    
    // Clear user cache
    await clearUserCache(req.user.id);
    
    res.json({
      success: true,
      message: 'Todo deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete todo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete todo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get todo statistics
app.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await Todo.findAll({
      where: { userId: req.user.id },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN completed = true THEN 1 ELSE 0 END')), 'completed'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN due_date < NOW() AND completed = false THEN 1 END')), 'overdue']
      ],
      raw: true
    });
    
    const priorityStats = await Todo.findAll({
      where: { userId: req.user.id, completed: false },
      attributes: [
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['priority'],
      raw: true
    });
    
    res.json({
      success: true,
      data: {
        overview: stats[0] || { total: 0, completed: 0, overdue: 0 },
        byPriority: priorityStats
      }
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
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
      console.log(`✅ Todos Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start Todos Service:', error);
    process.exit(1);
  }
};

startServer();