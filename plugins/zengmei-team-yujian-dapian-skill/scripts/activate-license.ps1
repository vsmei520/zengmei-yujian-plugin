param(
    [Parameter(Mandatory = $true)]
    [string]$LicenseKey,
    [string]$ApiBaseUrl = $env:ZENGMEI_API_BASE_URL,
    [string]$ClientVersion = "1.0.0"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ApiBaseUrl)) {
    throw "未配置 ZENGMEI_API_BASE_URL。"
}

$deviceId = [Convert]::ToBase64String(
    [Security.Cryptography.SHA256]::HashData(
        [Text.Encoding]::UTF8.GetBytes("$env:COMPUTERNAME|$env:USERNAME")
    )
)

$body = @{
    licenseKey = $LicenseKey
    pluginId = "zengmei-team-yujian-dapian-skill"
    clientVersion = $ClientVersion
    deviceId = $deviceId
} | ConvertTo-Json -Compress

$response = Invoke-RestMethod `
    -Method Post `
    -Uri "$ApiBaseUrl/v1/license/activate" `
    -ContentType "application/json" `
    -Body $body

if (-not $response.ok -or [string]::IsNullOrWhiteSpace($response.accessToken)) {
    throw "授权失败。"
}

Write-Output "授权成功。请在当前终端设置 ZENGMEI_ACCESS_TOKEN 后再执行远程生成。"
Write-Output $response.accessToken
