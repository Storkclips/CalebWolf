@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo   CALEB WOLF PHOTOGRAPHY - LOCAL SITE STARTER
echo ========================================================
echo.

:: Step 1: Make sure Node.js is installed
echo [STEP 1/2] Checking for Node.js...
node -v >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Node.js is installed.
    goto install_deps
)

echo [SETUP] Node.js was not found on this machine.
echo         Installing Node.js LTS now (click "Yes" if a Windows prompt appears).
winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
if %errorlevel% neq 0 (
    echo [ERROR] Could not install Node.js automatically.
    echo         Please install it from https://nodejs.org and run this file again.
    pause
    exit /b 1
)
echo [OK] Node.js installed.
echo.
echo --------------------------------------------------------
echo IMPORTANT: Close this window and run setup-and-run.bat
echo again so Windows can see the freshly installed Node.js.
echo --------------------------------------------------------
pause
exit /b 0

:install_deps
echo.
echo [STEP 2/2] Checking project packages...
if not exist node_modules (
    echo        First run - downloading packages, this can take a few minutes...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Package install failed. Check your internet connection and try again.
        pause
        exit /b 1
    )
) else (
    echo [OK] Packages already installed.
)

:start_server
echo.
echo ========================================================
echo   Starting your local website...
echo.
echo   The site will open at:  http://localhost:5173
echo.
echo   - Same database as your published site
echo   - Stripe runs in TEST mode (use test card 4242 4242 4242 4242,
echo     any future expiry, any 3-digit code). No real money moves.
echo.
echo   Keep this window open while using the site.
echo   Press Ctrl+C here (or just close the window) to stop it.
echo ========================================================
echo.
start "" http://localhost:5173
call npm run dev -- --host
echo.
echo Server stopped.
pause
