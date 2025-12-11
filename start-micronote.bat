@echo off
echo ================================
echo   MicroNote Application Startup
echo ================================

echo.
echo Starting Frontend (React)...
cd frontend
start "MicroNote Frontend" cmd /k "npm run dev"
cd ..

echo.
echo Starting Backend (Node.js + Express)...
cd Backend
start "MicroNote Backend" cmd /k "npm run dev"
cd ..

echo.
echo ================================
echo   Services Starting...
echo ================================
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5000
echo Health:   http://localhost:5000/api/health
echo ================================
echo.
echo Press any key to continue...
pause