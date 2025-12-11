import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'micronote',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  }
);

// Test the connection
export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connected successfully');
    
    // Sync database in development
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('📊 Database synced successfully');
    }
    
    return true;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error);
    
    // More detailed error logging
    if (error.name === 'SequelizeConnectionRefusedError') {
      console.error('📋 Connection refused - check if MySQL server is running');
    } else if (error.name === 'SequelizeAccessDeniedError') {
      console.error('📋 Access denied - check database credentials');
    } else if (error.name === 'SequelizeDatabaseError') {
      console.error('📋 Database error - check if database exists');
    }
    
    // Don't exit immediately in development, allow retries
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return false;
  }
};

// Graceful shutdown
export const closeDB = async () => {
  try {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
};

export default sequelize;