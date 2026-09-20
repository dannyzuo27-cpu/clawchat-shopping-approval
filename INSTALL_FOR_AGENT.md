# 给 Agent 的安装说明

目标：把本仓库安装为 ClawChat 消费审判广场。默认使用 Hermes，但服务端不绑定具体模型或 Agent 框架。

## 安装步骤

1. 确认 Agent 已绑定 ClawChat，并能取得当前会话稳定的 `user_id`。
2. 检查 Node.js 20 或更高版本。
3. 在仓库目录运行 `npm run setup`。已有 `.env` 不会被覆盖。
4. 在 `.env` 设置 `PLAZA_AGENT_NAME=Hermes`，并把 `HERMES_CLAWCHAT_URL` 改成真实的 Hermes 分享卡片或加好友链接。
5. 运行 `npm start`，确认 `GET /api/health` 返回 `{"ok":true}`。
6. 完整读取并安装 `skill/SKILL.md`。
7. 把 `.env` 中的地址和令牌安全映射为 `SHOPPING_APPROVAL_API`、`SHOPPING_APPROVAL_TOKEN`。令牌不得出现在聊天、网页或日志中。
8. 用 ClawChat Liveware 能力注册服务页面。可信代理必须注入用户 ID；默认请求头为 `x-clawchat-user-id`。
9. 依次测试页面投稿、聊天投稿、Agent 判词回写、公开广场匿名展示和用户投票。

## 验收标准

- 页面与私聊写入同一套申请数据，不重复建单
- 判词只引用用户真实提供的信息，不编造历史
- 判词短、具体、有梗，不含 AI 八股文
- 未选择公开的申请不会出现在 `GET /api/plaza`
- 公开结果不含昵称、`user_id`、审批人身份和私聊内容
- 投票必须在 ClawChat 身份下进行，同一用户每笔申请只保留一个选择
- “添加好友”按钮能打开真实 Hermes 入口

## 部署选择

- 本地：Agent 和服务在同一台电脑；关机后不可访问。
- 云端：必须使用 HTTPS、持久化存储、可信身份代理。
- 混合：Agent 本地运行，Liveware/API 在云端；Agent 使用服务端令牌访问。

生产环境必须设置 `NODE_ENV=production`，不得保留 `DEV_USER_ID`。
