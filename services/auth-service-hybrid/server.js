import express from 'express';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { Sequelize, DataTypes } from 'sequelize';
import Redis from 'redis';
import winston from 'winston';

dotenv.config();

const REST_PORT = process.env.REST_PORT || 3001;
const GRPC_PORT = process.env.GRPC_PORT || 50001;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

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
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Redis client
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect().catch(console.error);

// User model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  username: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    }
  }
});

// Instance method for password comparison
User.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Utility functions
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId, type: 'refresh' }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// ======================
// gRPC SERVICE IMPLEMENTATION
// ======================

// Load proto definition
const packageDefinition = protoLoader.loadSync('../../proto/auth.proto', {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const authProto = grpc.loadPackageDefinition(packageDefinition).auth;

const authService = {
  async login(call, callback) {
    try {
      const { username, password } = call.request;
      
      logger.info(`gRPC Login attempt for: ${username}`);

      // Find user by username or email
      const user = await User.findOne({
        where: {
          [Sequelize.Op.or]: [
            { username: username },
            { email: username.toLowerCase() }
          ]
        }
      });

      if (!user || !(await user.comparePassword(password))) {
        logger.warn(`Failed login attempt for: ${username}`);
        return callback(null, {
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate tokens
      const accessToken = generateToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // Store refresh token in Redis
      await redisClient.setEx(`refresh_token:${user.id}`, 30 * 24 * 60 * 60, refreshToken);

      // Remove password from response
      const { password: _, ...userResponse } = user.toJSON();

      logger.info(`Successful gRPC login for user: ${user.id}`);

      callback(null, {
        success: true,
        message: 'Login successful',
        user: {
          id: userResponse.id,
          name: userResponse.name,
          email: userResponse.email,
          username: userResponse.username,
          created_at: userResponse.createdAt?.toISOString(),
          updated_at: userResponse.updatedAt?.toISOString()
        },
        access_token: accessToken,
        refresh_token: refreshToken
      });

    } catch (error) {
      logger.error('gRPC Login error:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Login failed'
      });
    }
  },

  async register(call, callback) {
    try {
      const { name, email, username, password } = call.request;
      
      logger.info(`gRPC Register attempt for: ${username}`);

      // Check if user exists
      const existingUser = await User.findOne({
        where: {
          [Sequelize.Op.or]: [
            { email: email.toLowerCase() },
            { username: username }
          ]
        }
      });

      if (existingUser) {
        const message = existingUser.email === email.toLowerCase() 
          ? 'Email already registered' 
          : 'Username already taken';
        
        logger.warn(`Registration failed for ${username}: ${message}`);
        
        return callback(null, {
          success: false,
          message: message
        });
      }

      // Create user
      const user = await User.create({
        name,
        email: email.toLowerCase(),
        username,
        password
      });

      // Generate tokens
      const accessToken = generateToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // Store refresh token in Redis
      await redisClient.setEx(`refresh_token:${user.id}`, 30 * 24 * 60 * 60, refreshToken);

      // Remove password from response
      const { password: _, ...userResponse } = user.toJSON();

      logger.info(`Successful gRPC registration for user: ${user.id}`);

      callback(null, {
        success: true,
        message: 'User registered successfully',
        user: {
          id: userResponse.id,
          name: userResponse.name,
          email: userResponse.email,
          username: userResponse.username,
          created_at: userResponse.createdAt?.toISOString(),
          updated_at: userResponse.updatedAt?.toISOString()
        },
        access_token: accessToken,
        refresh_token: refreshToken
      });

    } catch (error) {
      logger.error('gRPC Register error:', error);
      
      // Handle Sequelize validation errors
      if (error.name === 'SequelizeValidationError') {
        return callback(null, {
          success: false,
          message: 'Validation failed',
          errors: error.errors.map(err => ({
            field: err.path,
            message: err.message
          }))
        });
      }
      
      callback({
        code: grpc.status.INTERNAL,
        message: 'Registration failed'
      });
    }
  },

  async validateToken(call, callback) {
    try {
      const { token } = call.request;
      
      // Check blacklist
      const blacklisted = await redisClient.get(`blacklist:${token}`);
      if (blacklisted) {
        return callback(null, {
          valid: false,
          message: 'Token has been revoked'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'name', 'email', 'username', 'createdAt', 'updatedAt']
      });

      if (!user) {
        return callback(null, {
          valid: false,
          message: 'User not found'
        });
      }

      callback(null, {
        valid: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          created_at: user.createdAt?.toISOString(),
          updated_at: user.updatedAt?.toISOString()
        }
      });

    } catch (error) {
      logger.error('gRPC Token validation error:', error);
      callback(null, {
        valid: false,
        message: 'Invalid token'
      });
    }
  },

  async refreshToken(call, callback) {
    try {
      const { refresh_token } = call.request;

      const decoded = jwt.verify(refresh_token, process.env.JWT_SECRET);
      
      // Verify refresh token in Redis
      const storedToken = await redisClient.get(`refresh_token:${decoded.id}`);
      if (!storedToken || storedToken !== refresh_token) {
        return callback(null, {
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // Generate new access token
      const accessToken = generateToken(decoded.id);

      callback(null, {
        success: true,
        access_token: accessToken
      });

    } catch (error) {
      logger.error('gRPC Refresh token error:', error);
      callback(null, {
        success: false,
        message: 'Invalid refresh token'
      });
    }
  },

  async logout(call, callback) {
    try {
      const { access_token, refresh_token } = call.request;
      
      if (refresh_token) {
        try {
          const decoded = jwt.verify(refresh_token, process.env.JWT_SECRET);
          await redisClient.del(`refresh_token:${decoded.id}`);
        } catch (error) {
          // Token already invalid, continue with logout
        }
      }

      if (access_token) {
        try {
          const decoded = jwt.verify(access_token, process.env.JWT_SECRET);
          const expirationTime = decoded.exp - Math.floor(Date.now() / 1000);
          if (expirationTime > 0) {
            await redisClient.setEx(`blacklist:${access_token}`, expirationTime, 'revoked');
          }
        } catch (error) {
          // Token already invalid, continue with logout
        }
      }

      callback(null, {
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      logger.error('gRPC Logout error:', error);
      // Always succeed logout
      callback(null, {
        success: true,
        message: 'Logout successful'
      });
    }
  }
};

// ======================
// REST API (BACKWARD COMPATIBILITY)
// ======================

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'healthy',
      service: 'auth-service-hybrid',
      timestamp: new Date().toISOString(),
      database: 'connected',
      redis: redisClient.isReady ? 'connected' : 'disconnected',
      protocols: ['REST', 'gRPC']
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'auth-service-hybrid',
      error: error.message
    });
  }
});

// REST endpoints (can be removed once fully migrated to gRPC)
app.post('/register', [
  body('name').notEmpty().trim().isLength({ min: 2, max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('username').isAlphanumeric().isLength({ min: 3, max: 20 }),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  // Use the same logic as gRPC but return REST response
  const grpcCall = { request: req.body };
  authService.register(grpcCall, (error, response) => {
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    }
    
    if (response.success) {
      res.status(201).json(response);
    } else {
      res.status(400).json(response);
    }
  });
});

// ======================
// START BOTH SERVERS
// ======================

const startServers = async () => {
  try {
    // Initialize database
    await sequelize.authenticate();
    logger.info('✅ Database connected successfully');
    
    await sequelize.sync();
    logger.info('📊 Database synced successfully');
    
    // Start gRPC server
    const grpcServer = new grpc.Server();
    grpcServer.addService(authProto.AuthService.service, authService);
    
    grpcServer.bindAsync(
      `0.0.0.0:${GRPC_PORT}`,
      grpc.ServerCredentials.createInsecure(),
      (error, port) => {
        if (error) {
          logger.error('Failed to start gRPC server:', error);
          return;
        }
        
        grpcServer.start();
        logger.info(`⚡ gRPC Auth Service running on port ${port}`);
      }
    );

    // Start REST server
    app.listen(REST_PORT, () => {
      logger.info(`🔐 REST Auth Service running on port ${REST_PORT}`);
      logger.info(`
🎯 Hybrid Auth Service Active:
   🔐 REST API:       http://localhost:${REST_PORT}
   ⚡ gRPC Service:   localhost:${GRPC_PORT}
   📊 Health:         http://localhost:${REST_PORT}/health
   🔧 Protocol:       Hybrid (REST + gRPC)
      `);
    });

  } catch (error) {
    logger.error('❌ Failed to start Auth Service:', error);
    process.exit(1);
  }
};

startServers();