import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

export const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production');
    } catch (err) {
      let message = 'Token is invalid';
      if (err.name === 'TokenExpiredError') {
        message = 'Token has expired';
      } else if (err.name === 'JsonWebTokenError') {
        message = 'Token is malformed';
      }
      
      return res.status(401).json({
        success: false,
        message
      });
    }
    
    // Get user from database using Sequelize
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'name', 'email', 'username', 'createdAt', 'updatedAt']
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found, token is not valid'
      });
    }

    // Attach user to request
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // Handle database connection errors
    if (error.name === 'SequelizeConnectionError') {
      return res.status(503).json({
        success: false,
        message: 'Database connection failed. Please try again later.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Authorization failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default auth;