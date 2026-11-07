@echo off
REM One-click launcher for the React-only demo (no Python needed at runtime).
cd /d "%~dp0"
if not exist node_modules ( call npm install || goto :error )
if not exist dist\index.html ( call npm run build || goto :error )
echo Demo at http://localhost:4173  (Ctrl+C to stop)
start "" http://localhost:4173
call npm run preview -- --port 4173
goto :eof
:error
echo Something failed - see the messages above.
pause
