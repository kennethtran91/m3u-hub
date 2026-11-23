@echo off
chcp 65001 >nul
setlocal enableextensions

set "REG_ROOT=HKCU\Software\Classes\m3uhub"
set "SRC=%~dp0handler.ps1"
set "INSTALL_DIR=%LOCALAPPDATA%\m3u-hub"
set "DEST=%INSTALL_DIR%\handler.ps1"
set "RET=0"

rem Double-click keeps the window open; piped/git-bash runs must never block.
set "WAIT=no"
for /f %%A in ('powershell.exe -NoProfile -Command "if ([Console]::IsInputRedirected) { 'no' } else { 'yes' }" 2^>nul') do set "WAIT=%%A"

echo.
echo === M3U Hub : đăng ký protocol m3uhub:// (chỉ cho user hiện tại) ===
echo.

if not exist "%SRC%" (
  echo [LỖI] Không tìm thấy handler.ps1 cạnh file này:
  echo        "%SRC%"
  echo        Hãy chạy register.cmd ngay trong thư mục protocol của dự án.
  echo.
  set "RET=1"
  goto :done
)

rem Handler sống ngoài clone, trong %LOCALAPPDATA%, để registry không phụ thuộc
rem vào đường dẫn cài dự án (clone ở đâu cũng đăng ký được).
if not exist "%INSTALL_DIR%" (
  mkdir "%INSTALL_DIR%" >nul 2>nul
)
if not exist "%INSTALL_DIR%" (
  echo [LỖI] Không tạo được thư mục:
  echo        "%INSTALL_DIR%"
  echo        Kiểm tra quyền ghi %%LOCALAPPDATA%% rồi chạy lại.
  echo.
  set "RET=1"
  goto :done
)

copy /Y "%SRC%" "%DEST%" >nul
if errorlevel 1 (
  echo [LỖI] Không sao chép được handler.ps1 tới:
  echo        "%DEST%"
  echo        Kiểm tra quyền ghi %%LOCALAPPDATA%%\m3u-hub rồi chạy lại.
  echo.
  set "RET=1"
  goto :done
)

rem ---- tìm VLC: App Paths (HKLM, HKCU, WOW6432Node) rồi 2 thư mục cài mặc định ----
set "VLC="
for %%K in (
  "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\vlc.exe"
  "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\vlc.exe"
  "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\vlc.exe"
) do (
  if not defined VLC (
    for /f "tokens=2,*" %%A in ('reg query %%K /ve 2^>nul') do (
      if /i "%%A"=="REG_SZ" set "VLC=%%B"
    )
  )
)
if defined VLC set "VLC=%VLC:"=%"
if defined VLC if not exist "%VLC%" set "VLC="

if not defined VLC if exist "C:\Program Files\VideoLAN\VLC\vlc.exe" set "VLC=C:\Program Files\VideoLAN\VLC\vlc.exe"
if not defined VLC if exist "C:\Program Files (x86)\VideoLAN\VLC\vlc.exe" set "VLC=C:\Program Files (x86)\VideoLAN\VLC\vlc.exe"

if not defined VLC (
  echo [CẢNH BÁO] Không tìm thấy VLC trên máy này.
  echo             Protocol vẫn được đăng ký, nhưng bấm "Mở VLC" sẽ chỉ hiện hộp thoại
  echo             báo thiếu VLC.
  echo             Tải VLC tại: https://www.videolan.org/vlc/
  echo.
) else (
  echo [OK] Tìm thấy VLC: "%VLC%"
  echo.
)

rem CMD holds the value written to the registry (\" is a literal quote for reg.exe).
set "CMD=powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%DEST%\" \"%%1\""
set CMD_DISPLAY=powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%DEST%" "%%1"

reg add "%REG_ROOT%" /ve /t REG_SZ /d "URL:M3U Hub stream" /f >nul
if errorlevel 1 goto :failed

reg add "%REG_ROOT%" /v "URL Protocol" /t REG_SZ /d "" /f >nul
if errorlevel 1 goto :failed

reg add "%REG_ROOT%\shell\open\command" /ve /t REG_SZ /d "%CMD%" /f >nul
if errorlevel 1 goto :failed

echo [OK] Đã đăng ký protocol m3uhub:// cho user hiện tại (không cần quyền admin).
echo.
echo   Key đã ghi:
echo     %REG_ROOT%
echo       (Default)      = URL:M3U Hub stream
echo       URL Protocol   = (chuỗi rỗng)
echo     %REG_ROOT%\shell\open\command
echo       (Default)      = %CMD_DISPLAY%
echo.
echo   Handler đã cài ở: "%DEST%"
echo   Gỡ bỏ sau này: chạy unregister.cmd cùng thư mục (file ở trên chỉ bị xoá khi key cũng đã bị xoá).
echo   Thử ngay: mở app, bấm "Mở VLC" trên một nguồn có referrer.
echo.
goto :done

:failed
echo.
echo [LỖI] Không ghi được registry key:
echo        %REG_ROOT%
echo        Kiểm tra quyền ghi HKCU rồi chạy lại.
echo.
set "RET=1"

:done
if /i "%WAIT%"=="yes" pause
exit /b %RET%
