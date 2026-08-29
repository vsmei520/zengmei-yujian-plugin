# 宝塔最简部署

## 1. 上传

把 `server` 文件夹上传到：

```text
/www/wwwroot/yuer.073955.com/server
```

## 2. 设置环境变量

在宝塔 Node 项目或 PM2 环境变量中设置：

```text
PORT=3100
ADMIN_KEY=请替换成你自己的管理员密码
```

不要把 `ADMIN_KEY` 写进网页文件或提交到公开仓库。

## 3. 启动

在 `server` 目录运行：

```bash
node server.js
```

或者使用宝塔 Node 项目管理器：

```text
启动文件：server.js
项目目录：/www/wwwroot/yuer.073955.com/server
端口：3100
```

## 4. 反向代理

网站 `yuer.073955.com` 添加反向代理：

```text
目标 URL：http://127.0.0.1:3100
```

然后访问：

```text
https://yuer.073955.com/admin
```

## 5. 生成授权码

打开管理页面，输入 `ADMIN_KEY`，选择有效期，点击“生成授权码”。

后台支持：

- 用户名称和联系方式
- 激活码
- 创建时间
- 首次激活时间
- 到期时间
- 停止使用
- 恢复使用

授权码数据保存在：

```text
server/data/licenses.json
```

这个版本不需要数据库，也不需要本地运行授权命令。

## 6. 更新规则

核心 Skill 规则放在服务器时，直接替换服务器端规则并重启 Node 项目即可生效。

插件壳更新时：

1. 修改插件 `.codex-plugin/plugin.json` 的 `version`
2. 将插件目录更新到远程 marketplace 仓库
3. 用户刷新或重新安装插件

授权后台地址保持不变，不需要重新生成授权码。
