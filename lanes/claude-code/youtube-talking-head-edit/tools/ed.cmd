@echo off
rem Runs the toolkit with its own Python (set up by setup.ps1). Usage: tools\ed.cmd <command> [args]
set "EDPY=%LOCALAPPDATA%\everygen-edit\venv\Scripts\python.exe"
if not exist "%EDPY%" (
  echo Run tools\setup.ps1 first. 1>&2
  exit /b 2
)
"%EDPY%" "%~dp0ed.py" %*
