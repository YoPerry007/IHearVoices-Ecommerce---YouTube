@echo off
echo 🚀 Starting Ghana Voice ML Service (Simple Version)...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo ✅ Python found:
python --version

echo.
echo 📦 Creating virtual environment...
if not exist "venv" (
    python -m venv venv
)

echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

echo 📚 Installing simplified dependencies...
pip install --upgrade pip
pip install -r requirements_simple.txt

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    echo.
    echo 🔧 Troubleshooting:
    echo - Make sure you have internet connection
    echo - Try running: pip install --upgrade pip
    echo - Some packages may require additional system dependencies
    pause
    exit /b 1
)

echo.
echo 🎤 Starting Ghana Voice ML Service (Simple Version)...
echo 🌐 Service will be available at: http://localhost:5000
echo 🇬🇭 Optimized for Ghana accents and pronunciations
echo.
echo ⚠️  Note: This is a simplified version without some advanced features
echo    but it will work without C++ build tools
echo.

python simple_voice_service.py

pause
