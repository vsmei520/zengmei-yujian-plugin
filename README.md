# 曾美团队·育见大片

这是曾美团队的远程 Skill 分发项目。

## 安全边界

- GitHub 只分发插件壳和公开配置。
- 核心 Skill 规则不放进插件，也不放进公开仓库。
- 核心规则只部署在宝塔服务器；每位用户的模型密钥仅加密保存在其本机。
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
3. 用户在插件市场刷新后，卸载旧版本并重新安装新版本。

核心规则更新不需要更新插件壳，直接更新宝塔服务端即可。

## 宝塔服务

详见 `server/README.md`。

## 用户第一次使用

1. 在 Codex 插件市场安装“曾美团队·育见大片”。
2. 在对话中发送管理员提供的授权码。
3. 插件提示模型尚未设置时，按提示打开本机 `127.0.0.1` 设置页，填写用户自己的 API 地址、API 密钥和模型名称。
4. 回到 Codex 发送启动词开始生成。

用户密钥不进入 GitHub，不保存到宝塔授权后台；Windows 用户电脑使用系统加密保存该配置。
