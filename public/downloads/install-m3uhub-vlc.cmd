@echo off
chcp 65001 >nul
setlocal enableextensions enabledelayedexpansion

rem M3U Hub - bo cai dat 1-file cho protocol m3uhub:// (mo VLC tu trinh duyet).
rem Khong can repo, khong can quyen admin. Chi dung cmd + powershell co san.
rem File nay duoc SINH TU DONG boi scripts/build-installer.mjs tu
rem protocol/handler.ps1 - KHONG sua tay, chay "npm run sync:installer".

set "INSTALL_DIR=%LOCALAPPDATA%\m3u-hub"
set "DEST=%INSTALL_DIR%\handler.ps1"
set "PAYLOAD=%TEMP%\m3uhub-handler-b64-%RANDOM%.txt"
set "REG_ROOT=HKCU\Software\Classes\m3uhub"
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
echo 77u/IyBNM1UgSHViIC0gV2luZG93cyBVUkkgaGFuZGxlciBmb3IgbTN1aHViOi8vcGxheQojCiMg>>"%PAYLOAD%"
echo SW52b2tlZCBieSB0aGUgc2hlbGwgYXM6CiMgICBwb3dlcnNoZWxsLmV4ZSAtTm9Qcm9maWxlIC1F>>"%PAYLOAD%"
echo eGVjdXRpb25Qb2xpY3kgQnlwYXNzIC1XaW5kb3dTdHlsZSBIaWRkZW4gLUZpbGUgaGFuZGxlci5w>>"%PAYLOAD%"
echo czEgIm0zdWh1YjovL3BsYXk/dT0uLi4iCiMKIyBXaW5kb3dzIFBvd2VyU2hlbGwgNS4xIG9ubHk6>>"%PAYLOAD%"
echo IG5vIGV4dGVybmFsIG1vZHVsZXMsIG5vIFN5c3RlbS5XZWIuCiMgQ29udHJhY3Q6IG9ubHkgaHR0>>"%PAYLOAD%"
echo cC9odHRwcy9ydG1wIHN0cmVhbSBVUkxzIGFyZSBhY2NlcHRlZDsgYW55dGhpbmcgdGhhdCBjb3Vs>>"%PAYLOAD%"
echo ZAojIGJlIHJlYWQgYXMgYSBWTEMgY29tbWFuZC1saW5lIG9wdGlvbiAoIi0uLi4iIC8gY29udHJv>>"%PAYLOAD%"
echo bCBjaGFycyAvIHF1b3RlcykgaXMgcmVmdXNlZCwKIyBiZWNhdXNlIGFueSB3ZWIgcGFnZSBjYW4g>>"%PAYLOAD%"
echo dHJpZ2dlciB0aGlzIHNjaGVtZS4KCiRFcnJvckFjdGlvblByZWZlcmVuY2UgPSAnU3RvcCcKCiRz>>"%PAYLOAD%"
echo Y3JpcHQ6TG9nRGlyID0gSm9pbi1QYXRoICRlbnY6TE9DQUxBUFBEQVRBICdtM3UtaHViJwokc2Ny>>"%PAYLOAD%"
echo aXB0OkxvZ1BhdGggPSBKb2luLVBhdGggJHNjcmlwdDpMb2dEaXIgJ3ZsYy1oYW5kbGVyLmxvZycK>>"%PAYLOAD%"
echo JFZMQ19ET1dOTE9BRF9VUkwgPSAnaHR0cHM6Ly93d3cudmlkZW9sYW4ub3JnL3ZsYy8nCgpmdW5j>>"%PAYLOAD%"
echo dGlvbiBXcml0ZS1IYW5kbGVyTG9nIHsKICAgIHBhcmFtKFtzdHJpbmddJE1lc3NhZ2UpCiAgICB0>>"%PAYLOAD%"
echo cnkgewogICAgICAgIGlmICgtbm90IChUZXN0LVBhdGggLUxpdGVyYWxQYXRoICRzY3JpcHQ6TG9n>>"%PAYLOAD%"
echo RGlyKSkgewogICAgICAgICAgICBOZXctSXRlbSAtSXRlbVR5cGUgRGlyZWN0b3J5IC1QYXRoICRz>>"%PAYLOAD%"
echo Y3JpcHQ6TG9nRGlyIC1Gb3JjZSB8IE91dC1OdWxsCiAgICAgICAgfQogICAgICAgICRsaW5lID0g>>"%PAYLOAD%"
echo J1t7MH1dIHsxfScgLWYgKEdldC1EYXRlIC1Gb3JtYXQgJ3l5eXktTU0tZGQgSEg6bW06c3MnKSwg>>"%PAYLOAD%"
echo JE1lc3NhZ2UKICAgICAgICBBZGQtQ29udGVudCAtTGl0ZXJhbFBhdGggJHNjcmlwdDpMb2dQYXRo>>"%PAYLOAD%"
echo IC1WYWx1ZSAkbGluZSAtRW5jb2RpbmcgVVRGOAogICAgfSBjYXRjaCB7CiAgICAgICAgIyBMb2dn>>"%PAYLOAD%"
echo aW5nIG11c3QgbmV2ZXIgYnJlYWsgdGhlIGhhbmRsZXIuCiAgICB9Cn0KCmZ1bmN0aW9uIFNob3ct>>"%PAYLOAD%"
echo UG9wdXAgewogICAgcGFyYW0oW3N0cmluZ10kTWVzc2FnZSkKICAgIHRyeSB7CiAgICAgICAgJHNo>>"%PAYLOAD%"
echo ZWxsID0gTmV3LU9iamVjdCAtQ29tT2JqZWN0IFdTY3JpcHQuU2hlbGwKICAgICAgICAjIDAgPSB3>>"%PAYLOAD%"
echo YWl0IGZvciBPSywgMTYgPSBzdG9wIGljb24KICAgICAgICAkc2hlbGwuUG9wdXAoJE1lc3NhZ2Us>>"%PAYLOAD%"
echo IDAsICdNM1UgSHViJywgMTYpIHwgT3V0LU51bGwKICAgIH0gY2F0Y2ggewogICAgICAgICMgTm8g>>"%PAYLOAD%"
echo aW50ZXJhY3RpdmUgZGVza3RvcCAoZS5nLiBzZXJ2aWNlIGNvbnRleHQpOiB0aGUgbG9nIGxpbmUg>>"%PAYLOAD%"
echo aXMgZW5vdWdoLgogICAgfQp9CgpmdW5jdGlvbiBGYWlsIHsKICAgIHBhcmFtKFtzdHJpbmddJFJl>>"%PAYLOAD%"
echo YXNvbiwgW3N0cmluZ10kVGl0bGUpCiAgICBpZiAoJFRpdGxlKSB7ICRSZWFzb24gPSAkUmVhc29u>>"%PAYLOAD%"
echo ICsgImBuYG5UcuG6rW46ICIgKyAkVGl0bGUgfQogICAgV3JpdGUtSGFuZGxlckxvZyAoJ0ZBSUw6>>"%PAYLOAD%"
echo ICcgKyAoJFJlYXNvbiAtcmVwbGFjZSAiYHI/YG4iLCAnIHwgJykpCiAgICBTaG93LVBvcHVwICgi>>"%PAYLOAD%"
echo S2jDtG5nIG3hu58gxJHGsOG7o2MgVkxDLmBuYG4iICsgJFJlYXNvbikKICAgIGV4aXQgMQp9Cgpm>>"%PAYLOAD%"
echo dW5jdGlvbiBHZXQtVmxjUGF0aCB7CiAgICAkY2FuZGlkYXRlcyA9IE5ldy1PYmplY3QgU3lzdGVt>>"%PAYLOAD%"
echo LkNvbGxlY3Rpb25zLkdlbmVyaWMuTGlzdFtzdHJpbmddCiAgICAka2V5cyA9IEAoCiAgICAgICAg>>"%PAYLOAD%"
echo J0hLTE06XFNPRlRXQVJFXE1pY3Jvc29mdFxXaW5kb3dzXEN1cnJlbnRWZXJzaW9uXEFwcCBQYXRo>>"%PAYLOAD%"
echo c1x2bGMuZXhlJywKICAgICAgICAnSEtDVTpcU09GVFdBUkVcTWljcm9zb2Z0XFdpbmRvd3NcQ3Vy>>"%PAYLOAD%"
echo cmVudFZlcnNpb25cQXBwIFBhdGhzXHZsYy5leGUnLAogICAgICAgICdIS0xNOlxTT0ZUV0FSRVxX>>"%PAYLOAD%"
echo T1c2NDMyTm9kZVxNaWNyb3NvZnRcV2luZG93c1xDdXJyZW50VmVyc2lvblxBcHAgUGF0aHNcdmxj>>"%PAYLOAD%"
echo LmV4ZScKICAgICkKICAgIGZvcmVhY2ggKCRrZXkgaW4gJGtleXMpIHsKICAgICAgICB0cnkgewog>>"%PAYLOAD%"
echo ICAgICAgICAgICAkaXRlbSA9IEdldC1JdGVtIC1MaXRlcmFsUGF0aCAka2V5IC1FcnJvckFjdGlv>>"%PAYLOAD%"
echo biBTdG9wCiAgICAgICAgICAgICR2YWx1ZSA9ICRpdGVtLkdldFZhbHVlKCcnKQogICAgICAgICAg>>"%PAYLOAD%"
echo ICBpZiAoJHZhbHVlKSB7CiAgICAgICAgICAgICAgICAkY2xlYW4gPSAoW3N0cmluZ10kdmFsdWUp>>"%PAYLOAD%"
echo LlRyaW0oKS5UcmltKCciJykKICAgICAgICAgICAgICAgIGlmICgkY2xlYW4pIHsgJGNhbmRpZGF0>>"%PAYLOAD%"
echo ZXMuQWRkKCRjbGVhbikgfQogICAgICAgICAgICB9CiAgICAgICAgfSBjYXRjaCB7CiAgICAgICAg>>"%PAYLOAD%"
echo ICAgICMgS2V5IGFic2VudDogdHJ5IHRoZSBuZXh0IHNvdXJjZS4KICAgICAgICB9CiAgICB9CiAg>>"%PAYLOAD%"
echo ICAkY2FuZGlkYXRlcy5BZGQoJ0M6XFByb2dyYW0gRmlsZXNcVmlkZW9MQU5cVkxDXHZsYy5leGUn>>"%PAYLOAD%"
echo KQogICAgJGNhbmRpZGF0ZXMuQWRkKCdDOlxQcm9ncmFtIEZpbGVzICh4ODYpXFZpZGVvTEFOXFZM>>"%PAYLOAD%"
echo Q1x2bGMuZXhlJykKCiAgICBmb3JlYWNoICgkY2FuZGlkYXRlIGluICRjYW5kaWRhdGVzKSB7CiAg>>"%PAYLOAD%"
echo ICAgICAgaWYgKC1ub3QgJGNhbmRpZGF0ZSkgeyBjb250aW51ZSB9CiAgICAgICAgaWYgKFRlc3Qt>>"%PAYLOAD%"
echo UGF0aCAtTGl0ZXJhbFBhdGggJGNhbmRpZGF0ZSAtUGF0aFR5cGUgTGVhZikgeyByZXR1cm4gJGNh>>"%PAYLOAD%"
echo bmRpZGF0ZSB9CiAgICB9CiAgICByZXR1cm4gJG51bGwKfQoKZnVuY3Rpb24gVGVzdC1TdHJlYW1V>>"%PAYLOAD%"
echo cmwgewogICAgcGFyYW0oW3N0cmluZ10kVXJsKQogICAgaWYgKFtzdHJpbmddOjpJc051bGxPcldo>>"%PAYLOAD%"
echo aXRlU3BhY2UoJFVybCkpIHsgcmV0dXJuICdUaGnhur91IHRoYW0gc+G7kSB1IChVUkwgc3RyZWFt>>"%PAYLOAD%"
echo KS4nIH0KICAgIGlmICgkVXJsLkxlbmd0aCAtZ3QgMjA0OCkgeyByZXR1cm4gJ1VSTCBzdHJlYW0g>>"%PAYLOAD%"
echo ZMOgaSBxdcOhIDIwNDgga8O9IHThu7EuJyB9CiAgICBpZiAoJFVybC5TdGFydHNXaXRoKCctJykp>>"%PAYLOAD%"
echo IHsgcmV0dXJuICdVUkwgc3RyZWFtIGLhuq90IMSR4bqndSBi4bqxbmcgIi0iIG7Dqm4gYuG7iyB0>>"%PAYLOAD%"
echo 4burIGNo4buRaSAoY2jhu5FuZyBjaMOobiB0aGFtIHPhu5EpLicgfQogICAgaWYgKCRVcmwgLW1h>>"%PAYLOAD%"
echo dGNoICdbXHgwMC1ceDFGXHg3Rl0nKSB7IHJldHVybiAnVVJMIHN0cmVhbSBjaOG7qWEga8O9IHTh>>"%PAYLOAD%"
echo u7EgxJFp4buBdSBraGnhu4NuLicgfQogICAgaWYgKCRVcmwuQ29udGFpbnMoJyInKSkgeyByZXR1>>"%PAYLOAD%"
echo cm4gJ1VSTCBzdHJlYW0gY2jhu6lhIGThuqV1IG5nb+G6t2Mga8OpcC4nIH0KICAgIGlmICgkVXJs>>"%PAYLOAD%"
echo IC1tYXRjaCAnXHMnKSB7IHJldHVybiAnVVJMIHN0cmVhbSBjaOG7qWEga2hv4bqjbmcgdHLhuq9u>>"%PAYLOAD%"
echo Zy4nIH0KICAgIGlmICgkVXJsIC1ub3RtYXRjaCAnXig/aSkoaHR0cHM/fHJ0bXApOi8vW14vPyNd>>"%PAYLOAD%"
echo KycpIHsKICAgICAgICByZXR1cm4gJ1VSTCBzdHJlYW0gcGjhuqNpIGzDoCBodHRwOi8vLCBodHRw>>"%PAYLOAD%"
echo czovLyBob+G6t2MgcnRtcDovLyB2w6AgY8OzIGhvc3QuJwogICAgfQogICAgcmV0dXJuICRudWxs>>"%PAYLOAD%"
echo Cn0KCmZ1bmN0aW9uIFRlc3QtSGVhZGVyVmFsdWUgewogICAgcGFyYW0oW3N0cmluZ10kVmFsdWUs>>"%PAYLOAD%"
echo IFtzdHJpbmddJExhYmVsKQogICAgaWYgKFtzdHJpbmddOjpJc051bGxPckVtcHR5KCRWYWx1ZSkp>>"%PAYLOAD%"
echo IHsgcmV0dXJuICRudWxsIH0KICAgIGlmICgkVmFsdWUuTGVuZ3RoIC1ndCAyMDQ4KSB7IHJldHVy>>"%PAYLOAD%"
echo biAiJExhYmVsIGTDoGkgcXXDoSAyMDQ4IGvDvSB04buxLiIgfQogICAgaWYgKCRWYWx1ZS5TdGFy>>"%PAYLOAD%"
echo dHNXaXRoKCctJykpIHsgcmV0dXJuICIkTGFiZWwgYuG6r3QgxJHhuqd1IGLhurFuZyAnLScgbsOq>>"%PAYLOAD%"
echo biBi4buLIHThu6sgY2jhu5FpIChjaOG7kW5nIGNow6huIHRoYW0gc+G7kSkuIiB9CiAgICBpZiAo>>"%PAYLOAD%"
echo JFZhbHVlIC1tYXRjaCAnW1x4MDAtXHgxRlx4N0YiXScpIHsgcmV0dXJuICIkTGFiZWwgY2jhu6lh>>"%PAYLOAD%"
echo IGvDvSB04buxIMSRaeG7gXUga2hp4buDbiBob+G6t2Mgbmdv4bq3YyBrw6lwLiIgfQogICAgcmV0>>"%PAYLOAD%"
echo dXJuICRudWxsCn0KCmZ1bmN0aW9uIFF1b3RlLUFyZyB7CiAgICAjIFN0YXJ0LVByb2Nlc3MgNS4x>>"%PAYLOAD%"
echo IGpvaW5zIHRoZSBhcnJheSB3aXRoIHBsYWluIHNwYWNlcywgc28gcXVvdGUgdmFsdWVzIHRoYXQK>>"%PAYLOAD%"
echo ICAgICMgY29udGFpbiB3aGl0ZXNwYWNlIChtb3N0IHVzZXItYWdlbnQgc3RyaW5ncykgb3Vyc2Vs>>"%PAYLOAD%"
echo dmVzLiBWYWx1ZXMgY2Fubm90CiAgICAjIGNvbnRhaW4gYSBkb3VibGUgcXVvdGU6IHJlamVjdGVk>>"%PAYLOAD%"
echo IGFib3ZlLgogICAgcGFyYW0oW3N0cmluZ10kVmFsdWUpCiAgICBpZiAoJFZhbHVlIC1tYXRjaCAn>>"%PAYLOAD%"
echo XHMnKSB7IHJldHVybiAnIicgKyAkVmFsdWUgKyAnIicgfQogICAgcmV0dXJuICRWYWx1ZQp9Cgoj>>"%PAYLOAD%"
echo IC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t>>"%PAYLOAD%"
echo LS0tLS0tLS0gcGFyc2UgaW5wdXQKJHJhdyA9ICcnCmlmICgkYXJncy5Db3VudCAtZ3QgMCAtYW5k>>"%PAYLOAD%"
echo ICRudWxsIC1uZSAkYXJnc1swXSkgeyAkcmF3ID0gW3N0cmluZ10kYXJnc1swXSB9CiRyYXcgPSAk>>"%PAYLOAD%"
echo cmF3LlRyaW0oKS5UcmltKCciJykKCmlmICgtbm90ICRyYXcpIHsKICAgIEZhaWwgJ0hhbmRsZXIg>>"%PAYLOAD%"
echo bmjhuq1uIMSRxrDhu6NjIFVSSSBy4buXbmcuJwp9CmlmICgkcmF3Lkxlbmd0aCAtZ3QgNDA5Nikg>>"%PAYLOAD%"
echo ewogICAgRmFpbCAnVVJJIGTDoGkgYuG6pXQgdGjGsOG7nW5nICg+IDQwOTYga8O9IHThu7EpLicK>>"%PAYLOAD%"
echo fQppZiAoJHJhdyAtbm90bWF0Y2ggJ14oP2kpbTN1aHViOi8vJykgewogICAgRmFpbCAnVVJJIGto>>"%PAYLOAD%"
echo w7RuZyBkw7luZyBzY2hlbWUgbTN1aHViOi8vLicKfQoKJHF1ZXJ5ID0gJycKJHF1ZXN0aW9uTWFy>>"%PAYLOAD%"
echo ayA9ICRyYXcuSW5kZXhPZignPycpCmlmICgkcXVlc3Rpb25NYXJrIC1nZSAwKSB7CiAgICAkcXVl>>"%PAYLOAD%"
echo cnkgPSAkcmF3LlN1YnN0cmluZygkcXVlc3Rpb25NYXJrICsgMSkKICAgICRoYXNoID0gJHF1ZXJ5>>"%PAYLOAD%"
echo LkluZGV4T2YoJyMnKQogICAgaWYgKCRoYXNoIC1nZSAwKSB7ICRxdWVyeSA9ICRxdWVyeS5TdWJz>>"%PAYLOAD%"
echo dHJpbmcoMCwgJGhhc2gpIH0KfQppZiAoLW5vdCAkcXVlcnkpIHsKICAgIEZhaWwgJ1VSSSB0aGnh>>"%PAYLOAD%"
echo ur91IHF1ZXJ5IChj4bqnbiA/dT08dXJsIHN0cmVhbT4pLicKfQoKJHBhcmFtcyA9IEB7fQpmb3Jl>>"%PAYLOAD%"
echo YWNoICgkcGFpciBpbiAkcXVlcnkuU3BsaXQoJyYnKSkgewogICAgaWYgKC1ub3QgJHBhaXIpIHsg>>"%PAYLOAD%"
echo Y29udGludWUgfQogICAgJGVxID0gJHBhaXIuSW5kZXhPZignPScpCiAgICBpZiAoJGVxIC1sZSAw>>"%PAYLOAD%"
echo KSB7IGNvbnRpbnVlIH0KICAgICRrZXkgPSAkcGFpci5TdWJzdHJpbmcoMCwgJGVxKQogICAgaWYg>>"%PAYLOAD%"
echo KEAoJ3UnLCAncicsICdhJywgJ3QnKSAtbm90Y29udGFpbnMgJGtleSkgeyBjb250aW51ZSB9CiAg>>"%PAYLOAD%"
echo ICAkdmFsdWUgPSAkcGFpci5TdWJzdHJpbmcoJGVxICsgMSkKICAgIHRyeSB7CiAgICAgICAgJHZh>>"%PAYLOAD%"
echo bHVlID0gW1N5c3RlbS5VcmldOjpVbmVzY2FwZURhdGFTdHJpbmcoJHZhbHVlKQogICAgfSBjYXRj>>"%PAYLOAD%"
echo aCB7CiAgICAgICAgRmFpbCAiVGhhbSBz4buRICcka2V5JyBjw7MgbcOjIGhvw6EgJS4uIGtow7Ru>>"%PAYLOAD%"
echo ZyBo4bujcCBs4buHLiIKICAgIH0KICAgICRwYXJhbXNbJGtleV0gPSAkdmFsdWUKfQoKJHRpdGxl>>"%PAYLOAD%"
echo ID0gJycKaWYgKCRwYXJhbXMuQ29udGFpbnNLZXkoJ3QnKSkgeyAkdGl0bGUgPSAoW3N0cmluZ10k>>"%PAYLOAD%"
echo cGFyYW1zWyd0J10pLlRyaW0oKSB9CmlmICgkdGl0bGUuTGVuZ3RoIC1ndCAyMDApIHsgJHRpdGxl>>"%PAYLOAD%"
echo ID0gJHRpdGxlLlN1YnN0cmluZygwLCAyMDApIH0KJHRpdGxlID0gJHRpdGxlIC1yZXBsYWNlICdb>>"%PAYLOAD%"
echo XHgwMC1ceDFGXHg3Rl0nLCAnICcKCiRzdHJlYW1VcmwgPSAnJwppZiAoJHBhcmFtcy5Db250YWlu>>"%PAYLOAD%"
echo c0tleSgndScpKSB7ICRzdHJlYW1VcmwgPSBbc3RyaW5nXSRwYXJhbXNbJ3UnXSB9CiRyZWZlcnJl>>"%PAYLOAD%"
echo ciA9ICcnCmlmICgkcGFyYW1zLkNvbnRhaW5zS2V5KCdyJykpIHsgJHJlZmVycmVyID0gKFtzdHJp>>"%PAYLOAD%"
echo bmddJHBhcmFtc1snciddKS5UcmltKCkgfQokdXNlckFnZW50ID0gJycKaWYgKCRwYXJhbXMuQ29u>>"%PAYLOAD%"
echo dGFpbnNLZXkoJ2EnKSkgeyAkdXNlckFnZW50ID0gKFtzdHJpbmddJHBhcmFtc1snYSddKS5Ucmlt>>"%PAYLOAD%"
echo KCkgfQoKIyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t>>"%PAYLOAD%"
echo LS0tLS0tLS0tLS0tLS0gdmFsaWRhdGUKJGVycm9yMSA9IFRlc3QtU3RyZWFtVXJsICRzdHJlYW1V>>"%PAYLOAD%"
echo cmwKaWYgKCRlcnJvcjEpIHsgRmFpbCAkZXJyb3IxICR0aXRsZSB9CgppZiAoJHJlZmVycmVyKSB7>>"%PAYLOAD%"
echo CiAgICAkZXJyb3IyID0gVGVzdC1IZWFkZXJWYWx1ZSAkcmVmZXJyZXIgJ1JlZmVycmVyIChyKScK>>"%PAYLOAD%"
echo ICAgIGlmICgkZXJyb3IyKSB7IEZhaWwgJGVycm9yMiAkdGl0bGUgfQogICAgaWYgKCRyZWZlcnJl>>"%PAYLOAD%"
echo ciAtbm90bWF0Y2ggJ14oP2kpaHR0cHM/Oi8vW14vPyNdJykgewogICAgICAgIEZhaWwgJ1JlZmVy>>"%PAYLOAD%"
echo cmVyIChyKSBwaOG6o2kgbMOgIGh0dHA6Ly8gaG/hurdjIGh0dHBzOi8vLicgJHRpdGxlCiAgICB9>>"%PAYLOAD%"
echo Cn0KCiRlcnJvcjMgPSBUZXN0LUhlYWRlclZhbHVlICR1c2VyQWdlbnQgIlVzZXItYWdlbnQgKGEp>>"%PAYLOAD%"
echo IgppZiAoJGVycm9yMykgeyBGYWlsICRlcnJvcjMgJHRpdGxlIH0KCiMgLS0tLS0tLS0tLS0tLS0t>>"%PAYLOAD%"
echo LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIHZs>>"%PAYLOAD%"
echo YwokdmxjID0gR2V0LVZsY1BhdGgKaWYgKC1ub3QgJHZsYykgewogICAgV3JpdGUtSGFuZGxlckxv>>"%PAYLOAD%"
echo ZyAoIkZBSUw6IGtow7RuZyB0w6xtIHRo4bqleSB2bGMuZXhlIChzdHJlYW06ICIgKyAkc3RyZWFt>>"%PAYLOAD%"
echo VXJsICsgIikiKQogICAgU2hvdy1Qb3B1cCAoIktow7RuZyB0w6xtIHRo4bqleSBWTEMgdHLDqm4g>>"%PAYLOAD%"
echo bcOheSBuw6B5LCBuw6puIGtow7RuZyBwaMOhdCDEkcaw4bujYyBzdHJlYW0uYG5gbiIgKwogICAg>>"%PAYLOAD%"
echo ICAgICJDw6BpIFZMQyAoYuG6o24gbWnhu4VuIHBow60pIHThuqFpOiAiICsgJFZMQ19ET1dOTE9B>>"%PAYLOAD%"
echo RF9VUkwgKyAiYG5gbiIgKwogICAgICAgICJTYXUga2hpIGPDoGksIGLhuqVtIGzhuqFpIG7DunQg>>"%PAYLOAD%"
echo TeG7nyBWTEMuIE7hur91IHbhu6thIGPDoGkgdsOgbyB0aMawIG3hu6VjIGtow6FjLCBow6N5IGNo>>"%PAYLOAD%"
echo 4bqheSBs4bqhaSBwcm90b2NvbFxyZWdpc3Rlci5jbWQuIikKICAgIGV4aXQgMQp9CgojIC0tLS0t>>"%PAYLOAD%"
echo LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t>>"%PAYLOAD%"
echo LS0tLSBsYXVuY2gKJHBhcnRzID0gTmV3LU9iamVjdCBTeXN0ZW0uQ29sbGVjdGlvbnMuR2VuZXJp>>"%PAYLOAD%"
echo Yy5MaXN0W3N0cmluZ10KJHBhcnRzLkFkZCgoUXVvdGUtQXJnICRzdHJlYW1VcmwpKQppZiAoJHJl>>"%PAYLOAD%"
echo ZmVycmVyKSB7ICRwYXJ0cy5BZGQoKFF1b3RlLUFyZyAoJy0taHR0cC1yZWZlcnJlcj0nICsgJHJl>>"%PAYLOAD%"
echo ZmVycmVyKSkpIH0KaWYgKCR1c2VyQWdlbnQpIHsgJHBhcnRzLkFkZCgoUXVvdGUtQXJnICgnLS1o>>"%PAYLOAD%"
echo dHRwLXVzZXItYWdlbnQ9JyArICR1c2VyQWdlbnQpKSkgfQokYXJndW1lbnRMaW5lID0gKCRwYXJ0>>"%PAYLOAD%"
echo cyAtam9pbiAnICcpCgp0cnkgewogICAgIyBUaGUgY29uc29sZSBpcyBhbHJlYWR5IGhpZGRlbiBi>>"%PAYLOAD%"
echo eSAiLVdpbmRvd1N0eWxlIEhpZGRlbiIgb24gdGhlIHBvd2Vyc2hlbGwKICAgICMgcHJvY2VzcyBp>>"%PAYLOAD%"
echo dHNlbGY7IFZMQyBtdXN0IHN0YXkgdmlzaWJsZSwgc28gbm8gLVdpbmRvd1N0eWxlIGhlcmUuCiAg>>"%PAYLOAD%"
echo ICBTdGFydC1Qcm9jZXNzIC1GaWxlUGF0aCAkdmxjIC1Bcmd1bWVudExpc3QgJGFyZ3VtZW50TGlu>>"%PAYLOAD%"
echo ZQp9IGNhdGNoIHsKICAgIEZhaWwgKCJLaMO0bmcgY2jhuqF5IMSRxrDhu6NjIFZMQyB04bqhaSAn>>"%PAYLOAD%"
echo IiArICR2bGMgKyAiJzogIiArICRfLkV4Y2VwdGlvbi5NZXNzYWdlKSAkdGl0bGUKfQoKZXhpdCAw>>"%PAYLOAD%"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $b64 = (Get-Content -LiteralPath $env:PAYLOAD -Raw) -replace '\s', ''; [IO.File]::WriteAllBytes($env:DEST, [Convert]::FromBase64String($b64))"
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
  echo [CANH BAO] Khong tim thay VLC tren may nay.
  echo             Protocol van duoc dang ky; bam "Mo VLC" se bao thieu VLC toi khi ban cai.
  echo             Tai VLC mien phi tai: https://www.videolan.org/vlc/
  echo.
) else (
  echo [OK] Tim thay VLC: "%VLC%"
  echo.
)

set "CMD=powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%DEST%\" \"%%1\""
set CMD_DISPLAY=powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%DEST%" "%%1"

reg add "%REG_ROOT%" /ve /t REG_SZ /d "URL:M3U Hub stream" /f >nul
if errorlevel 1 goto :regfail
reg add "%REG_ROOT%" /v "URL Protocol" /t REG_SZ /d "" /f >nul
if errorlevel 1 goto :regfail
reg add "%REG_ROOT%\shell\open\command" /ve /t REG_SZ /d "%CMD%" /f >nul
if errorlevel 1 goto :regfail

echo [OK] Da dang ky protocol m3uhub:// cho user hien tai (khong can quyen admin).
echo.
echo   %REG_ROOT%\shell\open\command
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
