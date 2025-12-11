import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

// Import database connection
import { connectDB, closeDB } from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import notesRoutes from './routes/notes.js';
import todosRoutes from './routes/todos.js';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 5000;

// No need for manual table creation - Sequelize will handle this

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/todos', todosRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MicroNote Backend API is running',
    database: 'MySQL',
    timestamp: new Date().toISOString()
  });
});

// Function to kill process on port
async function killPortProcess(port) {
  if (process.platform === 'win32') {
    try {
      // Find process using the port
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.trim().split('\n');
      
      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          
          if (pid && !isNaN(pid)) {
            console.log(`🔧 Killing process ${pid} on port ${port}...`);
            await execAsync(`taskkill /F /PID ${pid}`);
            console.log(`✅ Process ${pid} killed successfully`);
            // Wait for port to be released
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    } catch (err) {
      // Port is free or error finding process
      console.log(`ℹ️ Port ${port} is available`);
    }
  }
}

// Start server function
async function startServer() {
  try {
    // Clean up port before starting
    console.log(`🧹 Checking port ${PORT}...`);
    await killPortProcess(PORT);
    
    // Connect to database using Sequelize
    const connected = await connectDB();
    if (!connected) {
      console.error('❌ Failed to connect to MySQL database');
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 API Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🗄️ Database: MySQL`);
      console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is still in use after cleanup attempt`);
        console.log(`💡 Manual fix: taskkill /F /IM node.exe`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', err);
        throw err;
      }
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      console.log(`\n🛑 ${signal} received, shutting down gracefully...`);
      
      // Close database connection
      await closeDB();
      
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        console.error('⚠️ Forcing shutdown...');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;