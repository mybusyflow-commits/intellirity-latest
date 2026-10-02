@echo off
REM Intellirity — landing page + dashboard console (production server)
REM Double-click this file. Then open http://localhost:3000
REM The dashboard opens from the "Open Dashboard" button, or directly:
REM http://localhost:3000/console
cd /d "%~dp0"
if not exist ".next" (
  echo First run: building Intellirity (one time, ~1 minute)...
  call npm run build
)
echo ============================================================
echo  Intellirity is running...
echo  Landing:   http://localhost:3000
echo  Dashboard: http://localhost:3000/console
echo  (Keep this window open while you use the site.)
echo ============================================================
call npm run start -- --port 3000
pause
