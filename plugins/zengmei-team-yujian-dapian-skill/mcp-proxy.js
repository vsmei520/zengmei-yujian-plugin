const childProcess = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const readline = require("readline");

const REMOTE_MCP_URL = process.env.ZENGMEI_MCP_URL || "https://yuer.073955.com/mcp";
const appData = process.env.APPDATA || process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
const stateDir = path.join(appData, "ZengmeiTeam");
const deviceFile = path.join(stateDir, "yujian-device-id");
const modelConfigFile = path.join(stateDir, "yujian-model-config.dat");
let setupServer;
let setupUrl;

function ensureStateDirectory() {
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
}

function localDeviceId() {
  ensureStateDirectory();
  if (fs.existsSync(deviceFile)) {
    const saved = fs.readFileSync(deviceFile, "utf8").trim();
    if (saved) return saved;
  }
  const created = `zj-${crypto.randomBytes(24).toString("hex")}`;
  fs.writeFileSync(deviceFile, created, { encoding: "utf8", mode: 0o600 });
  return created;
}

function protectForCurrentUser(value) {
  if (process.platform !== "win32") return Buffer.from(value, "utf8").toString("base64");
  const script = [
    "Add-Type -AssemblyName System.Security",
    "$inputText = [Console]::In.ReadToEnd()",
    "$plain = [Convert]::FromBase64String($inputText)",
    "$cipher = [Security.Cryptography.ProtectedData]::Protect($plain, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)",
    "[Console]::Out.Write([Convert]::ToBase64String($cipher))",
  ].join("; ");
  return childProcess.execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    input: Buffer.from(value, "utf8").toString("base64"),
    encoding: "utf8",
    windowsHide: true,
  }).trim();
}

function unprotectForCurrentUser(value) {
  if (process.platform !== "win32") return Buffer.from(value, "base64").toString("utf8");
  const script = [
    "Add-Type -AssemblyName System.Security",
    "$inputText = [Console]::In.ReadToEnd()",
    "$cipher = [Convert]::FromBase64String($inputText)",
    "$plain = [Security.Cryptography.ProtectedData]::Unprotect($cipher, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)",
    "[Console]::Out.Write([Text.Encoding]::UTF8.GetString($plain))",
  ].join("; ");
  return childProcess.execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    input: value,
    encoding: "utf8",
    windowsHide: true,
  });
}

function validateModelConfig(value) {
  const apiUrl = String(value.apiUrl || "").trim();
  const apiKey = String(value.apiKey || "").trim();
  const modelName = String(value.modelName || "").trim();
  let parsed;
  try {
    parsed = new URL(apiUrl);
  } catch {
    throw new Error("接口地址格式不正确。");
  }
  if (parsed.protocol !== "https:" || !parsed.hostname) {
    throw new Error("接口地址必须是以 https:// 开头的公开 API 地址。");
  }
  if (!apiKey || apiKey.length > 1000) throw new Error("请填写有效的 API 密钥。");
  if (!modelName || modelName.length > 120) throw new Error("请填写有效的模型名称。");
  return { apiUrl, apiKey, modelName };
}

function loadModelConfig() {
  if (!fs.existsSync(modelConfigFile)) return null;
  try {
    return validateModelConfig(JSON.parse(unprotectForCurrentUser(fs.readFileSync(modelConfigFile, "utf8"))));
  } catch {
    return null;
  }
}

function saveModelConfig(value) {
  const config = validateModelConfig(value);
  ensureStateDirectory();
  fs.writeFileSync(modelConfigFile, protectForCurrentUser(JSON.stringify(config)), { encoding: "utf8", mode: 0o600 });
}

