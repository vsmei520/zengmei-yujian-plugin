# 曾美团队·育见大片

这是曾美团队的远程 Skill 分发项目。

## 安全边界

- GitHub 只分发插件壳和公开配置。
- 核心 Skill 规则不放进插件，也不放进公开仓库。
- 核心规则和模型密钥只部署在宝塔服务器。
- 用户通过授权码访问 `https://yuer.073955.com`。

## 项目目录

```text
plugins/                         插件壳，供 Codex 安装
.agents/plugins/marketplace.json 插件市场清单
server/                          宝塔服务器端授权服务
曾美团队...Skill_*.md             本地核心资料，不提交到 GitHub
```

## 发布插件

1. 修改 `plugins/zengmei-team-yujian-dapian-skill/.codex-plugin/plugin.json` 的版本号。
2. 将修改提交并推送到 GitHub。
3. 用户刷新插件市场后安装新版本。

核心规则更新不需要更新插件壳，直接更新宝塔服务端即可。

## 宝塔服务

详见 `server/README.md`。
