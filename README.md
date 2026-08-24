# ClawChat Shopping Approval

在 ClawChat 里把“我想买这个”变成一张家庭购物审批单。

你可以直接在 Agent 聊天框里提出购买申请，也可以在 Liveware 页面填写。两个入口会同步到同一条记录：**Agent 负责初审，家人负责最终决定。**

> 当前状态：MVP / Experimental。已经完成本地双入口数据链路测试，正在验证不同 ClawChat Agent 环境中的安装流程。

<!-- 真实联调后，把演示 GIF 放到 docs/assets/demo.gif 并取消下一行注释。 -->
<!-- ![30 秒演示](docs/assets/demo.gif) -->

## 能做什么

- 从 ClawChat 聊天或 Liveware 页面提交购物申请
- 两个入口共用同一个申请 ID，不会生成两份审批单
- 显示谁提出、谁共同审批
- Agent 给出批准、不批准、附条件或补充信息建议
- 人类共同审批人保留最终决定权
- 手机和电脑都能使用
- 不限制 Agent 框架、模型或人设

## 三步开始

需要 Node.js 20 或更高版本。

```bash
git clone https://github.com/dannyzuo27-cpu/clawchat-shopping-approval.git
cd clawchat-shopping-approval
npm run setup
npm start
```

服务默认运行在 `http://127.0.0.1:4174`。

然后让已经接入 ClawChat 的 Agent 阅读 [INSTALL_FOR_AGENT.md](INSTALL_FOR_AGENT.md)，完成 Skill、Liveware 和共同审批人的配置。

> `public/index.html` 不能通过双击文件直接运行。页面需要访问后端审批记录和 ClawChat 身份，请先执行 `npm start`，再打开上面的服务地址。

## 发给 Agent

把仓库链接和下面这段话一起发给已经接入 ClawChat 的 Agent：

```text
请帮我安装这个 ClawChat 购物审批 Liveware。

请先阅读 README.md、INSTALL_FOR_AGENT.md 和 skill/SKILL.md。
不要修改你现有的模型、名字、人设、记忆和其他 Skill。
聊天框与 Liveware 必须使用同一个审批服务和申请 ID。
Agent 只负责初审，ClawChat 中指定的共同审批人负责终审。
安装后请分别测试聊天提交、页面提交、Agent 初审和人类终审。
```

## 它怎么工作

```text
ClawChat 聊天框 ─┐
                 ├── 统一审批记录 ── Agent 初审 ── 人类终审
Liveware 页面 ───┘
```

成员身份使用 ClawChat `user_id`，昵称只负责显示。图片理解取决于你绑定的 Agent 和模型，本项目不绑定模型 API。

## 文档

- [Agent 安装说明](INSTALL_FOR_AGENT.md)
- [部署与安全](docs/DEPLOYMENT.md)
- [审批 API](docs/API.md)
- [Agent 行为协议](skill/SKILL.md)

## 本地预览

如果只想先看页面，可在 `.env` 中临时填写：

```text
DEV_USER_ID=local-preview
DEV_USER_NICKNAME=本地预览
```

再运行 `npm start`。正式使用时必须删除这两项，并设置 `NODE_ENV=production`。

## 项目结构

```text
public/                 Liveware 页面
server.mjs              审批 API 与本地数据存储
skill/SKILL.md          Agent 使用规则
INSTALL_FOR_AGENT.md    Agent 安装步骤
docs/                   部署、接口和演示素材
```

## 说明

这是一个家庭协作工具，不提供财务、法律或购买建议。Agent 输出只是初审意见，最终决定由使用者自己作出。

MIT License

