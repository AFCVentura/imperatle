<#
.SYNOPSIS
  Starts everything needed for a Paddle SANDBOX purchase test on this PC:
  Postgres (docker compose), the API (http://localhost:5055), the web app
  (http://localhost:3000) and a Cloudflare quick tunnel to the API, then
  prints the tunnel URL to register in the Paddle sandbox dashboard.

  Step by step guide: docs/launch/sandbox-purchase-test.md

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\sandbox-test.ps1
  powershell -ExecutionPolicy Bypass -File scripts\sandbox-test.ps1 -Stop

.NOTES
  Secrets are read from files in $SecretsDir and never printed:
    paddle_sandbox_tunnel_secret.txt  secret key of the tunnel notification destination (sandbox)
    google_client_secret.txt          Google OAuth client secret (for the local login)
  The client token and the price id below are public sandbox values.
#>
[CmdletBinding()]
param(
    [switch]$Stop,
    [string]$SecretsDir = 'C:\secrets\imperatle',
    [string]$ClientToken = 'test_c9c21a5a71900db74b134bc6aa4',
    [string]$PriceId = 'pri_01m6h7q44g7qj2jh2b75h3ap5w',
    [string]$GoogleClientId = '373010422141-j2an0fgj0cfdkpj3g5iddelc1htr6696.apps.googleusercontent.com',
    [string]$Database = 'imperatle_sandbox'
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ApiDir = Join-Path $RepoRoot 'apps\api'
$WebDir = Join-Path $RepoRoot 'apps\web'
$ComposeFile = Join-Path $RepoRoot 'docker-compose.yml'
# Same project name as the main checkout, so the same Postgres container and
# volume are reused (no second container fighting for port 5432).
$ComposeProject = 'imperatle'
$StateFile = Join-Path $env:TEMP 'imperatle-sandbox-test.pids'
$TunnelLog = Join-Path $env:TEMP 'imperatle-sandbox-tunnel.log'
$TunnelMetrics = '127.0.0.1:20241'
$ApiUrl = 'http://localhost:5055'
$WebUrl = 'http://localhost:3000'

function Write-Step([string]$text) { Write-Host "==> $text" -ForegroundColor Cyan }
function Fail([string]$text) { Write-Host "ERRO: $text" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------- -Stop
if ($Stop) {
    if (-not (Test-Path $StateFile)) { Write-Host 'Nada para parar (arquivo de PIDs nao existe).'; exit 0 }
    foreach ($id in Get-Content $StateFile) {
        if ($id -match '^\d+$') {
            # /T takes the children too (dotnet and node run under the window's PowerShell).
            & taskkill.exe /T /F /PID $id 2>$null | Out-Null
        }
    }
    Remove-Item $StateFile -Force
    Write-Host 'API, site e tunel parados. O Postgres continua rodando (docker compose -p imperatle stop para parar).'
    Write-Host 'Lembrete: apague o destino do tunel na Paddle sandbox (Developer tools > Notifications).'
    exit 0
}

# ---------------------------------------------------------------- prerequisites
Write-Step 'Conferindo programas'
$cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflared) {
    foreach ($candidate in @("${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe", "$env:ProgramFiles\cloudflared\cloudflared.exe")) {
        if (Test-Path $candidate) { $cloudflared = $candidate; break }
    }
}
if (-not $cloudflared) { Fail 'cloudflared nao encontrado. Instale com: winget install --id Cloudflare.cloudflared (e abra um terminal novo).' }
foreach ($tool in 'docker', 'dotnet', 'node', 'npm') {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { Fail "$tool nao encontrado no PATH." }
}
& docker info *> $null
if ($LASTEXITCODE -ne 0) { Fail 'O Docker nao respondeu. Abra o Docker Desktop e espere ele ficar pronto.' }

function Test-Port([int]$port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try { $client.Connect('127.0.0.1', $port); return $true } catch { return $false } finally { $client.Dispose() }
}
foreach ($port in 5055, 3000) {
    if (Test-Port $port) { Fail "A porta $port ja esta em uso. Feche a API/site que ja estao rodando (ou rode este script com -Stop) e tente de novo." }
}

# ---------------------------------------------------------------- secrets and sandbox guard
Write-Step "Lendo segredos de $SecretsDir (os valores nao sao mostrados)"
function Read-SecretFile([string]$name) {
    $path = Join-Path $SecretsDir $name
    if (-not (Test-Path -LiteralPath $path)) { Fail "Arquivo nao encontrado: $path" }
    $value = (Get-Content -Raw -LiteralPath $path)
    if ($null -eq $value) { $value = '' }
    $value = $value.Trim().Trim([char]0xFEFF).Trim()
    if (-not $value) { Fail "Arquivo vazio: $path" }
    return $value
}

$webhookSecret = Read-SecretFile 'paddle_sandbox_tunnel_secret.txt'
$googleSecret = Read-SecretFile 'google_client_secret.txt'

# Only sandbox values. A live value here would let the test card grant real perks.
if (-not $ClientToken.StartsWith('test_')) { Fail 'O client token precisa ser do sandbox (comecar com test_). Recusado.' }
if (-not $PriceId.StartsWith('pri_')) { Fail 'O price id precisa comecar com pri_.' }
foreach ($pair in @(@('client token', $ClientToken), @('price id', $PriceId), @('webhook secret', $webhookSecret))) {
    if ($pair[1] -match 'live_') { Fail "O $($pair[0]) parece ser da conta LIVE. Este teste e so sandbox. Recusado." }
}
if (-not $webhookSecret.StartsWith('pdl_ntfset_')) {
    Write-Host 'Aviso: o webhook secret nao comeca com pdl_ntfset_. Confira se copiou a Secret key do destino certo.' -ForegroundColor Yellow
}
$liveFile = Join-Path $SecretsDir 'paddle_key_live.txt'
if ((Test-Path -LiteralPath $liveFile) -and ("$(Get-Content -Raw -LiteralPath $liveFile)".Trim() -eq $webhookSecret)) {
    Fail 'paddle_sandbox_tunnel_secret.txt tem o mesmo valor de paddle_key_live.txt. Recusado.'
}

# ---------------------------------------------------------------- Postgres
Write-Step "Subindo o Postgres (docker compose, projeto $ComposeProject)"
& docker compose -p $ComposeProject -f $ComposeFile up -d postgres
if ($LASTEXITCODE -ne 0) { Fail 'docker compose up falhou.' }

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    & docker compose -p $ComposeProject -f $ComposeFile exec -T postgres pg_isready -U imperatle *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
}
if (-not $ready) { Fail 'O Postgres nao ficou pronto em 30 segundos.' }

# A separate database, so the test never touches imperatle_dev.
$exists = & docker compose -p $ComposeProject -f $ComposeFile exec -T postgres psql -U imperatle -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$Database'"
if ("$exists".Trim() -ne '1') {
    Write-Step "Criando o banco $Database"
    & docker compose -p $ComposeProject -f $ComposeFile exec -T postgres psql -U imperatle -d postgres -c "CREATE DATABASE $Database;" | Out-Null
    if ($LASTEXITCODE -ne 0) { Fail "Nao deu para criar o banco $Database." }
}

# ---------------------------------------------------------------- processes
$names = @(
    'ConnectionStrings__DefaultConnection', 'Dev__IsSupporter', 'Auth__CookieDomain',
    'Auth__Google__ClientId', 'Auth__Google__ClientSecret',
    'Paddle__Environment', 'Paddle__WebhookSecret', 'Paddle__SupporterPriceId',
    'NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN',
    'NEXT_PUBLIC_PADDLE_SUPPORTER_PRICE_ID', 'NEXT_PUBLIC_PADDLE_ENVIRONMENT'
)
# Child processes inherit this script's environment. Everything set here is
# removed again in "finally", so nothing stays in the terminal session.
$pids = @()
try {
    # API (exact keys read by Program.cs / PaddleOptions; "__" = ":" in .NET config).
    $env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=$Database;Username=imperatle;Password=imperatle"
    $env:Dev__IsSupporter = 'false'          # real supporter check, not the dev shortcut
    $env:Auth__CookieDomain = ''              # cookie stays on localhost
    $env:Auth__Google__ClientId = $GoogleClientId
    $env:Auth__Google__ClientSecret = $googleSecret
    $env:Paddle__Environment = 'sandbox'
    $env:Paddle__WebhookSecret = $webhookSecret
    $env:Paddle__SupporterPriceId = $PriceId

    Write-Step "Iniciando a API em $ApiUrl (janela nova; os logs do webhook aparecem nela)"
    $api = Start-Process powershell -PassThru -WorkingDirectory $ApiDir `
        -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle = 'Imperatle API (sandbox)'; dotnet run --launch-profile http"
    $pids += $api.Id

    # The web app and the tunnel don't need the server secrets.
    foreach ($n in 'Auth__Google__ClientSecret', 'Paddle__WebhookSecret') { Remove-Item "Env:$n" -ErrorAction SilentlyContinue }

    # Web (process env wins over apps/web/.env.local in Next.js).
    $env:NEXT_PUBLIC_API_URL = $ApiUrl
    $env:NEXT_PUBLIC_PADDLE_CLIENT_TOKEN = $ClientToken
    $env:NEXT_PUBLIC_PADDLE_SUPPORTER_PRICE_ID = $PriceId
    $env:NEXT_PUBLIC_PADDLE_ENVIRONMENT = 'sandbox'

    $webCommand = "`$host.UI.RawUI.WindowTitle = 'Imperatle web (sandbox)'; npm run dev"
    if (-not (Test-Path (Join-Path $WebDir 'node_modules'))) { $webCommand = "`$host.UI.RawUI.WindowTitle = 'Imperatle web (sandbox)'; npm ci; npm run dev" }
    Write-Step "Iniciando o site em $WebUrl (janela nova)"
    $web = Start-Process powershell -PassThru -WorkingDirectory $WebDir -ArgumentList '-NoExit', '-Command', $webCommand
    $pids += $web.Id

    Write-Step 'Esperando a API responder em /health'
    $apiUp = $false
    for ($i = 0; $i -lt 120; $i++) {
        try { Invoke-WebRequest "$ApiUrl/health" -UseBasicParsing -TimeoutSec 2 | Out-Null; $apiUp = $true; break } catch { Start-Sleep -Seconds 1 }
    }
    if (-not $apiUp) { Write-Host 'Aviso: a API ainda nao respondeu. Veja a janela "Imperatle API (sandbox)".' -ForegroundColor Yellow }

    Write-Step 'Abrindo o tunel do Cloudflare para a API'
    if (Test-Path $TunnelLog) { Remove-Item $TunnelLog -Force }
    $tunnel = Start-Process $cloudflared -PassThru -WindowStyle Minimized `
        -ArgumentList 'tunnel', '--no-autoupdate', '--metrics', $TunnelMetrics, '--logfile', $TunnelLog, '--url', $ApiUrl
    $pids += $tunnel.Id
    Set-Content -Path $StateFile -Value $pids

    $tunnelUrl = $null
    for ($i = 0; $i -lt 60 -and -not $tunnelUrl; $i++) {
        Start-Sleep -Seconds 1
        try {
            $info = Invoke-RestMethod "http://$TunnelMetrics/quicktunnel" -TimeoutSec 2
            if ($info.hostname) { $tunnelUrl = "https://$($info.hostname)" }
        } catch { }
        if (-not $tunnelUrl -and (Test-Path $TunnelLog)) {
            $match = Select-String -Path $TunnelLog -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
            if ($match) { $tunnelUrl = $match.Matches[0].Value }
        }
    }
}
finally {
    foreach ($n in $names) { Remove-Item "Env:$n" -ErrorAction SilentlyContinue }
}

Write-Host ''
if (-not $tunnelUrl) {
    Write-Host "Nao achei a URL do tunel. Veja o log: $TunnelLog" -ForegroundColor Yellow
} else {
    Write-Host 'Tudo no ar. Cole este endereco no destino de teste da Paddle sandbox:' -ForegroundColor Green
    Write-Host ''
    Write-Host "    $tunnelUrl/webhooks/paddle" -ForegroundColor Green
    Write-Host ''
    Write-Host "Teste rapido do tunel: $tunnelUrl/health (deve mostrar {""status"":""ok""})"
}
Write-Host "Site: $WebUrl   API: $ApiUrl   Banco: $Database"
Write-Host 'Para parar tudo: powershell -ExecutionPolicy Bypass -File scripts\sandbox-test.ps1 -Stop'
Write-Host 'Se reiniciar o tunel, a URL muda: atualize o destino na Paddle.'
