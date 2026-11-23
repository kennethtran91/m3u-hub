@echo off
chcp 65001 >nul
setlocal enableextensions

set "REG_ROOT=HKCU\Software\Classes\m3uhub"
set "INSTALL_DIR=%LOCALAPPDATA%\m3u-hub"
set "RET=0"

set "WAIT=no"
for /f %%A in ('powershell.exe -NoProfile -Command "if ([Console]::IsInputRedirected) { 'no' } else { 'yes' }" 2^>nul') do set "WAIT=%%A"

echo.
echo === M3U Hub : gỡ protocol m3uhub:// ===
echo.

reg query "%REG_ROOT%" >nul 2>nul
if errorlevel 1 (
  echo [THÔNG TIN] Protocol m3uhub:// chưa được đăng ký trên máy này.
  echo              Không có gì để gỡ.
  echo.
  goto :done
)

reg delete "%REG_ROOT%" /f >nul
if errorlevel 1 (
  echo [LỖI] Không xoá được key:
  echo        %REG_ROOT%
  echo        Có thể key đang bị khoá. Đóng app đang mở rồi chạy lại.
  echo.
  set "RET=1"
  goto :done
)

echo [OK] Đã gỡ protocol m3uhub:// (key %REG_ROOT% đã xoá).
echo      Từ giờ nút "Mở VLC" không còn mở app nữa — hãy dùng nút "Tải .m3u".
echo.

rem Registry key is gone, so it is now safe to remove the handler that was
rem copied into %LOCALAPPDATA% by register.cmd, plus its log. This only runs
rem after the key delete above succeeds, so a clone that still registers the
rem protocol (another install) is never affected by running this script.
if exist "%INSTALL_DIR%" (
  rd /s /q "%INSTALL_DIR%" >nul 2>nul
  if exist "%INSTALL_DIR%" (
    echo [CẢNH BÁO] Không xoá được thư mục cài:
    echo             "%INSTALL_DIR%"
    echo             Protocol đã gỡ xong; xoá thư mục này bằng tay nếu muốn dọn sạch.
    echo.
  ) else (
    echo [OK] Đã xoá handler + log tại "%INSTALL_DIR%".
    echo.
  )
)

:done
if /i "%WAIT%"=="yes" pause
exit /b %RET%
