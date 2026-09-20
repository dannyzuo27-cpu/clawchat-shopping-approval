# 消费审判广场 API

API 分为公开广场、ClawChat Liveware 和 Agent 三类调用方。

## 公开接口

```http
GET /api/config
GET /api/plaza
```

`/api/config` 返回审判官显示名和 ClawChat 好友入口。`/api/plaza` 只返回已经完成 `approve` 或 `reject` 判词、且用户明确选择公开的申请。

公开结果不会包含申请人的 ClawChat `user_id`、真实昵称、共同审批人或私聊内容。

## Liveware 接口

Liveware 身份必须由 ClawChat 可信代理注入，不接受请求正文中的 `user_id`。

### 提交申请

```http
POST /api/requests
Content-Type: application/json

{
  "title": "第六副头戴式耳机",
  "amount": "2299",
  "reason": "新颜色很适合我",
  "inventory": "家里已有 5 副耳机",
  "imageUrl": "",
  "publishToPlaza": true
}
```

`publishToPlaza=false` 时，申请和判词都保持私有。

### 广场投票

```http
POST /api/plaza/{request_id}/vote
Content-Type: application/json

{ "choice": "reject" }
```

`choice` 为 `approve` 或 `reject`。同一 ClawChat 用户对同一申请只保留一个选择；改投时会自动扣除旧票并计入新票。

### 当前会话

```http
GET /api/session
```

用于读取当前成员自己的私有申请和兼容账本数据。

## Agent 接口

请求头必须包含 `Authorization: Bearer <AGENT_API_TOKEN>`。

### 从私聊创建申请

```http
POST /api/agent/requests
Content-Type: application/json

{
  "id": "可选的幂等申请 ID",
  "applicantId": "当前 ClawChat 发言人的 user_id",
  "applicantNickname": "私下显示昵称",
  "title": "口袋相机",
  "amount": "3499",
  "reason": "有了它我一定认真拍视频",
  "inventory": "初代只发布过 4 条，已有运动相机",
  "publishToPlaza": true
}
```

如果 Agent 因超时重试，必须复用相同 `id`，防止重复建单。

### 读取申请并回写判词

```http
GET /api/agent/requests
```

```http
PATCH /api/agent/requests/{request_id}/recommendation
Content-Type: application/json

{
  "verdict": "reject",
  "reason": "驳回。初代拍了四条，新款不会突然觉醒替你更新的人格。",
  "agentName": "Hermes"
}
```

`verdict` 可用值为 `approve`、`reject`、`need-info`、`conditional`。只有前两种会进入公开广场。

## 兼容接口

旧版仍保留：

- `POST /api/ledger`
- `GET|POST /api/agent/ledger`
- `PUT /api/agent/relationship`
- `PATCH /api/requests/{request_id}/review`

它们用于既有安装迁移，不是新版首页的主流程。
