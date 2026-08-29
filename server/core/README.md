# 核心规则部署位置

把两份不公开的核心 Skill 文件放在本目录，文件名必须是：

- `skill-10s.md`
- `skill-15s.md`
- `fixed-10s.md`
- `fixed-15s.md`

这四个文件不要提交到 GitHub。服务器只会读取规则并把最终结果返回给授权用户，不会返回规则原文。

如果文件名或目录不同，可以在宝塔 Node 项目的环境变量中设置：

```text
CORE_SKILL_10S=/www/wwwroot/yuer.073955.com/server/core/skill-10s.md
CORE_SKILL_15S=/www/wwwroot/yuer.073955.com/server/core/skill-15s.md
```
