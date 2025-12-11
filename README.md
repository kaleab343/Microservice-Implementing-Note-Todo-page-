# 📝 MicroNote - Microservices Note & Todo Application

[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-00000F?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

A modern, scalable **microservices architecture** for managing notes and todos, built with **Docker**, **React**, and **Node.js**. Features JWT authentication, real-time updates, and enterprise-grade scalability.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway    │    │   Load Balancer │
│   (React)       │◄──►│   (Express)      │◄──►│   (Nginx)       │
│   Port: 3000    │    │   Port: 8080     │    │   Port: 80/443  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                  │
    ┌─────────────────────────────┼─────────────────────────────┐
    │                             │                             │
    ▼                             ▼                             ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│Auth Service │    │Notes Service│    │Todos Service│    │User Service │
│Port: 3001   │    │Port: 3002   │    │Port: 3003   │    │Port: 3004   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
         │                   │                   │                   │
         └───────────────────┼───────────────────┼───────────────────┘
                             │                   │
    ┌────────────────────────┼───────────────────┼────────────────────┐
    ▼                        ▼                   ▼                    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   MySQL     │    │   Redis     │    │   Docker    │    │   Docker    │
│   Database  │    │   Cache     │    │   Network   │    │   Volumes   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## ✨ Features

### 🔐 **Authentication & Security**
- **JWT Authentication** with refresh tokens
- **Password hashing** with bcrypt (salt factor 12)
- **Rate limiting** and DDoS protection
- **CORS protection** and security headers
- **Token blacklisting** via Redis

### 📝 **Notes Management**
- **Create, edit, delete** notes
- **Rich text support** with markdown
- **Tagging system** for organization
- **Pin important** notes to top
- **Archive/restore** functionality
- **Full-text search** across all notes
- **Real-time updates** across devices

### ✅ **Todo Management**
- **CRUD operations** for todos
- **Priority levels** (Low, Medium, High)
- **Due date tracking** with notifications
- **Category organization**
- **Completion tracking** with timestamps
- **Progress statistics** and analytics
- **Bulk operations** support

### ⚡ **Performance & Scalability**
- **Redis caching** for improved response times
- **Database connection pooling**
- **Horizontal scaling** support
- **Load balancing** with Nginx
- **Health monitoring** for all services
- **Graceful shutdown** handling

### 🛠️ **DevOps Ready**
- **Docker containerization** for all services
- **Docker Compose** orchestration
- **Environment-based configuration**
- **Automated health checks**
- **Centralized logging**
- **Service discovery** and communication

## 🚀 Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed
- [Git](https://git-scm.com/) for cloning the repository
- At least **4GB RAM** available for containers

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/micronote.git
cd micronote
```

### 2️⃣ Setup Environment
```bash
# Copy environment template
cp .env.example .env

# (Optional) Customize your environment variables
# Edit .env file with your preferred settings
```

### 3️⃣ Start All Services
```bash
# Option 1: One-command setup (Linux/Mac)
chmod +x quick-start.sh
./quick-start.sh

# Option 2: Windows batch file
docker-scripts\dev-start.bat

# Option 3: Manual Docker Compose
docker-compose up --build -d
```

### 4️⃣ Access Your Application
- **🌐 Main Application**: [http://localhost](http://localhost)
- **🔧 API Gateway**: [http://localhost:8080/health](http://localhost:8080/health)
- **📊 Service Health**: Check all services health status

## 🏗️ Microservices Architecture

| Service | Port | Purpose | Key Features |
|---------|------|---------|-------------|
| **🔐 Auth Service** | 3001 | Authentication & JWT management | Login, Registration, Token refresh, Password security |
| **📝 Notes Service** | 3002 | Notes CRUD & search | Create/edit/delete notes, Search, Tags, Pin/Archive |
| **✅ Todos Service** | 3003 | Todo management & analytics | CRUD operations, Priorities, Due dates, Statistics |
| **👤 User Service** | 3004 | User profile management | Profile updates, Password change, Account deletion |
| **🌐 API Gateway** | 8080 | Request routing & middleware | Authentication, Rate limiting, Request logging |
| **📱 Frontend** | 80 | React user interface | Modern UI, Real-time updates, Responsive design |

### 🗄️ **Database Schema**

```sql
-- Users table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  username VARCHAR(20) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Notes table  
CREATE TABLE notes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  text TEXT NOT NULL,
  user_id INT NOT NULL,
  tags JSON,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Todos table
CREATE TABLE todos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  text VARCHAR(200) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  user_id INT NOT NULL,
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  due_date DATETIME NULL,
  category VARCHAR(30) NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🛠️ Development

### 📋 **Available Commands**

```bash
# Using Makefile (recommended)
make help              # Show all available commands
make dev               # Start development environment
make status            # Check service status
make logs-auth         # View auth service logs
make scale-notes       # Scale notes service to 3 instances
make clean             # Clean up Docker resources

# Using Docker Compose directly
docker-compose ps              # Check service status
docker-compose logs -f         # View all logs
docker-compose restart auth-service  # Restart specific service
docker-compose down            # Stop all services
```

### 🔧 **Individual Service Development**

```bash
# Access service containers
docker-compose exec auth-service sh
docker-compose exec notes-service sh

# View specific service logs
docker-compose logs -f auth-service
docker-compose logs -f notes-service

# Restart individual services
docker-compose restart notes-service
docker-compose up --build -d todos-service
```

### 📊 **Monitoring & Health**

```bash
# Check all service health
curl http://localhost:8080/health

# Individual service health checks
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Notes Service
curl http://localhost:3003/health  # Todos Service
curl http://localhost:3004/health  # User Service
```

## 🎯 API Documentation

### 🔐 **Authentication Endpoints**
```bash
POST /api/auth/register     # Register new user
POST /api/auth/login        # User login
POST /api/auth/refresh      # Refresh JWT token
POST /api/auth/logout       # User logout
GET  /api/auth/me          # Get current user info
```

### 📝 **Notes Endpoints**
```bash
GET    /api/notes              # Get all user notes
POST   /api/notes              # Create new note
PUT    /api/notes/:id          # Update note
DELETE /api/notes/:id          # Delete note
GET    /api/notes/search?q=    # Search notes
```

### ✅ **Todos Endpoints**
```bash
GET    /api/todos              # Get all user todos
POST   /api/todos              # Create new todo
PUT    /api/todos/:id          # Update todo
DELETE /api/todos/:id          # Delete todo
PATCH  /api/todos/:id/toggle   # Toggle completion
GET    /api/todos/stats        # Get todo statistics
```

### 👤 **User Endpoints**
```bash
GET    /api/users/me           # Get user profile
PUT    /api/users/me           # Update profile
PUT    /api/users/me/password  # Change password
DELETE /api/users/me           # Delete account
GET    /api/users/me/stats     # Get user statistics
```

## 🔧 Environment Variables

Create a `.env` file (copy from `.env.example`):

```env
# Database Configuration
DB_HOST=mysql
DB_PORT=3306
DB_NAME=micronote
DB_USER=micronote_user
DB_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# Service URLs
REACT_APP_API_URL=http://localhost:8080/api

# Node Environment
NODE_ENV=production
```

## 📈 Scaling & Production

### 🚀 **Horizontal Scaling**
```bash
# Scale individual services
docker-compose up -d --scale notes-service=3
docker-compose up -d --scale todos-service=2
docker-compose up -d --scale auth-service=2

# Scale back down
docker-compose up -d --scale notes-service=1
```

### 🔒 **Production Deployment**
```bash
# Set production environment
export NODE_ENV=production

# Use production compose file
docker-compose -f docker-compose.yml up --build -d

# Enable SSL (add certificates to nginx/ssl/)
# Uncomment SSL server block in nginx/nginx.conf
```

### 📊 **Performance Optimization**
- **Redis caching** enabled for frequently accessed data
- **Connection pooling** for database connections
- **Nginx compression** for static assets
- **Health checks** prevent traffic to unhealthy services
- **Graceful shutdowns** ensure no data loss

## 🧪 Testing

```bash
# Run basic health checks
make test

# Test individual services
curl -f http://localhost:8080/health
curl -f http://localhost:3001/health

# Load testing (using Apache Bench)
ab -n 1000 -c 10 http://localhost:8080/health
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create your feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### 🛠️ **Development Setup**
```bash
# Clone your fork
git clone https://github.com/yourusername/micronote.git
cd micronote

# Start development environment
make dev

# Make your changes and test
make test
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Docker** for containerization technology
- **Node.js** and **Express** for the backend services
- **React** for the modern frontend
- **MySQL** for reliable data persistence
- **Redis** for high-performance caching
- **Nginx** for load balancing and reverse proxy

## 🔗 Links

# 📝 MicroNote - Microservices Note & Todo Application

- **📚 [Docker Documentation](README-DOCKER.md)** - Detailed Docker setup guide
- **🏗️ [Architecture Guide](docs/ARCHITECTURE.md)** - Deep dive into the microservices architecture
- **🔧 [API Reference](docs/API.md)** - Complete API documentation
- **🚀 [Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions

## 📞 Support

If you have any questions or run into issues:

1. **Check the [Issues](https://github.com/yourusername/micronote/issues)** for existing solutions
2. **Create a new issue** if you found a bug
3. **Start a discussion** for feature requests

---

<div align="center">

**⭐ Star this repository if it helped you build something awesome! ⭐**

Made with ❤️ by [Kaleab Zelalem](https://github.com/yourusername)

</div>
