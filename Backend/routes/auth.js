import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import auth from '../middleware/auth.js';
import { User } from '../models/index.js';

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user (Sign up)
// @access  Public
router.post('/register', [
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Name is required and must be less than 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('username').trim().isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Username must be 3-20 characters and contain only letters, numbers, and underscores'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    console.log('🔥 REGISTRATION REQUEST:', {
      name: req.body.name,
      email: req.body.email,
      username: req.body.username
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, username, password } = req.body;

    // Check if user already exists
    console.log('🔍 Checking for existing user...');
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: email.toLowerCase() },
          { username: username }
        ]
      }
    });

    if (existingUser) {
      const message = existingUser.email === email.toLowerCase() ? 'Email already registered' : 'Username already taken';
      console.log('❌ User already exists:', message);
      return res.status(400).json({
        success: false,
        message
      });
    }

    console.log('💾 Creating user...');
    // Create new user (password will be hashed automatically by the model hook)
    const user = await User.create({
      name,
      email,
      username,
      password
    });

    console.log('✅ User created with ID:', user.id);
    console.log('👤 Created user:', { id: user.id, username: user.username, email: user.email });

    // Generate token
    const token = generateToken(user.id);
    console.log('🎟️ Generated JWT token');

    console.log('📤 Sending success response');
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }
    
    // Handle unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0].path;
      return res.status(400).json({
        success: false,
        message: `${field === 'email' ? 'Email' : 'Username'} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user (Sign in)
// @access  Public
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username or email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    console.log('🔑 LOGIN REQUEST:', {
      username: req.body.username
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, password } = req.body;

    console.log('🔍 Finding user by username or email...');
    // Find user by username or email
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: username },
          { email: username.toLowerCase() }
        ]
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('👤 User found:', { id: user.id, username: user.username });

    console.log('🔐 Verifying password...');
    // Check password using the model method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Password does not match');
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('✅ Password verified');

    // Generate token
    const token = generateToken(user.id);
    console.log('🎟️ Generated JWT token');

    console.log('📤 Sending success response');
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    
    // Handle database connection errors
    if (error.name === 'SequelizeConnectionError') {
      return res.status(503).json({
        success: false,
        message: 'Database connection failed. Please try again later.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    console.log('👤 Get current user:', req.user.id);
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/demo
// @desc    Demo login (creates a demo user if not exists)
// @access  Public
router.post('/demo', async (req, res) => {
  try {
    console.log('🎮 DEMO LOGIN REQUEST');

    // Find or create demo user
    let demoUser = await User.findOne({
      where: { username: 'demo' }
    });
    
    if (!demoUser) {
      console.log('📝 Creating demo user...');
      // Create demo user (password will be hashed automatically)
      demoUser = await User.create({
        name: 'Demo User',
        email: 'demo@micronote.com',
        username: 'demo',
        password: 'demo123'
      });
      console.log('✅ Demo user created:', demoUser.id);
    } else {
      console.log('✅ Demo user found:', demoUser.id);
    }

    // Generate token
    const token = generateToken(demoUser.id);

    res.json({
      success: true,
      message: 'Demo login successful',
      data: {
        user: demoUser,
        token
      }
    });
  } catch (error) {
    console.error('❌ Demo login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during demo login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Public
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful. Please remove token from client.'
  });
});

export default router;