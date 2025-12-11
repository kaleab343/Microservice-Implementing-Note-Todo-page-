@echo off
echo 🚀 Starting MicroNote Microservices...

REM Create necessary directories
if not exist logs mkdir logs

REM Start services in development mode
echo 📦 Building and starting services...
docker-compose up --build -d

echo ⏳ Waiting for services to start...
timeout /t 10 /nobreak > nul

REM Check service health
echo 🔍 Checking service health...
docker-compose ps

echo.
echo 🎉 MicroNote is starting up!
echo.
echo 📱 Frontend: http://localhost
echo 🔧 API Gateway: http://localhost:8080/health
echo 🔐 Auth Service: http://localhost:3001/health
echo 📝 Notes Service: http://localhost:3002/health
echo ✅ Todos Service: http://localhost:3003/health
echo 👤 User Service: http://localhost:3004/health
echo.
echo 📊 View logs: docker-compose logs -f [service-name]
echo 🛑 Stop all: docker-compose down

pause