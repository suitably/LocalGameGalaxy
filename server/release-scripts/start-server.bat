@echo off
title Melodiq Server Launcher
cd /d "%~dp0"

echo Checking port 3000...
netstat -ano | findstr :3000 >nul 2>&1
if %errorlevel%==0 (
    echo [WARNING] Port 3000 appears to be in use.
    echo The Melodiq Server requires port 3000 to be free.
    echo Please close any application using this port and try again.
    echo.
    echo Press any key to continue anyway...
    pause
)

echo Starting Melodiq Server...
melodiq-server-win.exe

echo.
echo Server has stopped.
pause
