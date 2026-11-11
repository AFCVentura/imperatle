<#
.SYNOPSIS
  Starts everything needed for a Stripe TEST MODE purchase test on this PC:
  Postgres (docker compose), the API (http://localhost:5055), the web app
  (http://localhost:3000) and "stripe listen", which forwards the test
  account's webhook events to the local API (no tunnel, nothing to register
  in the Stripe dashboard).

  Step by step guide: docs/launch/sandbox-purchase-test.md

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\sandbox-test.ps1
  powershell -ExecutionPolicy Bypass -File scripts\sandbox-test.ps1 -Stop

.NOTES
  Secrets are read from files and never printed:
    $StripeKeyFile, line 1                       Stripe TEST secret key (sk_test_...)
    $SecretsDir\google_client_secret.txt         Google OAuth client secret (for the local login)
  The price id below is a public test mode value.
#>
[CmdletBinding()]
param(
    [switch]$Stop,
    [string]$SecretsDir = 'C:\secrets\imperatle',
    [string]$StripeKeyFile = 'C:\secrets\stripe-imperatle-test.txt',
    [string]$PriceId = 'price_1UaM8fIFWEpVTgv82PSgNYo7',
    [string]$GoogleClientId = '373010422141-j2an0fgj0cfdkpj3g5iddelc1htr6696.apps.googleusercontent.com',
    [string]$Database = 'imperatle_sandbox',
    # Another port for the site when 3000 is taken (the API is told to accept it).
    [int]$WebPort = 3000
)

# Not 'Stop': in Windows PowerShell 5.1 any stderr line from a native program
# (docker's "WARNING: No blkio...", docker compose progress, stripe CLI) becomes
# a terminating error under 'Stop'. Every native call below checks
# $LASTEXITCODE (or its output) and calls Fail instead.
$ErrorActionPreference = 'Continue'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ApiDir = Join-Path $RepoRoot 'apps\api'
$WebDir = Join-Path $RepoRoot 'apps\web'
$ComposeFile = Join-Path $RepoRoot 'docker-compose.yml'
# Same project name as the main checkout, so the same Postgres container and
# volume are reused (no second container fighting for port 5432).
$ComposeProject = 'imperatle'
$StateFile = Join-Path $env:TEMP 'imperatle-sandbox-test.pids'
$ApiUrl = 'http://localhost:5055'
$WebUrl = "http://localhost:$WebPort"

function Write-Step([string]$text) { Write-Host "==> $text" -ForegroundColor Cyan }
function Fail([string]$text) { Write-Host "ERRO: $text" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------- -Stop
if ($Stop) {
    if (-not (Test-Path $StateFile)) { Write-Host 'Nada para parar (arquivo de PIDs nao existe).'; exit 0 }
    foreach ($id in Get-Content $StateFile) {
        if ($id -match '^\d+$') {
            # /T takes the children too (dotnet, node and stripe run under the window's PowerShell).
            & taskkill.exe /T /F /PID $id 2>$null | Out-Null
        }
    }
    Remove-Item $StateFile -Force
    Write-Host 'API, site e stripe listen parados. O Postgres continua rodando (docker compose -p imperatle stop para parar).'
    exit 0
}

# ---------------------------------------------------------------- prerequisites
Write-Step 'Conferindo programas'
$stripe = (Get-Command stripe -ErrorAction SilentlyContinue).Source
if (-not $stripe) { Fail 'Stripe CLI nao encontrada. Instale com: winget install --id Stripe.StripeCli (e abra um terminal novo).' }
foreach ($tool in 'docker', 'dotnet', 'node', 'npm') {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { Fail "$tool nao encontrado no PATH." }
}
& docker info *> $null
if ($LASTEXITCODE -ne 0) { Fail 'O Docker nao respondeu. Abra o Docker Desktop e espere ele ficar pronto.' }

function Test-Port([int]$port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try { $client.Connect('127.0.0.1', $port); return $true } catch { return $false } finally { $client.Dispose() }
}
foreach ($port in 5055, $WebPort) {
    if (Test-Port $port) { Fail "A porta $port ja esta em uso. Feche a API/site que ja estao rodando (ou rode este script com -Stop) e tente de novo." }
}

# ---------------------------------------------------------------- secrets and test mode guard
Write-Step 'Lendo segredos (os valores nao sao mostrados)'
function Read-SecretLine([string]$path, [int]$line = 1) {
    if (-not (Test-Path -LiteralPath $path)) { Fail "Arquivo nao encontrado: $path" }
    $lines = @(Get-Content -LiteralPath $path)
    $value = if ($lines.Count -ge $line) { "$($lines[$line - 1])" } else { '' }
    $value = $value.Trim().Trim([char]0xFEFF).Trim()
    if (-not $value) { Fail "Linha $line vazia em: $path" }
    return $value
}

$stripeKey = Read-SecretLine $StripeKeyFile 1
$googleSecret = Read-SecretLine (Join-Path $SecretsDir 'google_client_secret.txt') 1

# Only test mode. A live key here would charge real cards.
if (-not $stripeKey.StartsWith('sk_test_')) { Fail "A linha 1 de $StripeKeyFile precisa ser a chave secreta de TESTE (sk_test_...). Recusado." }
if (-not $PriceId.StartsWith('price_')) { Fail 'O price id precisa comecar com price_.' }

Write-Step 'Pegando o segredo de assinatura do stripe listen'
$webhookSecret = "$(& $stripe listen --api-key $stripeKey --print-secret 2>$null)".Trim()
if (-not $webhookSecret.StartsWith('whsec_')) { Fail 'O stripe listen nao devolveu um segredo whsec_. Rode "stripe listen --api-key <chave> --print-secret" para ver o erro.' }

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
    'ConnectionStrings__DefaultConnection', 'Dev__IsSupporter', 'Auth__CookieDomain', 'Cors__AllowedOrigins',
    'Auth__Google__ClientId', 'Auth__Google__ClientSecret',
    'Stripe__SecretKey', 'Stripe__WebhookSecret', 'Stripe__SupporterPriceId',
    'NEXT_PUBLIC_API_URL', 'STRIPE_API_KEY'
)
# Child processes inherit this script's environment. Everything set here is
# removed again in "finally", so nothing stays in the terminal session.
$pids = @()
try {
    # API (exact keys read by Program.cs / StripeOptions; "__" = ":" in .NET config).
    $env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=$Database;Username=imperatle;Password=imperatle"
    $env:Dev__IsSupporter = 'false'          # real supporter check, not the dev shortcut
    $env:Auth__CookieDomain = ''              # cookie stays on localhost
    # The site's origin: CORS, where the login may return to, and Stripe's return pages.
    $env:Cors__AllowedOrigins = $WebUrl
    $env:Auth__Google__ClientId = $GoogleClientId
    $env:Auth__Google__ClientSecret = $googleSecret
    $env:Stripe__SecretKey = $stripeKey
    $env:Stripe__WebhookSecret = $webhookSecret
    $env:Stripe__SupporterPriceId = $PriceId

    Write-Step "Iniciando a API em $ApiUrl (janela nova; os logs do webhook aparecem nela)"
    $api = Start-Process powershell -PassThru -WorkingDirectory $ApiDir `
        -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle = 'Imperatle API (Stripe teste)'; dotnet run --launch-profile http"
    $pids += $api.Id

    # The web app doesn't need any secret.
    foreach ($n in 'Auth__Google__ClientSecret', 'Stripe__SecretKey', 'Stripe__WebhookSecret') { Remove-Item "Env:$n" -ErrorAction SilentlyContinue }

    # Web (process env wins over apps/web/.env.local in Next.js).
    $env:NEXT_PUBLIC_API_URL = $ApiUrl
    $webCommand = "`$host.UI.RawUI.WindowTitle = 'Imperatle web (Stripe teste)'; npm run dev -- -p $WebPort"
    if (-not (Test-Path (Join-Path $WebDir 'node_modules'))) { $webCommand = "`$host.UI.RawUI.WindowTitle = 'Imperatle web (Stripe teste)'; npm ci; npm run dev -- -p $WebPort" }
    Write-Step "Iniciando o site em $WebUrl (janela nova)"
    $web = Start-Process powershell -PassThru -WorkingDirectory $WebDir -ArgumentList '-NoExit', '-Command', $webCommand
    $pids += $web.Id

    # stripe listen reads the key from STRIPE_API_KEY, so it never shows in the window's command line.
    $env:STRIPE_API_KEY = $stripeKey
    Write-Step 'Abrindo o stripe listen (janela nova; cada evento aparece nela)'
    $listen = Start-Process powershell -PassThru -WorkingDirectory $RepoRoot `
        -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle = 'stripe listen (teste)'; & '$stripe' listen --forward-to $ApiUrl/webhooks/stripe --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,charge.refunded,charge.dispute.closed"
    $pids += $listen.Id
    Set-Content -Path $StateFile -Value $pids

    Write-Step 'Esperando a API responder em /health'
    $apiUp = $false
    for ($i = 0; $i -lt 120; $i++) {
        try { Invoke-WebRequest "$ApiUrl/health" -UseBasicParsing -TimeoutSec 2 | Out-Null; $apiUp = $true; break } catch { Start-Sleep -Seconds 1 }
    }
    if (-not $apiUp) { Write-Host 'Aviso: a API ainda nao respondeu. Veja a janela "Imperatle API (Stripe teste)".' -ForegroundColor Yellow }
}
finally {
    foreach ($n in $names) { Remove-Item "Env:$n" -ErrorAction SilentlyContinue }
}

Write-Host ''
Write-Host "Tudo no ar. Site: $WebUrl   API: $ApiUrl   Banco: $Database" -ForegroundColor Green
Write-Host 'Cartao de teste: 4242 4242 4242 4242, validade futura, qualquer CVC.'
Write-Host 'Para parar tudo: powershell -ExecutionPolicy Bypass -File scripts\sandbox-test.ps1 -Stop'
