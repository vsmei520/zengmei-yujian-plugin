const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");

const REMOTE_MCP_URL = process.env.ZENGMEI_MCP_URL || "https://yuer.073955.com/mcp";
const appData = process.env.APPDATA || process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
const stateDir = path.join(appData, "ZengmeiTeam");
const deviceFile = path.join(stateDir, "yujian-device-id");

function localDeviceId() {
  fs.mkdirSync(stateDir, { recursive: true });
  if (fs.existsSync(deviceFile)) {
    const saved = fs.readFileSync(deviceFile, "utf8").trim();
    if (saved) return saved;
  }
  const created = `zj-${crypto.randomBytes(24).toString("hex")}`;
  fs.writeFileSync(deviceFile, created, { encoding: "utf8", mode: 0o600 });
  return created;
}

async function forward(request) {
  const nextRequest = JSON.parse(JSON.stringify(request));
  if (nextRequest.method === "tools/call" && nextRequest.params?.name === "activate_license") {
    nextRequest.params.arguments = {
      ...(nextRequest.params.arguments || {}),
      deviceId: localDeviceId(),
    };
  }
  const response = await fetch(REMOTE_MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(nextRequest),
  });
  const text = await response.text();
  if (text) process.stdout.write(`${text}\n`);
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
      error: { code: -32603, message: `远程授权服务连接失败：${error.message}` },
    })}\n`);
  });
});
