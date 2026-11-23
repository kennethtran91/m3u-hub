// Regenerates public/downloads/install-m3uhub-vlc.cmd from protocol/handler.ps1.
//
// The installer must work standalone, on any machine, without the repo
// present and without admin rights. It embeds the exact bytes of
// handler.ps1 (UTF-8 with BOM) as base64 text lines appended with plain
// batch `>>` echo, then decodes them with PowerShell
// [Convert]::FromBase64String on the *concatenation* of those lines — so
// line endings / trailing newlines inserted by batch echo never matter.
//
// Run with `node scripts/build-installer.mjs`. Wired into prebuild/pretest
// in package.json so the committed .cmd can never drift from handler.ps1
// (also enforced at test time by src/lib/__tests__/installer.test.ts).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

const HANDLER_PATH = path.join(root, 'protocol', 'handler.ps1')
const OUT_PATH = path.join(root, 'public', 'downloads', 'install-m3uhub-vlc.cmd')

// Keep lines short: cmd has a ~8191 char line limit and very long single
// `echo` lines are fragile across cmd.exe versions.
const CHUNK_WIDTH = 76

function buildInstaller() {
  const handlerBytes = readFileSync(HANDLER_PATH)
  const hasBom = handlerBytes[0] === 0xef && handlerBytes[1] === 0xbb && handlerBytes[2] === 0xbf
  if (!hasBom) {
    throw new Error('protocol/handler.ps1 must be UTF-8 WITH BOM (installer payload contract).')
  }

  const base64 = handlerBytes.toString('base64')
  const lines = []
  for (let i = 0; i < base64.length; i += CHUNK_WIDTH) {
    lines.push(base64.slice(i, i + CHUNK_WIDTH))
  }

  const payloadEchoLines = lines.map((line) => `echo ${line}>>"%PAYLOAD%"`).join('\r\n')

  const script = `@echo off
chcp 65001 >nul
setlocal enableextensions enabledelayedexpansion

rem M3U Hub - bo cai dat 1-file cho protocol m3uhub:// (mo VLC tu trinh duyet).
rem Khong can repo, khong can quyen admin. Chi dung cmd + powershell co san.
rem File nay duoc SINH TU DONG boi scripts/build-installer.mjs tu
rem protocol/handler.ps1 - KHONG sua tay, chay "npm run sync:installer".

set "INSTALL_DIR=%LOCALAPPDATA%\\m3u-hub"
set "DEST=%INSTALL_DIR%\\handler.ps1"
set "PAYLOAD=%TEMP%\\m3uhub-handler-b64-%RANDOM%.txt"
set "REG_ROOT=HKCU\\Software\\Classes\\m3uhub"
set "RET=0"

set "WAIT=no"
for /f %%A in ('powershell.exe -NoProfile -Command "if ([Console]::IsInputRedirected) { 'no' } else { 'yes' }" 2^>nul') do set "WAIT=%%A"

echo.
echo === M3U Hub : bo cai dat VLC (m3uhub://) - khong can repo, khong can admin ===
echo.

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%" >nul 2>nul
if not exist "%INSTALL_DIR%" (
  echo [LOI] Khong tao duoc thu muc: "%INSTALL_DIR%"
  echo        Kiem tra quyen ghi %%LOCALAPPDATA%% roi chay lai.
  set "RET=1"
  goto :done
)

if exist "%PAYLOAD%" del /f /q "%PAYLOAD%" >nul 2>nul
${payloadEchoLines}

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $b64 = (Get-Content -LiteralPath $env:PAYLOAD -Raw) -replace '\\s', ''; [IO.File]::WriteAllBytes($env:DEST, [Convert]::FromBase64String($b64))"
if errorlevel 1 (
  echo [LOI] Khong ghi duoc handler.ps1 toi: "%DEST%"
  del /f /q "%PAYLOAD%" >nul 2>nul
  set "RET=1"
  goto :done
)
del /f /q "%PAYLOAD%" >nul 2>nul

if not exist "%DEST%" (
  echo [LOI] Khong thay file handler sau khi ghi: "%DEST%"
  set "RET=1"
  goto :done
)

echo [OK] Da ghi handler: "%DEST%"
echo.

set "VLC="
for %%K in (
  "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\vlc.exe"
  "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\vlc.exe"
  "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths\\vlc.exe"
) do (
  if not defined VLC (
    for /f "tokens=2,*" %%A in ('reg query %%K /ve 2^>nul') do (
      if /i "%%A"=="REG_SZ" set "VLC=%%B"
    )
  )
)
if defined VLC set "VLC=%VLC:"=%"
if defined VLC if not exist "%VLC%" set "VLC="
if not defined VLC if exist "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe" set "VLC=C:\\Program Files\\VideoLAN\\VLC\\vlc.exe"
if not defined VLC if exist "C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe" set "VLC=C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe"

if not defined VLC (
  echo [CANH BAO] Khong tim thay VLC tren may nay.
  echo             Protocol van duoc dang ky; bam "Mo VLC" se bao thieu VLC toi khi ban cai.
  echo             Tai VLC mien phi tai: https://www.videolan.org/vlc/
  echo.
) else (
  echo [OK] Tim thay VLC: "%VLC%"
  echo.
)

set "CMD=powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \\"%DEST%\\" \\"%%1\\""
set CMD_DISPLAY=powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%DEST%" "%%1"

reg add "%REG_ROOT%" /ve /t REG_SZ /d "URL:M3U Hub stream" /f >nul
if errorlevel 1 goto :regfail
reg add "%REG_ROOT%" /v "URL Protocol" /t REG_SZ /d "" /f >nul
if errorlevel 1 goto :regfail
reg add "%REG_ROOT%\\shell\\open\\command" /ve /t REG_SZ /d "%CMD%" /f >nul
if errorlevel 1 goto :regfail

echo [OK] Da dang ky protocol m3uhub:// cho user hien tai (khong can quyen admin).
echo.
echo   %REG_ROOT%\\shell\\open\\command
echo     (Default) = %CMD_DISPLAY%
echo.
echo   Mo app M3U Hub, bam "Mo VLC" tren mot nguon de thu.
echo   Go bo: xoa key registry o tren va thu muc "%INSTALL_DIR%".
echo.
goto :done

:regfail
echo [LOI] Khong ghi duoc registry key: %REG_ROOT%
echo        Kiem tra quyen ghi HKCU roi chay lai.
set "RET=1"

:done
if /i "%WAIT%"=="yes" pause
exit /b %RET%
`

  mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  // CRLF line endings: this is a Windows batch file.
  const normalized = script.replace(/\r?\n/g, '\r\n')
  writeFileSync(OUT_PATH, normalized, { encoding: 'utf8' })

  const sizeKb = (Buffer.byteLength(normalized, 'utf8') / 1024).toFixed(1)
  console.log(`[sync:installer] wrote ${path.relative(root, OUT_PATH)} (${sizeKb} KB, payload ${lines.length} lines)`)
}

buildInstaller()
