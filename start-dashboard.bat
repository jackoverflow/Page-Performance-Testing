@echo off
echo 🚀 Starting Page Speed Dashboard...
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not installed. Please install npm first.
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Check if Playwright browsers are installed
if not exist "node_modules\playwright\.local-browsers" (
    echo 🌐 Installing Playwright browsers...
    npx playwright install
)

echo 🎯 Starting dashboard server...
echo 📊 Dashboard will be available at: http://localhost:3001
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the dashboard
npm start