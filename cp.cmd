@echo off
REM Windows cp wrapper for sandcastle
REM Translates cp -r src dest → xcopy /E /I /H /Y src dest
setlocal enabledelayedexpansion
set "SRC="
set "DEST="
set "RECURSIVE="

:parse
if "%~1"=="" goto :execute
if "%~1"=="-r" (set "RECURSIVE=1" & shift & goto :parse)
if "%~1"=="-R" (set "RECURSIVE=1" & shift & goto :parse)
if "%~1"=="-f" (shift & goto :parse)
if "%SRC%"=="" (set "SRC=%~1" & shift & goto :parse)
set "DEST=%~1"
shift
goto :parse

:execute
if "%RECURSIVE%"=="1" (
  xcopy "%SRC%" "%DEST%" /E /I /H /Y /Q
) else (
  copy /Y "%SRC%" "%DEST%" >nul
)
exit /b %ERRORLEVEL%
