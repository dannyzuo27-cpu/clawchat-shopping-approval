# ClawChat 消费审判广场

别急着下单，先把购买理由交给 Agent，再让广场上的人投票。

这是一个为 ClawChat 设计的匿名消费审判 Liveware：用户既可以在页面投稿，也可以在 Agent 私聊里说“我想买……”。Hermes 根据真实信息给出一句不拐弯的判词；用户主动选择公开后，申请才会匿名进入广场。

> 当前状态：MVP / Experimental。默认审判官是 Hermes，但后端协议不绑定模型或 Agent 框架。

## 核心玩法

- 浏览匿名消费申请和 Agent 锐评
- 对每笔申请投“通过”或“驳回”
- 从广场跳转 ClawChat 添加 Hermes 好友
- 从 Liveware 页面或 ClawChat 私聊提交同一类申请
- 私聊默认不公开；只有用户主动勾选，判词完成后才进入广场
- 公开数据移除 ClawChat 昵称、`user_id`、共同审批人和私聊内容
- 手机与电脑自适应

旧版账本与家庭审批 API 暂时保留，方便已有安装继续运行；它们不再是首页主叙事。

## 快速开始

需要 Node.js 20 或更高版本。

```bash
git clone https://github.com/dannyzuo27-cpu/clawchat-shopping-approval.git
cd clawchat-shopping-approval
npm run setup
npm start
```

本地服务默认运行在 `http://127.0.0.1:4174`。不要双击 `public/index.html`，页面依赖服务端数据和 ClawChat 身份。

只想预览时，可以在 `.env` 临时填写：

```text
DEV_USER_ID=local-preview
DEV_USER_NICKNAME=本地预览
```

正式使用必须清空这两项并设置 `NODE_ENV=production`。

## 发给 Hermes

把仓库链接和下面这段话发给已经接入 ClawChat 的 Hermes：

```text
请帮我安装这个 ClawChat 消费审判广场。

先完整阅读 README.md、INSTALL_FOR_AGENT.md 和 skill/SKILL.md。
不要修改你现有的模型、名字、记忆和其他 Skill。
Liveware 页面和聊天框提交的申请必须进入同一个 API，不得重复创建。
判词必须先给结论，再引用申请里的具体证据；不要使用“综合考虑、建议理性消费”等 AI 套话，也不要编造我的库存和历史。
公开内容必须匿名。只有用户明确选择公开，才允许进入广场。
安装后测试：页面投稿、聊天投稿、Hermes 回写判词、广场匿名展示和用户投票。
```

## 数据流

```text
ClawChat 私聊 ─┐
               ├─ 统一申请 API ─ Hermes 判词 ─ 用户选择公开 ─ 匿名广场 ─ 大家投票
Liveware 投稿 ─┘
```

## 配置

`.env` 中新增：

```text
PLAZA_AGENT_NAME=Hermes
HERMES_CLAWCHAT_URL=https://cn.clawling.com/zh/chat/?ch=jo
```

`HERMES_CLAWCHAT_URL` 最好替换成 Hermes 在 ClawChat 的真实分享卡片或加好友链接。

## 文档

- [给 Agent 的安装说明](INSTALL_FOR_AGENT.md)
- [Agent 行为协议](skill/SKILL.md)
- [API](docs/API.md)
- [部署与安全](docs/DEPLOYMENT.md)

这是一个娱乐性质的消费决策工具，不提供财务、法律或投资建议。最终是否购买始终由用户本人决定。

MIT License
