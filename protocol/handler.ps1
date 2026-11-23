# M3U Hub - Windows URI handler for m3uhub://play
#
# Invoked by the shell as:
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File handler.ps1 "m3uhub://play?u=..."
#
# Windows PowerShell 5.1 only: no external modules, no System.Web.
# Contract: only http/https/rtmp stream URLs are accepted; anything that could
# be read as a VLC command-line option ("-..." / control chars / quotes) is refused,
# because any web page can trigger this scheme.

$ErrorActionPreference = 'Stop'

$script:LogDir = Join-Path $env:LOCALAPPDATA 'm3u-hub'
$script:LogPath = Join-Path $script:LogDir 'vlc-handler.log'
$VLC_DOWNLOAD_URL = 'https://www.videolan.org/vlc/'

function Write-HandlerLog {
    param([string]$Message)
    try {
        if (-not (Test-Path -LiteralPath $script:LogDir)) {
            New-Item -ItemType Directory -Path $script:LogDir -Force | Out-Null
        }
        $line = '[{0}] {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
        Add-Content -LiteralPath $script:LogPath -Value $line -Encoding UTF8
    } catch {
        # Logging must never break the handler.
    }
}

function Show-Popup {
    param([string]$Message)
    try {
        $shell = New-Object -ComObject WScript.Shell
        # 0 = wait for OK, 16 = stop icon
        $shell.Popup($Message, 0, 'M3U Hub', 16) | Out-Null
    } catch {
        # No interactive desktop (e.g. service context): the log line is enough.
    }
}

function Fail {
    param([string]$Reason, [string]$Title)
    if ($Title) { $Reason = $Reason + "`n`nTrận: " + $Title }
    Write-HandlerLog ('FAIL: ' + ($Reason -replace "`r?`n", ' | '))
    Show-Popup ("Không mở được VLC.`n`n" + $Reason)
    exit 1
}

function Get-VlcPath {
    $candidates = New-Object System.Collections.Generic.List[string]
    $keys = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\vlc.exe',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\vlc.exe',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\vlc.exe'
    )
    foreach ($key in $keys) {
        try {
            $item = Get-Item -LiteralPath $key -ErrorAction Stop
            $value = $item.GetValue('')
            if ($value) {
                $clean = ([string]$value).Trim().Trim('"')
                if ($clean) { $candidates.Add($clean) }
            }
        } catch {
            # Key absent: try the next source.
        }
    }
    $candidates.Add('C:\Program Files\VideoLAN\VLC\vlc.exe')
    $candidates.Add('C:\Program Files (x86)\VideoLAN\VLC\vlc.exe')

    foreach ($candidate in $candidates) {
        if (-not $candidate) { continue }
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
    }
    return $null
}

function Test-StreamUrl {
    param([string]$Url)
    if ([string]::IsNullOrWhiteSpace($Url)) { return 'Thiếu tham số u (URL stream).' }
    if ($Url.Length -gt 2048) { return 'URL stream dài quá 2048 ký tự.' }
    if ($Url.StartsWith('-')) { return 'URL stream bắt đầu bằng "-" nên bị từ chối (chống chèn tham số).' }
    if ($Url -match '[\x00-\x1F\x7F]') { return 'URL stream chứa ký tự điều khiển.' }
    if ($Url.Contains('"')) { return 'URL stream chứa dấu ngoặc kép.' }
    if ($Url -match '\s') { return 'URL stream chứa khoảng trắng.' }
    if ($Url -notmatch '^(?i)(https?|rtmp)://[^/?#]+') {
        return 'URL stream phải là http://, https:// hoặc rtmp:// và có host.'
    }
    return $null
}

function Test-HeaderValue {
    param([string]$Value, [string]$Label)
    if ([string]::IsNullOrEmpty($Value)) { return $null }
    if ($Value.Length -gt 2048) { return "$Label dài quá 2048 ký tự." }
    if ($Value.StartsWith('-')) { return "$Label bắt đầu bằng '-' nên bị từ chối (chống chèn tham số)." }
    if ($Value -match '[\x00-\x1F\x7F"]') { return "$Label chứa ký tự điều khiển hoặc ngoặc kép." }
    return $null
}

