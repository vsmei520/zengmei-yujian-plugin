param(
    [string]$ApiBaseUrl = $env:ZENGMEI_API_BASE_URL,
    [string]$AccessToken = $env:ZENGMEI_ACCESS_TOKEN,
    [string]$ClientVersion = "1.0.0"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ApiBaseUrl)) {
    throw "未配置 ZENGMEI_API_BASE_URL。"
}
if ([string]::IsNullOrWhiteSpace($AccessToken)) {
    throw "未配置 ZENGMEI_ACCESS_TOKEN。"
}

$headers = @{
    Authorization = "Bearer $AccessToken"
    "X-Plugin-Id" = "zengmei-team-yujian-dapian-skill"
    "X-Client-Version" = $ClientVersion
}

Invoke-RestMethod `
    -Method Get `
    -Uri "$ApiBaseUrl/v1/plugin/manifest" `
    -Headers $headers |
    ConvertTo-Json -Depth 8
