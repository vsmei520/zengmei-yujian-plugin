const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3100);
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const DATA_DIR = path.join(__dirname, "data");
const LICENSE_FILE = path.join(DATA_DIR, "licenses.json");
const PLUGIN_ID = "zengmei-team-yujian-dapian-skill";

if (!ADMIN_KEY) {
  throw new Error("ADMIN_KEY is required.");
}

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(LICENSE_FILE)) {
  fs.writeFileSync(LICENSE_FILE, "[]", "utf8");
}

function readLicenses() {
  return JSON.parse(fs.readFileSync(LICENSE_FILE, "utf8"));
}

function writeLicenses(licenses) {
  const tempFile = `${LICENSE_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(licenses, null, 2), "utf8");
  fs.renameSync(tempFile, LICENSE_FILE);
}

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function adminAuthorized(req, input = {}) {
  return req.headers["x-admin-key"] === ADMIN_KEY || input.adminKey === ADMIN_KEY;
}

function page(res) {
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>曾美团队授权管理</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f4f6f8; color: #1f2933; font: 14px system-ui, sans-serif; }
    main { max-width: 1200px; margin: 32px auto; padding: 24px; }
    header, section { background: white; border: 1px solid #d9e1e8; border-radius: 8px; padding: 20px; margin-bottom: 18px; }
    h1 { margin: 0 0 6px; font-size: 24px; }
    h2 { margin: 0 0 16px; font-size: 18px; }
    .hint { color: #52606d; margin: 0; }
    .form-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr auto; gap: 12px; align-items: end; }
    label { display: block; margin-bottom: 6px; font-weight: 600; }
    input, select, button { width: 100%; padding: 10px 11px; font: inherit; }
    input, select { border: 1px solid #b9c4cf; border-radius: 5px; }
    button { border: 0; border-radius: 5px; background: #1769aa; color: white; cursor: pointer; }
    button:hover { background: #125484; }
    button.secondary { background: #6b7280; }
    button.danger { background: #c0392b; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 850px; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 12px 8px; text-align: left; white-space: nowrap; }
    th { color: #52606d; background: #f8fafc; }
    code { color: #075985; }
    .status { font-weight: 600; }
    .active { color: #16803c; }
    .revoked { color: #b42318; }
    .expired { color: #a15c00; }
    .actions { display: flex; gap: 6px; }
    .actions button { width: auto; padding: 7px 10px; }
    #login { max-width: 420px; margin: 15vh auto; }
    #app { display: none; }
    @media (max-width: 800px) { .form-grid { grid-template-columns: 1fr 1fr; } .form-grid button { grid-column: span 2; } }
  </style>
</head>
<body>
<main>
<section id="login">
  <h1>曾美团队授权管理</h1>
  <p class="hint">管理员登录后管理授权码。</p>
  <form id="loginForm">
    <label for="adminKey">管理员密码</label>
    <input id="adminKey" type="password" required autocomplete="current-password">
    <button type="submit">进入管理后台</button>
  </form>
</section>
<div id="app">
  <header>
    <h1>曾美团队授权管理</h1>
    <p class="hint">可创建授权码、查看用户状态，并停止或恢复使用。</p>
  </header>
  <section>
    <h2>生成授权码</h2>
    <form id="createForm" class="form-grid">
      <div><label for="userName">用户名称</label><input id="userName" required placeholder="例如：张三"></div>
      <div><label for="days">有效期</label><select id="days"><option value="30">30 天</option><option value="90">90 天</option><option value="365">365 天</option></select></div>
      <div><label for="userContact">联系方式</label><input id="userContact" placeholder="手机号或备注"></div>
      <div><label for="note">备注</label><input id="note" placeholder="可选"></div>
      <button type="submit">生成授权码</button>
    </form>
    <pre id="result">等待操作</pre>
  </section>
  <section>
    <h2>授权用户</h2>
    <div class="table-wrap">
      <table><thead><tr><th>用户</th><th>联系方式</th><th>激活码</th><th>创建时间</th><th>激活时间</th><th>到期时间</th><th>状态</th><th>操作</th></tr></thead><tbody id="rows"></tbody></table>
    </div>
  </section>
</main>
<script>
let adminKey = "";
const login = document.getElementById("login");
const app = document.getElementById("app");
const result = document.getElementById("result");
function api(path, options = {}) {
  return fetch(path, { ...options, headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey, ...(options.headers || {}) } }).then((r) => r.json());
}
function esc(value) {
  return String(value || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function date(value) { return value ? new Date(value).toLocaleString() : "-"; }
async function loadRows() {
  const data = await api("/admin/api/licenses");
  if (!data.ok) { alert(data.error || "读取失败"); return; }
  document.getElementById("rows").innerHTML = data.licenses.map((item) => {
    const stopped = item.status === "REVOKED";
    const expired = !stopped && Date.parse(item.expiresAt) <= Date.now();
    const status = stopped ? "已停止" : expired ? "已过期" : "正常";
    const cls = stopped ? "revoked" : expired ? "expired" : "active";
    return "<tr><td>" + esc(item.userName) + "</td><td>" + esc(item.userContact) + "</td><td><code>" + esc(item.licenseKey) + "</code></td><td>" + date(item.createdAt) + "</td><td>" + date(item.activatedAt) + "</td><td>" + date(item.expiresAt) + "</td><td class='status " + cls + "'>" + status + "</td><td class='actions'><button class='" + (stopped ? "secondary" : "danger") + "' data-key='" + esc(item.licenseKey) + "' data-status='" + (stopped ? "ACTIVE" : "REVOKED") + "'>" + (stopped ? "恢复使用" : "停止使用") + "</button></td></tr>";
  }).join("");
}
document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  adminKey = document.getElementById("adminKey").value;
  const data = await api("/admin/api/licenses");
  if (!data.ok) { alert(data.error || "管理员密码错误"); return; }
  login.style.display = "none"; app.style.display = "block"; loadRows();
});
document.getElementById("createForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = await api("/admin/api/licenses", { method: "POST", body: JSON.stringify({
    days: Number(document.getElementById("days").value),
    userName: document.getElementById("userName").value,
    userContact: document.getElementById("userContact").value,
    note: document.getElementById("note").value
  })});
  result.textContent = data.ok ? "授权码：" + data.licenseKey + "\\n到期时间：" + date(data.expiresAt) : "失败：" + (data.error || "未知错误");
  if (data.ok) { document.getElementById("createForm").reset(); loadRows(); }
});
document.getElementById("rows").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-key]");
  if (!button) return;
  const data = await api("/admin/api/licenses/status", { method: "POST", body: JSON.stringify({ licenseKey: button.dataset.key, status: button.dataset.status }) });
  if (!data.ok) { alert(data.error || "操作失败"); return; }
  loadRows();
});
</script>
</body>
</html>`;
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function bodyOf(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100000) {
        reject(new Error("request too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

function newLicense(days) {
  const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
  const random = crypto.randomBytes(12).toString("hex").toUpperCase();
  return {
    licenseKey: `YJ-${random.slice(0, 4)}-${random.slice(4, 8)}-${random.slice(8, 16)}`,
    pluginId: PLUGIN_ID,
    createdAt: new Date().toISOString(),
    activatedAt: null,
    userName: "",
    userContact: "",
    note: "",
    expiresAt,
    status: "ACTIVE",
    deviceId: null,
  };
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    return json(res, 200, { ok: true, service: PLUGIN_ID });
  }

  if (req.method === "GET" && requestUrl.pathname === "/admin") {
    return page(res);
  }

  if (req.method === "POST" && requestUrl.pathname === "/admin/api/licenses") {
    try {
      const input = await bodyOf(req);
      if (!adminAuthorized(req, input)) {
        return json(res, 401, { ok: false, error: "管理员密码错误" });
      }
      const days = Number(input.days);
      if (![30, 90, 365].includes(days)) {
        return json(res, 400, { ok: false, error: "有效期参数错误" });
      }
      if (!String(input.userName || "").trim()) {
        return json(res, 400, { ok: false, error: "请填写用户名称" });
      }
      const license = newLicense(days);
      license.userName = String(input.userName).trim().slice(0, 100);
      license.userContact = String(input.userContact || "").trim().slice(0, 100);
      license.note = String(input.note || "").trim().slice(0, 200);
      const licenses = readLicenses();
      licenses.push(license);
      writeLicenses(licenses);
      return json(res, 200, {
        ok: true,
        licenseKey: license.licenseKey,
        expiresAt: license.expiresAt,
      });
    } catch {
      return json(res, 400, { ok: false, error: "请求格式错误" });
    }
  }

  if (req.method === "GET" && requestUrl.pathname === "/admin/api/licenses") {
    if (!adminAuthorized(req)) {
      return json(res, 401, { ok: false, error: "管理员密码错误" });
    }
    return json(res, 200, { ok: true, licenses: readLicenses() });
  }

  if (req.method === "POST" && requestUrl.pathname === "/admin/api/licenses/status") {
    try {
      const input = await bodyOf(req);
      if (!adminAuthorized(req, input)) {
        return json(res, 401, { ok: false, error: "管理员密码错误" });
      }
      if (!["ACTIVE", "REVOKED"].includes(input.status)) {
        return json(res, 400, { ok: false, error: "状态参数错误" });
      }
      const licenses = readLicenses();
      const license = licenses.find((item) => item.licenseKey === input.licenseKey);
      if (!license) {
        return json(res, 404, { ok: false, error: "授权码不存在" });
      }
      license.status = input.status;
      writeLicenses(licenses);
      return json(res, 200, { ok: true });
    } catch {
      return json(res, 400, { ok: false, error: "请求格式错误" });
    }
  }

  if (req.method === "POST" && requestUrl.pathname === "/v1/license/activate") {
    try {
      const input = await bodyOf(req);
      const licenses = readLicenses();
      const license = licenses.find((item) => item.licenseKey === input.licenseKey);
      if (!license || license.status !== "ACTIVE") {
        return json(res, 401, { ok: false, error: "授权码无效" });
      }
      if (Date.parse(license.expiresAt) <= Date.now()) {
        return json(res, 401, { ok: false, error: "授权码已过期" });
      }
      if (input.pluginId !== PLUGIN_ID) {
        return json(res, 400, { ok: false, error: "插件不匹配" });
      }
      if (!license.deviceId) {
        license.deviceId = input.deviceId || null;
        license.activatedAt = new Date().toISOString();
        writeLicenses(licenses);
      } else if (license.deviceId !== input.deviceId) {
        return json(res, 403, { ok: false, error: "授权码已绑定其他设备" });
      }
      const accessToken = crypto.randomBytes(32).toString("hex");
      return json(res, 200, {
        ok: true,
        licenseId: license.licenseKey,
        accessToken,
        expiresAt: license.expiresAt,
        packageVersion: "1.0.0",
      });
    } catch {
      return json(res, 400, { ok: false, error: "请求格式错误" });
    }
  }

  if (req.method === "GET" && requestUrl.pathname === "/v1/plugin/manifest") {
    return json(res, 200, {
      pluginId: PLUGIN_ID,
      latestVersion: "1.0.0",
      minimumClientVersion: "1.0.0",
      releaseChannel: "stable",
      forceUpdate: false,
    });
  }

  return json(res, 404, { ok: false, error: "not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`曾美团队授权服务已启动: 127.0.0.1:${PORT}`);
});
