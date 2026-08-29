# 曾美团队 OAuth 服务

这是曾美团队·育见大片的远程 OAuth 授权和 MCP 服务。

用户在 Codex 授权网页中填写手机号和授权码，不需要填写模型地址、模型名称或 API 密钥。生成使用用户自己的 Codex 账号模型，服务端不会调用第三方模型接口。

## 宝塔设置

项目目录：

```text
/www/wwwroot/yuer.073955.com/server
```

启动文件：

```text
src/server.js
```

环境变量：

```text
PORT=3100
HOST=127.0.0.1
PUBLIC_BASE_URL=https://yuer.073955.com
ADMIN_API_KEY=请设置一个新的后台管理员密码
AUTH_MODE=redeem_only
```

反向代理目标：

```text
http://127.0.0.1:3100
```

后台地址：

```text
https://yuer.073955.com/admin
```

管理员用户名固定为 `admin`，密码为 `ADMIN_API_KEY`。

## 数据迁移

首次启动会把旧版 `data/licenses.json` 内的授权码自动导入 `data/licenses.sqlite`。旧文件不要删除，并先备份整个 `data` 文件夹。

升级后的授权、设备和 OAuth 令牌数据都保存在：

```text
data/licenses.sqlite
```

不要覆盖、删除或提交这个文件。
