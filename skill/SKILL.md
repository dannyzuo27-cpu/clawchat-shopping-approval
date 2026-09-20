---
name: clawchat-consumption-court
description: 在 ClawChat 私聊中创建消费申请，为申请生成短、具体、犀利但不伤人的判词，并按用户选择匿名发布到消费审判广场。
---

# ClawChat 消费审判广场

本 Skill 不修改 Agent 的名字、模型、既有记忆或其他 Skill。默认展示名可设为 Hermes；其他 Agent 也可以使用同一协议。

## 安全与事实边界

1. 成员主键只能使用 ClawChat 提供的 `user_id`，昵称只用于私下显示。
2. 不得把 `AGENT_API_TOKEN`、ClawChat 凭据、模型密钥或私聊记录发送到网页前端。
3. 只引用用户明确提供的信息和已获授权的记忆；不猜库存、使用次数、收入、疾病或关系。
4. 只吐槽消费行为、购买理由和自相矛盾之处，不攻击人格、外貌、身体、职业或受保护特征。
5. 未经用户明确选择，申请保持 `private`，不得发布到广场。
6. 图片能力不确定时只提取可靠信息；看不清就让用户补充文字。

## 环境

- `SHOPPING_APPROVAL_API`：服务地址，例如 `http://127.0.0.1:4174`
- `SHOPPING_APPROVAL_TOKEN`：服务端 `.env` 的令牌，只能安全保存，不能展示

## 私聊提交消费申请

当用户表达“我想买……”：

1. 提取商品名称、价格、购买理由、已有替代品、图片链接，以及用户是否愿意匿名公开。
2. 缺少商品名称或理由时只追问缺失项；不为了凑表单问无关问题。
3. 调用 `POST /api/agent/requests`，传入当前 ClawChat `user_id`、昵称和 `publishToPlaza`。
4. 保存返回的 `request.id`；重试与后续更新必须复用，禁止重复创建。
5. 根据下方规则写判词，调用 `PATCH /api/agent/requests/{id}/recommendation`。
6. 告诉用户结论，并说明是否已匿名进入广场。

Liveware 页面产生的申请已经在同一 API 中。读取 `GET /api/agent/requests` 后直接按原 ID 回写，不得另建一条。

## 判词规则

- 第一句必须是“通过。”或“驳回。”
- 总长优先控制在 25—70 个汉字，通常一到两句。
- 必须点名一个具体证据：数量、价格、已有替代品、使用次数或申请理由中的原话。
- 像一个嘴快但靠谱的朋友，不写报告，不讲大道理。
- 禁用套话：`综合考虑`、`根据你提供的信息`、`建议理性消费`、`提升生活品质`、`权衡利弊`。
- 事实不足时用 `need-info` 追问，不靠编故事制造笑点。

合格示例：

- `驳回。你不是在买耳机，是在给前五副耳机招第六个舍友。`
- `驳回。初代拍了四条，新款不会突然觉醒替你更新的人格。`
- `通过。椅子是 1899，你的腰一旦送去理疗，收费可不止这点。`

不合格示例：

- `综合考虑你的需求和预算，建议你理性消费。`
- `你就是管不住手。`
- `你上次只用了三次。`（如果用户从未提供过这个事实）

## 接口顺序

```text
POST /api/agent/requests
PATCH /api/agent/requests/{request_id}/recommendation
GET /api/plaza
POST /api/plaza/{request_id}/vote   # 由带 ClawChat 身份的 Liveware 用户调用
```

Agent 回写的 `verdict` 使用 `approve`、`reject`、`need-info` 或 `conditional`。只有 `approve` 与 `reject` 且 `visibility=public` 的申请会进入广场。

旧版记账和共同审批接口继续兼容，但不属于本 Skill 的默认对话流程。
