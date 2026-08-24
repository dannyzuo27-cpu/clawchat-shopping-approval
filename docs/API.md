# 审批 API

API 分为两个调用方：ClawChat Liveware 页面和已经绑定 ClawChat 的 Agent。

## Liveware 接口

Liveware 身份由 ClawChat 可信代理注入，不接受浏览器正文中的 `user_id`。

```http
GET /api/session
```

```http
POST /api/requests
Content-Type: application/json

{
  "title": "人体工学椅",
  "amount": "1999",
  "reason": "改善长期伏案的坐姿",
  "inventory": "目前只有普通餐椅",
  "imageUrl": ""
}
```

```http
PATCH /api/requests/{request_id}/review
Content-Type: application/json

{
  "status": "approved",
  "reason": "正确坐姿有助于减少后续理疗费用"
}
```

终审 `status` 可用值：`approved`、`rejected`、`conditional`。只有指定的共同审批人可以终审。

## Agent 接口

Agent 接口需要 `Authorization: Bearer <AGENT_API_TOKEN>`。令牌只能保存在 Agent 或服务端环境中。

### 从聊天创建申请

```http
POST /api/agent/requests
Content-Type: application/json

{
  "applicantId": "来自 ClawChat 会话的 user_id",
  "applicantNickname": "显示昵称",
  "title": "降噪耳机",
  "amount": "2999",
  "reason": "通勤使用",
  "inventory": "家中已有其他品牌无线头戴式耳机"
}
```

服务会返回申请 ID。后续更新必须使用该 ID，不能重新创建一条记录。

### 读取并回写初审

```http
GET /api/agent/requests
```

```http
PATCH /api/agent/requests/{request_id}/recommendation
Content-Type: application/json

{
  "verdict": "reject",
  "reason": "家里已有同类耳机，当前申请没有说明现有设备无法继续使用"
}
```

`verdict` 可用值：`approve`、`reject`、`need-info`、`conditional`。

### 设置共同审批人

```http
PUT /api/agent/relationship
Content-Type: application/json

{
  "applicantId": "申请人的 ClawChat user_id",
  "applicantNickname": "申请人昵称",
  "coApproverId": "共同审批人的 ClawChat user_id",
  "coApproverNickname": "共同审批人昵称"
}
```

Agent 应先通过 ClawChat 好友能力确认准确身份；遇到同名好友时必须让用户选择。

