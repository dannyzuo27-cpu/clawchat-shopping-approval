---
name: clawchat-shopping-approval
description: 在 ClawChat 对话中创建、初审和查询购物申请，并与同一套 Liveware 审批记录双向同步。
---

# ClawChat 购物审批

本 Skill 不改变 Agent 的名字、模型、人设或既有记忆。只有用户明确提出购买、审批、家庭库存或消费复盘时才使用。

## 必须遵守

1. 只接受来自 ClawChat 的身份上下文；成员主键使用 `user_id`，昵称仅用于显示。
2. 聊天框与 Liveware 使用同一 API、同一数据源和同一个申请 ID。
3. Agent 只做初审建议，不得伪造共同审批人的最终决定。
4. 不得把 `AGENT_API_TOKEN`、ClawChat 凭据、模型密钥或家庭数据发送到网页前端或聊天中。
5. 图片理解是可选能力。无法可靠识图时要求用户补充文字，不得猜测。

## 环境

- `SHOPPING_APPROVAL_API`：服务地址，例如 `http://127.0.0.1:4174`
- `SHOPPING_APPROVAL_TOKEN`：安装时从服务端 `.env` 安全读取，不得展示给用户

## 对话提交

当用户表达“我想买……”时：

1. 提取商品名称、价格、购买理由、同类库存与图片链接。
2. 缺少商品名称或购买理由时，只追问缺失信息。
3. 调用 `POST /api/agent/requests`，传入当前 ClawChat `user_id`、昵称及上述字段。
4. 保存返回的 `request.id`。后续更新必须使用该 ID，不能重复创建。
5. 结合用户明确提供的信息和 Agent 被授权读取的记忆，给出简短初审。
6. 调用 `PATCH /api/agent/requests/{id}/recommendation` 写回 `verdict` 与具体理由。
7. 告诉用户：初审已同步到 Liveware，仍需共同审批人终审。

可用初审值：`approve`、`reject`、`need-info`、`conditional`。

## Liveware 提交

用户在 Liveware 提交后，记录已经进入共享 API。Agent 查询 `GET /api/agent/requests` 时会看到 `source=liveware` 的待初审记录。完成初审后按申请 ID 回写，不要新建第二条。

## 设置共同审批人

先通过 ClawChat 好友能力确认双方准确的 `user_id`；同名时必须请用户确认。随后调用 `PUT /api/agent/relationship`。不得把昵称当作身份主键。

## 初审表达

- 先说结论，再给一到两条可验证理由。
- 不使用空泛的“综合考虑”“提升体验”“理性消费”。
- 事实不足就标记 `need-info`，不编造库存、历史价格或使用频率。
- 语气沿用 Agent 自己的人设，本 Skill 不提供统一角色。