function setupPage(message = "") {
  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>曾美团队模型设置</title>
<style>
* { box-sizing: border-box; } body { margin: 0; background: #f4f6f8; color: #1f2933; font: 15px system-ui, sans-serif; }
main { max-width: 620px; margin: 48px auto; padding: 24px; } section { background: #fff; border: 1px solid #d9e1e8; border-radius: 8px; padding: 24px; }
h1 { margin: 0 0 8px; font-size: 24px; } p { color: #52606d; line-height: 1.6; } label { display: block; margin: 18px 0 6px; font-weight: 600; }
input { width: 100%; padding: 11px; border: 1px solid #b9c4cf; border-radius: 5px; font: inherit; } button { margin-top: 22px; width: 100%; padding: 11px; border: 0; border-radius: 5px; background: #1769aa; color: #fff; font: inherit; cursor: pointer; }
.message { color: #16803c; font-weight: 600; }
</style></head>
<body><main><section>
<h1>曾美团队模型设置</h1>
<p>此页面仅在你的电脑本机打开。密钥会加密保存到当前 Windows 用户目录，不会显示在授权后台。</p>
${message ? `<p class="message">${message}</p>` : ""}
<form method="post" action="/save">
<label for="apiUrl">模型接口地址</label>
<input id="apiUrl" name="apiUrl" required placeholder="https://你的平台/v1/chat/completions">
<label for="apiKey">API 密钥</label>
<input id="apiKey" name="apiKey" type="password" required autocomplete="off">
<label for="modelName">模型名称</label>
<input id="modelName" name="modelName" required placeholder="例如：gpt-4o-mini">
<button type="submit">保存模型设置</button>
</form></section></main></body></html>`;
}

function bodyText(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10000) {
        req.destroy();
        reject(new Error("请求过大"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function startSetupServer() {
  if (setupUrl) return setupUrl;
  setupServer = http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(setupPage());
    }
    if (req.method === "POST" && req.url === "/save") {
      try {
        const values = Object.fromEntries(new URLSearchParams(await bodyText(req)));
        saveModelConfig(values);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
        return res.end(setupPage("保存成功。关闭此页面，回到 Codex 继续生成即可。"));
      } catch (error) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end(`保存失败：${error.message}`);
      }
    }
    res.writeHead(404).end();
  });
  await new Promise((resolve) => setupServer.listen(0, "127.0.0.1", resolve));
  setupUrl = `http://127.0.0.1:${setupServer.address().port}`;
  return setupUrl;
}

function result(id, text, isError = false) {
  process.stdout.write(`${JSON.stringify({
    jsonrpc: "2.0",
    id: id ?? null,
    result: { content: [{ type: "text", text }], isError },
  })}\n`);
}

async function remoteRequest(request) {
  const response = await fetch(REMOTE_MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function forward(request) {
  if (request.method === "tools/list") {
    const response = await remoteRequest(request);
    if (response?.result?.tools) {
      response.result.tools.push(
        {
          name: "configure_model",
          description: "打开本机模型接口设置页。用户在页面填写自己的模型接口、密钥和模型名称。",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "model_status",
          description: "检查当前电脑是否已经配置用户自己的模型接口。",
          inputSchema: { type: "object", properties: {} },
        },
      );
    }
    if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
    return;
  }

  if (request.method === "tools/call" && request.params?.name === "configure_model") {
    const url = await startSetupServer();
    return result(request.id, `请让用户在本机浏览器打开并填写模型设置：${url}`);
  }

  if (request.method === "tools/call" && request.params?.name === "model_status") {
    return result(request.id, loadModelConfig()
      ? "当前电脑的模型接口已配置。"
      : "当前电脑尚未配置模型接口，请先调用 configure_model。");
  }

  const nextRequest = JSON.parse(JSON.stringify(request));
  if (nextRequest.method === "tools/call" && nextRequest.params?.name === "activate_license") {
    nextRequest.params.arguments = {
      ...(nextRequest.params.arguments || {}),
      deviceId: localDeviceId(),
    };
  }
  if (nextRequest.method === "tools/call" && nextRequest.params?.name === "generate_content") {
    const modelConfig = loadModelConfig();
    if (!modelConfig) {
      return result(request.id, "请先调用 configure_model，在本机填写自己的模型接口、密钥和模型名称。", true);
    }
    nextRequest.params.arguments = {
      ...(nextRequest.params.arguments || {}),
      modelConfig,
    };
  }
  const response = await remoteRequest(nextRequest);
  if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on("line", (line) => {
  if (!line.trim()) return;
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    return;
  }
  forward(request).catch((error) => {
    process.stdout.write(`${JSON.stringify({
      jsonrpc: "2.0",
      id: request.id ?? null,
      error: { code: -32603, message: `插件本地服务异常：${error.message}` },
    })}\n`);
  });
});
