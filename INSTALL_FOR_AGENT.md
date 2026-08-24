# 给 Agent 的安装说明

目标：把本仓库安装为 ClawChat 专属购物审批 Liveware。不要修改你现有的模型、名字、人设、记忆或其他 Skill。

## 安装步骤

1. 确认自己已经绑定 ClawChat，并能读取当前会话的 `user_id` 与好友身份。
2. 检查 Node.js 20 或更高版本。
3. 在仓库目录运行 `npm run setup`。它只会生成本地 `.env` 和随机 Agent 令牌，不会覆盖已有 `.env`。
4. 运行 `npm start`，确认 `GET /api/health` 返回 `{"ok":true}`。
5. 完整读取并安装 `skill/SKILL.md`；按当前 Agent 框架的 Skill 目录约定放置或建立链接。
6. 将 `.env` 中的服务地址和令牌安全映射为 `SHOPPING_APPROVAL_API` 与 `SHOPPING_APPROVAL_TOKEN`。令牌不能发进聊天、网页或日志。
7. 用 ClawChat Liveware 能力注册此页面。ClawChat 身份代理必须在转发时注入可信的用户 ID 请求头；默认名称是 `x-clawchat-user-id`。
8. 从 ClawChat 好友列表解析申请人与共同审批人的准确 `user_id`，调用关系接口完成绑定。
9. 分别从聊天框和 Liveware 各提交一次测试，确认两条记录都能在同一列表出现；再让 Agent 回写初审、人类回写终审。

## 部署选择

- 本地：服务与 Agent 在同一台电脑，最简单，电脑关机后不可访问。
- 云端：把服务部署到用户控制的服务器，必须使用 HTTPS、持久化存储和可信身份代理。
- 混合：Agent 在本地、Liveware/API 在云端，Agent 使用服务端令牌访问统一 API。

生产环境必须设置 `NODE_ENV=production`，不得使用 `DEV_USER_ID`。如果 ClawChat 实际注入的请求头名称不同，修改 `CLAWCHAT_USER_HEADER` 与 `CLAWCHAT_NICKNAME_HEADER`。

## 验收结果

安装完成后向用户报告：

- Liveware 访问入口
- 数据保存位置
- 当前申请人与共同审批人的昵称（不要公开完整 user_id）
- 聊天提交、页面提交、Agent 初审、人类终审四项是否通过
- 图片理解是否由当前 Agent/模型真实支持

