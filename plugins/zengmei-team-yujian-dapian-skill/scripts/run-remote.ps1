param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("10s", "15s")]
    [string]$Profile,
    [Parameter(Mandatory = $true)]
    [string]$InputFile,
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
if (-not (Test-Path -LiteralPath $InputFile -PathType Leaf)) {
    throw "输入文件不存在：$InputFile"
}

$inputJson = Get-Content -Raw -LiteralPath $InputFile
$inputObject = $inputJson | ConvertFrom-Json

$body = @{
    pluginId = "zengmei-team-yujian-dapian-skill"
    profile = $Profile
    clientVersion = $ClientVersion
    input = $inputObject
} | ConvertTo-Json -Depth 30 -Compress

$headers = @{
    Authorization = "Bearer $AccessToken"
    "X-Plugin-Id" = "zengmei-team-yujian-dapian-skill"
    "X-Client-Version" = $ClientVersion
}

$response = Invoke-RestMethod `
    -Method Post `
    -Uri "$ApiBaseUrl/v1/generate" `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $body

if (-not $response.ok) {
    throw "远程生成失败。"
}

if ($null -ne $response.result) {
    $response.result | ConvertTo-Json -Depth 30
} else {
    $response | ConvertTo-Json -Depth 30
}
