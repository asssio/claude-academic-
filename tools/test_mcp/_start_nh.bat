@echo off
setlocal

set "FRAM_FILE=%~1"
set "NODE_EXE=%~2"
set "INDEX_JS=%~3"

REM Use powershell to pump frame bytes and then keep pipe open forever
powershell -NoProfile -Command ^
  "$frame = [System.IO.File]::ReadAllBytes('%FRAM_FILE%'); ^
   $pipe = [System.IO.Pipe]::new('In', 'InOut'); ^
   $pipe.Write($frame, 0, $frame.Length); ^
   $pipe.Flush(); ^
   while($true) { Start-Sleep -Seconds 60 }"

