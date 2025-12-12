import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import jwt from 'jsonwebtoken';
import Redis from 'redis';
import dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 8080;
const GRPC_PORT = process.env.GRPC_PORT || 9090;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Redis client for caching and real-time
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect().catch(console.error);

// Load gRPC proto definitions
const loadProto = (protoPath, packageName) => {
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
  return grpc.loadPackageDefinition(packageDefinition)[packageName];
};

// gRPC service clients
const authProto = loadProto('../../proto/auth.proto', 'auth');
const notesProto = loadProto('../../proto/notes.proto', 'notes');
const todosProto = loadProto('../../proto/todos.proto', 'todos');

const authClient = new authProto.AuthService(
  process.env.AUTH_GRPC_URL || 'localhost:50001',
  grpc.credentials.createInsecure()
);

const notesClient = new notesProto.NotesService(
  process.env.NOTES_GRPC_URL || 'localhost:50002',
  grpc.credentials.createInsecure()
);

const todosClient = new todosProto.TodosService(
  process.env.TODOS_GRPC_URL || 'localhost:50003',
  grpc.credentials.createInsecure()
);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
});

// Auth middleware for REST endpoints
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Validate token via gRPC Auth service
    const grpcResponse = await new Promise((resolve, reject) => {
      authClient.validateToken({ token }, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    if (!grpcResponse.valid) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = grpcResponse.user;
    next();
  } catch (error) {
    logger.error('Auth error:', error);
    return res.status(500).json({ error: 'Authentication service unavailable' });
  }
};

// Health check
app.get('/health', async (req, res) => {
  try {
    // Check all gRPC services health
    const healthChecks = await Promise.allSettled([
      new Promise((resolve, reject) => {
        authClient.waitForReady(Date.now() + 5000, (error) => {
          if (error) reject(error);
          else resolve('healthy');
        });
      }),
      new Promise((resolve, reject) => {
        notesClient.waitForReady(Date.now() + 5000, (error) => {
          if (error) reject(error);
          else resolve('healthy');
        });
      }),
      new Promise((resolve, reject) => {
        todosClient.waitForReady(Date.now() + 5000, (error) => {
          if (error) reject(error);
          else resolve('healthy');
        });
      })
    ]);

    const serviceStatus = {
      gateway: 'healthy',
      auth: healthChecks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      notes: healthChecks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      todos: healthChecks[2].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      redis: redisClient.isReady ? 'healthy' : 'unhealthy'
    };

    const overallHealth = Object.values(serviceStatus).every(status => status === 'healthy');

    res.status(overallHealth ? 200 : 503).json({
      status: overallHealth ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: serviceStatus
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// ======================
// AUTH ROUTES (REST → gRPC)
// ======================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, username, password } = req.body;
    
    const grpcResponse = await new Promise((resolve, reject) => {
      authClient.register({ name, email, username, password }, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    if (grpcResponse.success) {
      // Store tokens in Redis for session management
      await redisClient.setEx(`session:${grpcResponse.user.id}`, 7 * 24 * 60 * 60, grpcResponse.access_token);
      
      res.status(201).json({
        success: true,
        message: grpcResponse.message,
        data: {
          user: grpcResponse.user,
          token: grpcResponse.access_token
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: grpcResponse.message
      });
    }
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const grpcResponse = await new Promise((resolve, reject) => {
      authClient.login({ username, password }, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    if (grpcResponse.success) {
      // Store session
      await redisClient.setEx(`session:${grpcResponse.user.id}`, 7 * 24 * 60 * 60, grpcResponse.access_token);
      
      res.json({
        success: true,
        message: grpcResponse.message,
        data: {
          user: grpcResponse.user,
          token: grpcResponse.access_token
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: grpcResponse.message
      });
    }
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    
    const grpcResponse = await new Promise((resolve, reject) => {
      authClient.logout({ 
        access_token: token || req.headers.authorization?.split(' ')[1],
        refresh_token: req.body.refresh_token 
      }, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    // Remove session from Redis
    await redisClient.del(`session:${req.user.id}`);

    res.json({
      success: true,
      message: grpcResponse.message || 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    // Always succeed logout on error
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }
});

// ======================
// NOTES ROUTES (REST → gRPC)
// ======================

app.get('/api/notes', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, archived = false, pinned } = req.query;
    
    // Check Redis cache first
    const cacheKey = `notes:${req.user.id}:${page}:${limit}:${search || ''}:${archived}:${pinned || ''}`;
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    const grpcResponse = await new Promise((resolve, reject) => {
      notesClient.getNotes({
        user_id: req.user.id,
        page: parseInt(page),
        limit: parseInt(limit),
        archived: archived === 'true',
        pinned: pinned !== undefined ? pinned === 'true' : undefined
      }, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    const result = {
      success: grpcResponse.success,
      data: {
        notes: grpcResponse.notes || [],
        pagination: grpcResponse.pagination
      },
      message: grpcResponse.message
    };

    // Cache for 5 minutes
    await redisClient.setEx(cacheKey, 300, JSON.stringify(result));

    res.json(result);
  } catch (error) {
    logger.error('Get notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/notes', authenticateToken, async (req, res) => {
  try {
    const { title, text, tags = [], isPinned = false } = req.body;
    
    const grpcResponse = await new Promise((resolve, reject) => {
      notesClient.createNote({
        title,
        text,
        user_id: req.user.id,
        tags,
        is_pinned: isPinned
      }, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });

    if (grpcResponse.success) {
      // Clear user's notes cache
      const cachePattern = `notes:${req.user.id}:*`;
      const keys = await redisClient.keys(cachePattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }

      // Emit real-time update
      io.to(`user_${req.user.id}`).emit('noteCreated', {
        type: 'NOTE_CREATED',
        note: grpcResponse.note
      });

      res.status(201).json({
        success: true,
        message: grpcResponse.message,
        data: { note: grpcResponse.note }
      });
    } else {
      res.status(400).json({
        success: false,
        message: grpcResponse.message
      });
    }
  } catch (error) {
    logger.error('Create note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create note',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// WebSocket real-time connections
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('authenticate', async (token) => {
    try {
      // Validate token via gRPC
      const grpcResponse = await new Promise((resolve, reject) => {
        authClient.validateToken({ token }, (error, response) => {
          if (error) reject(error);
          else resolve(response);
        });
      });

      if (grpcResponse.valid) {
        socket.userId = grpcResponse.user.id;
        socket.join(`user_${grpcResponse.user.id}`);
        socket.emit('authenticated', { success: true, user: grpcResponse.user });
        
        logger.info(`User ${grpcResponse.user.id} authenticated via WebSocket`);
      } else {
        socket.emit('authenticated', { success: false, message: 'Invalid token' });
      }
    } catch (error) {
      logger.error('WebSocket auth error:', error);
      socket.emit('authenticated', { success: false, message: 'Authentication failed' });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down API Gateway...');
  await redisClient.quit();
  authClient.close();
  notesClient.close();
  todosClient.close();
  server.close(() => {
    logger.info('API Gateway shut down successfully');
    process.exit(0);
  });
});

server.listen(PORT, () => {
  logger.info(`🚀 Hybrid API Gateway running on port ${PORT}`);
  logger.info(`📡 WebSocket server ready for real-time connections`);
  logger.info('🔗 REST → gRPC translation active');
  logger.info('⚡ High-performance internal gRPC communication enabled');
  console.log(`
🎯 Hybrid Architecture Active:
   📱 Frontend (REST):     http://localhost:${PORT}/api
   📊 Health Check:        http://localhost:${PORT}/health
   📡 WebSocket:          ws://localhost:${PORT}
   ⚡ gRPC Internal:       Port ${GRPC_PORT}
  `);
});

export default app;