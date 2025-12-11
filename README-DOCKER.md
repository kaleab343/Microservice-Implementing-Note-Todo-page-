# 🐳 MicroNote - Docker Microservices Setup

## 📋 Architecture Overview

MicroNote has been architected as a complete microservices solution using Docker:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway    │    │   Load Balancer │
│   (React)       │    │   (Express)      │    │   (Nginx)       │
│   Port: 3000    │    │   Port: 8080     │    │   Port: 80/443  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
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
    │                        │                   │                    │
    ▼                        ▼                   ▼                    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   MySQL     │    │   Redis     │    │   Nginx     │    │   Docker    │
│   Database  │    │   Cache     │    │Load Balancer│    │   Network   │
│   Port:3306 │    │   Port:6379 │    │   Port:80   │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed
- Docker Compose available
- At least 4GB RAM available

### 1️⃣ Clone and Setup
```bash
# Navigate to your project directory
cd micronote

# Copy environment file
cp .env.example .env

# (Optional) Edit .env file with your configurations
```

### 2️⃣ Start All Services
```bash
# Option 1: Use the startup script (Linux/Mac)
chmod +x docker-scripts/start.sh
./docker-scripts/start.sh

# Option 2: Use Windows batch file
docker-scripts/dev-start.bat

# Option 3: Manual Docker Compose
docker-compose up --build -d
```

### 3️⃣ Access Your Application
- **Frontend Application**: http://localhost
- **API Gateway**: http://localhost:8080
- **Direct Service Health Checks**:
  - Auth: http://localhost:3001/health
  - Notes: http://localhost:3002/health
  - Todos: http://localhost:3003/health
  - Users: http://localhost:3004/health

## 🏗️ Microservices Breakdown

### 🔐 Auth Service (Port 3001)
- **Purpose**: User authentication & JWT management
- **Features**:
  - User registration/login
  - JWT token generation & refresh
  - Password hashing with bcrypt
  - Token blacklisting via Redis
- **Endpoints**: `/register`, `/login`, `/refresh`, `/logout`, `/verify`

### 📝 Notes Service (Port 3002)
- **Purpose**: Notes management and storage
- **Features**:
  - CRUD operations for notes
  - Search functionality
  - Tagging system
  - Pin/Archive notes
  - Redis caching for performance
- **Endpoints**: `/`, `/search`, `/:id`

### ✅ Todos Service (Port 3003)
- **Purpose**: Todo/task management
- **Features**:
  - CRUD operations for todos
  - Priority levels (low/medium/high)
  - Due date tracking
  - Categories and completion status
  - Statistics and analytics
- **Endpoints**: `/`, `/:id/toggle`, `/stats`, `/:id`

### 👤 User Service (Port 3004)
- **Purpose**: User profile management
- **Features**:
  - Profile updates
  - Password changes
  - Account deletion
  - User statistics
- **Endpoints**: `/me`, `/me/password`, `/me/stats`

### 🌐 API Gateway (Port 8080)
- **Purpose**: Central routing and cross-cutting concerns
- **Features**:
  - Request routing to appropriate services
  - Authentication middleware
  - Rate limiting
  - Request logging
  - Service health monitoring
  - Redis-based caching

### 📱 Frontend (Port 3000 → 80)
- **Purpose**: React-based user interface
- **Features**:
  - Modern React with Hooks
  - API integration via fetch
  - JWT token management
  - Real-time UI updates
  - Responsive design

## 🔧 Development Workflow

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service
docker-compose logs -f notes-service
docker-compose logs -f api-gateway
```

### Restart a Service
```bash
# Restart specific service
docker-compose restart auth-service

# Rebuild and restart
docker-compose up --build -d auth-service
```

### Scale Services
```bash
# Scale notes service to 3 instances
docker-compose up -d --scale notes-service=3

# Scale multiple services
docker-compose up -d --scale notes-service=2 --scale todos-service=2
```

### Database Management
```bash
# Access MySQL
docker-compose exec mysql mysql -u micronote_user -p micronote

# Backup database
docker-compose exec mysql mysqldump -u root -p micronote > backup.sql

# Access Redis
docker-compose exec redis redis-cli
```

## 🚀 Production Deployment

### 1️⃣ Environment Configuration
```bash
# Update .env for production
NODE_ENV=production
JWT_SECRET=your_very_long_and_secure_production_secret_key
DB_PASSWORD=your_secure_database_password
```

### 2️⃣ SSL Configuration
```bash
# Add SSL certificates to nginx/ssl/
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem

# Uncomment SSL server block in nginx/nginx.conf
```

### 3️⃣ Production Build
```bash
# Build for production
docker-compose -f docker-compose.yml build

# Start in production mode
docker-compose up -d
```

## 📊 Monitoring & Health

### Service Health Checks
```bash
# Check all service health
curl http://localhost:8080/health

# Individual service health
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # Notes
curl http://localhost:3003/health  # Todos
curl http://localhost:3004/health  # Users
```

### Container Status
```bash
# View running containers
docker-compose ps

# View resource usage
docker stats

# View container details
docker-compose logs [service-name]
```

## 🛑 Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# Stop and remove everything
docker-compose down --rmi all -v --remove-orphans
```

## 🔍 Troubleshooting

### Common Issues

**Services not starting:**
```bash
# Check Docker daemon
docker ps

# Check logs
docker-compose logs

# Rebuild containers
docker-compose build --no-cache
```

**Database connection issues:**
```bash
# Verify MySQL is running
docker-compose ps mysql

# Check MySQL logs
docker-compose logs mysql

# Test connection
docker-compose exec mysql mysql -u root -p
```

**Port conflicts:**
```bash
# Check what's using ports
netstat -an | findstr ":3001"  # Windows
lsof -i :3001                  # Mac/Linux

# Change ports in docker-compose.yml if needed
```

## 🎯 Next Steps

1. **Add monitoring** (Prometheus, Grafana)
2. **Implement logging** (ELK stack)
3. **Add message queues** (RabbitMQ, Apache Kafka)
4. **Set up CI/CD** (GitHub Actions, Jenkins)
5. **Container orchestration** (Kubernetes)
6. **Security hardening** (Vault, security scanning)

## 📚 Documentation

- [Frontend Documentation](frontend/README.md)
- [Backend Documentation](Backend/README.md)
- [Database Schema](DB/database-structure.md)
- [API Documentation](docs/API.md)

Your MicroNote application is now running as a scalable, containerized microservices architecture! 🎉