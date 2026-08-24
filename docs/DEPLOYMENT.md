# 部署与安全

## 本地部署

本地部署适合个人测试或家里已有长期运行电脑的情况：

```bash
npm run setup
npm start
```

默认数据保存在 `data/store.json`，`.env` 和 `data/` 都已被 `.gitignore` 排除。电脑关机后，服务将无法访问。

## 云端部署

正式对外访问前至少需要：

- Node.js 20 或更高版本
- HTTPS
- 持久化磁盘或数据库
- 位于服务前方的 ClawChat 可信身份代理
- `NODE_ENV=production`
- 不为空且足够随机的 `AGENT_API_TOKEN`

通过 `DATA_DIR` 指定持久化目录。不要把数据写入会随部署销毁的临时文件系统。

默认 JSON 存储面向个人 MVP。多人、多家庭或高并发使用时，应替换成数据库，并按 `household_id` 与 ClawChat `user_id` 做服务端隔离。

## ClawChat 身份

默认从可信请求头读取身份：

```text
x-clawchat-user-id
x-clawchat-nickname
```

如果实际环境使用不同名称，可配置：

```text
CLAWCHAT_USER_HEADER=实际用户ID请求头
CLAWCHAT_NICKNAME_HEADER=实际昵称请求头
```

这些请求头只能由受信任的 ClawChat 代理注入。不要让公网客户端直接访问服务并自行伪造请求头。

## 不能提交到 GitHub

- `.env`、Agent API 令牌、ClawChat 凭据和模型密钥
- 真实家庭账单和审批数据
- 真实 ClawChat `user_id`
- 含隐私信息的截图和日志

## 三种运行方式

- 本地：Agent、API、页面和数据都在同一台电脑。
- 云端：Agent 或 API 运行在服务器，手机可以持续访问。
- 混合：Agent 在本地，Liveware/API 在云端，双方通过统一 API 同步。

无论选择哪种模式，聊天框和 Liveware 都必须使用同一份数据和同一套申请 ID。

