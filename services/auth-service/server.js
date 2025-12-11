import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { Sequelize, DataTypes } from 'sequelize';
import Redis from 'redis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Routes

// Health check
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'healthy',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
      database: 'connected',
      redis: redisClient.isReady ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'auth-service',
      error: error.message
    });
  }
});

// Register
app.post('/register', [
  body('name').notEmpty().trim().isLength({ min: 2, max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('username').isAlphanumeric().isLength({ min: 3, max: 20 }),
  body('password').isLength({ min: 6 })
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

    const { name, email, username, password } = req.body;

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
      return res.status(400).json({
        success: false,
        message: existingUser.email === email.toLowerCase() 
          ? 'Email already registered' 
          : 'Username already taken'
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

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login
app.post('/login', [
  body('username').notEmpty(),
  body('password').notEmpty()
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

    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({
      where: {
        [Sequelize.Op.or]: [
          { username: username },
          { email: username.toLowerCase() }
        ]
      }
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({
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

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Refresh token
app.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Verify refresh token in Redis
    const storedToken = await redisClient.get(`refresh_token:${decoded.id}`);
    if (!storedToken || storedToken !== refreshToken) {
      return res.status(403).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const accessToken = generateToken(decoded.id);

    res.json({
      success: true,
      data: { accessToken }
    });

  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

// Logout
app.post('/logout', async (req, res) => {
  try {
    const { refreshToken, accessToken } = req.body;
    
    if (refreshToken) {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      await redisClient.del(`refresh_token:${decoded.id}`);
    }

    if (accessToken) {
      // Add access token to blacklist
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      const expirationTime = decoded.exp - Math.floor(Date.now() / 1000);
      await redisClient.setEx(`blacklist:${accessToken}`, expirationTime, 'revoked');
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }
});

// Verify token (for other services)
app.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    // Check blacklist
    const blacklisted = await redisClient.get(`blacklist:${token}`);
    if (blacklisted) {
      return res.status(401).json({ valid: false, message: 'Token revoked' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'name', 'email', 'username']
    });

    if (!user) {
      return res.status(401).json({ valid: false, message: 'User not found' });
    }

    res.json({
      valid: true,
      user: user
    });

  } catch (error) {
    res.status(401).json({ valid: false, message: 'Invalid token' });
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
      console.log(`🔐 Auth Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start Auth Service:', error);
    process.exit(1);
  }
};

startServer();