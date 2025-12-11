import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';
import Redis from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Redis client for caching and rate limiting
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect().catch(console.error);

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later.'
  }
});
app.use(limiter);

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Check if token is blacklisted
    const blacklisted = await redisClient.get(`blacklist:${token}`);
    if (blacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Service URLs
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  notes: process.env.NOTES_SERVICE_URL || 'http://localhost:3002',
  todos: process.env.TODOS_SERVICE_URL || 'http://localhost:3003',
  users: process.env.USER_SERVICE_URL || 'http://localhost:3004'
};

// Health check
app.get('/health', async (req, res) => {
  try {
    const healthChecks = await Promise.allSettled([
      fetch(`${services.auth}/health`),
      fetch(`${services.notes}/health`),
      fetch(`${services.todos}/health`),
      fetch(`${services.users}/health`)
    ]);

    const serviceStatus = {
      gateway: 'healthy',
      auth: healthChecks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      notes: healthChecks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      todos: healthChecks[2].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      users: healthChecks[3].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      redis: redisClient.isReady ? 'healthy' : 'unhealthy'
    };

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: serviceStatus
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Proxy configuration
const proxyOptions = {
  changeOrigin: true,
  timeout: 30000,
  onError: (err, req, res) => {
    console.error('Proxy Error:', err);
    res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'The requested service is not responding'
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add request ID for tracing
    proxyReq.setHeader('x-request-id', req.id || Math.random().toString(36).substr(2, 9));
  }
};

// Route proxying
// Authentication routes (no auth required for login/register)
app.use('/api/auth', createProxyMiddleware({
  target: services.auth,
  ...proxyOptions,
  pathRewrite: { '^/api/auth': '' }
}));

// Protected routes (require authentication)
app.use('/api/notes', authenticateToken, createProxyMiddleware({
  target: services.notes,
  ...proxyOptions,
  pathRewrite: { '^/api/notes': '' }
}));

app.use('/api/todos', authenticateToken, createProxyMiddleware({
  target: services.todos,
  ...proxyOptions,
  pathRewrite: { '^/api/todos': '' }
}));

app.use('/api/users', authenticateToken, createProxyMiddleware({
  target: services.users,
  ...proxyOptions,
  pathRewrite: { '^/api/users': '' }
}));

// Analytics and monitoring
app.use('/api/analytics', (req, res, next) => {
  // Log request for analytics
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - User: ${req.user?.id || 'anonymous'}`);
  next();
});

// Catch-all route
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested endpoint does not exist'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Gateway Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down API Gateway...');
  await redisClient.quit();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log('🔗 Service routes:');
  console.log('   - /api/auth/* → Auth Service');
  console.log('   - /api/notes/* → Notes Service');
  console.log('   - /api/todos/* → Todos Service');
  console.log('   - /api/users/* → User Service');
});

export default app;