function Quote-Arg {
    # Start-Process 5.1 joins the array with plain spaces, so quote values that
    # contain whitespace (most user-agent strings) ourselves. Values cannot
    # contain a double quote: rejected above.
    param([string]$Value)
    if ($Value -match '\s') { return '"' + $Value + '"' }
    return $Value
}

# ---------------------------------------------------------------- parse input
$raw = ''
if ($args.Count -gt 0 -and $null -ne $args[0]) { $raw = [string]$args[0] }
$raw = $raw.Trim().Trim('"')

if (-not $raw) {
    Fail 'Handler nhận được URI rỗng.'
}
if ($raw.Length -gt 4096) {
    Fail 'URI dài bất thường (> 4096 ký tự).'
}
if ($raw -notmatch '^(?i)m3uhub://') {
    Fail 'URI không dùng scheme m3uhub://.'
}

$query = ''
$questionMark = $raw.IndexOf('?')
if ($questionMark -ge 0) {
    $query = $raw.Substring($questionMark + 1)
    $hash = $query.IndexOf('#')
    if ($hash -ge 0) { $query = $query.Substring(0, $hash) }
}
if (-not $query) {
    Fail 'URI thiếu query (cần ?u=<url stream>).'
}

$params = @{}
foreach ($pair in $query.Split('&')) {
    if (-not $pair) { continue }
    $eq = $pair.IndexOf('=')
    if ($eq -le 0) { continue }
    $key = $pair.Substring(0, $eq)
    if (@('u', 'r', 'a', 't') -notcontains $key) { continue }
    $value = $pair.Substring($eq + 1)
    try {
        $value = [System.Uri]::UnescapeDataString($value)
    } catch {
        Fail "Tham số '$key' có mã hoá %.. không hợp lệ."
    }
    $params[$key] = $value
}

$title = ''
if ($params.ContainsKey('t')) { $title = ([string]$params['t']).Trim() }
if ($title.Length -gt 200) { $title = $title.Substring(0, 200) }
$title = $title -replace '[\x00-\x1F\x7F]', ' '

$streamUrl = ''
if ($params.ContainsKey('u')) { $streamUrl = [string]$params['u'] }
$referrer = ''
if ($params.ContainsKey('r')) { $referrer = ([string]$params['r']).Trim() }
$userAgent = ''
if ($params.ContainsKey('a')) { $userAgent = ([string]$params['a']).Trim() }

# --------------------------------------------------------------- validate
$error1 = Test-StreamUrl $streamUrl
if ($error1) { Fail $error1 $title }

if ($referrer) {
    $error2 = Test-HeaderValue $referrer 'Referrer (r)'
    if ($error2) { Fail $error2 $title }
    if ($referrer -notmatch '^(?i)https?://[^/?#]') {
        Fail 'Referrer (r) phải là http:// hoặc https://.' $title
    }
}

$error3 = Test-HeaderValue $userAgent "User-agent (a)"
if ($error3) { Fail $error3 $title }

# --------------------------------------------------------------------- vlc
$vlc = Get-VlcPath
if (-not $vlc) {
    Write-HandlerLog ("FAIL: không tìm thấy vlc.exe (stream: " + $streamUrl + ")")
    Show-Popup ("Không tìm thấy VLC trên máy này, nên không phát được stream.`n`n" +
        "Cài VLC (bản miễn phí) tại: " + $VLC_DOWNLOAD_URL + "`n`n" +
        "Sau khi cài, bấm lại nút Mở VLC. Nếu vừa cài vào thư mục khác, hãy chạy lại protocol\register.cmd.")
    exit 1
}

# ------------------------------------------------------------------ launch
$parts = New-Object System.Collections.Generic.List[string]
$parts.Add((Quote-Arg $streamUrl))
if ($referrer) { $parts.Add((Quote-Arg ('--http-referrer=' + $referrer))) }
if ($userAgent) { $parts.Add((Quote-Arg ('--http-user-agent=' + $userAgent))) }
$argumentLine = ($parts -join ' ')

try {
    # The console is already hidden by "-WindowStyle Hidden" on the powershell
    # process itself; VLC must stay visible, so no -WindowStyle here.
    Start-Process -FilePath $vlc -ArgumentList $argumentLine
} catch {
    Fail ("Không chạy được VLC tại '" + $vlc + "': " + $_.Exception.Message) $title
}

exit 0