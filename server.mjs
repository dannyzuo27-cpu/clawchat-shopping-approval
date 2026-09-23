import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { timingSafeEqual } from "node:crypto";

await loadDotEnv();

const root = resolve(".");
const publicRoot = join(root, "public");
const dataRoot = resolve(process.env.DATA_DIR || "./data");
const storePath = join(dataRoot, "store.json");
const port = Number(process.env.PORT || 4174);
const host = process.env.HOST || "127.0.0.1";
const userHeader = (process.env.CLAWCHAT_USER_HEADER || "x-clawchat-user-id").toLowerCase();
const nicknameHeader = (process.env.CLAWCHAT_NICKNAME_HEADER || "x-clawchat-nickname").toLowerCase();
const agentName = process.env.PLAZA_AGENT_NAME || "Hermes";
const agentUsername = process.env.CLAWCHAT_AGENT_USERNAME || "";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function emptyStore() {
  return { version: 4, members: {}, relationships: {}, requests: [], ledger: [], votes: {}, comments: {}, updatedAt: new Date().toISOString() };
}

const plazaSeeds = [
  {
    id: "demo-headphones",
    demo: true,
    source: "plaza-demo",
    title: "第六副头戴式耳机",
    amount: "2299",
    reason: "这个颜色很适合我，而且新的降噪肯定更好。",
    inventory: "家里已有 5 副耳机，其中 2 副是降噪头戴式",
    imageUrl: "",
    emoji: "🎧",
    applicantId: "anonymous-demo-1",
    applicantNickname: "一位陌生人",
    publicAlias: "一位陌生人",
    visibility: "public",
    agentVerdict: "reject",
    agentReason: "驳回。你不是在买耳机，是在给前五副耳机招第六个舍友。",
    agentName: "Hermes",
    status: "published",
    voteCounts: { approve: 86, reject: 741 },
    commentsCount: 42,
    createdAt: "2026-09-18T12:10:00.000Z",
    updatedAt: "2026-09-18T12:10:00.000Z"
  },
  {
    id: "demo-camera",
    demo: true,
    source: "plaza-demo",
    title: "新款口袋相机",
    amount: "3499",
    reason: "有了它我一定会认真拍视频，它小巧便携。",
    inventory: "三年前买过初代，总共发布过 4 条视频；现有一台运动相机",
    imageUrl: "",
    emoji: "📷",
    applicantId: "anonymous-demo-2",
    applicantNickname: "一位陌生人",
    publicAlias: "一位陌生人",
    visibility: "public",
    agentVerdict: "reject",
    agentReason: "驳回。初代拍了四条，新款不会突然觉醒替你更新的人格。",
    agentName: "Hermes",
    status: "published",
    voteCounts: { approve: 119, reject: 1204 },
    commentsCount: 96,
    createdAt: "2026-09-19T06:35:00.000Z",
    updatedAt: "2026-09-19T06:35:00.000Z"
  },
  {
    id: "demo-chair",
    demo: true,
    source: "plaza-demo",
    title: "人体工学椅",
    amount: "1899",
    reason: "每天坐八个小时，最近腰已经开始报警。",
    inventory: "目前用餐椅办公，没有同类替代品",
    imageUrl: "",
    emoji: "🪑",
    applicantId: "anonymous-demo-3",
    applicantNickname: "一位陌生人",
    publicAlias: "一位陌生人",
    visibility: "public",
    agentVerdict: "approve",
    agentReason: "通过。椅子的价格是 1899，而你的腰一旦送去理疗，收费可不止这点。",
    agentName: "Hermes",
    status: "published",
    voteCounts: { approve: 932, reject: 64 },
    commentsCount: 31,
    createdAt: "2026-09-19T10:20:00.000Z",
    updatedAt: "2026-09-19T10:20:00.000Z"
  },
  {
    id: "demo-photo-printer",
    demo: true,
    source: "plaza-demo",
    title: "新款照片打印机",
    amount: "699",
    reason: "想把手机里的照片都打印出来，做一本真正能翻的生活相册。",
    inventory: "家里已有一台，打印效果一般；过去一年总共用过 3 次",
    imageUrl: "",
    emoji: "🖨️",
    applicantId: "anonymous-demo-4",
    applicantNickname: "一位陌生人",
    publicAlias: "想重启仪式感的人",
    visibility: "public",
    agentVerdict: "reject",
    agentReason: "驳回。旧打印机一年出勤三次，换新机不会顺便给你补发十二个月的仪式感。",
    agentName: "Hermes",
    status: "published",
    voteCounts: { approve: 143, reject: 986 },
    commentsCount: 58,
    createdAt: "2026-09-19T13:42:00.000Z",
    updatedAt: "2026-09-19T13:42:00.000Z"
  },
  {
    id: "demo-dishwasher",
    demo: true,
    source: "plaza-demo",
    title: "台式洗碗机",
    amount: "1699",
    reason: "两个人每天做饭，最容易因为谁洗碗互相装没看见。",
    inventory: "厨房有固定空位，目前没有洗碗机；近 30 天在家做饭 22 次",
    imageUrl: "",
    emoji: "🍽️",
    applicantId: "anonymous-demo-5",
    applicantNickname: "一位陌生人",
    publicAlias: "拒绝洗碗的二人组",
    visibility: "public",
    agentVerdict: "approve",
    agentReason: "通过。一个月做饭 22 次，这 1699 买的不只是机器，还是家庭和平维护费。",
    agentName: "Hermes",
    status: "published",
    voteCounts: { approve: 1356, reject: 89 },
    commentsCount: 73,
    createdAt: "2026-09-19T15:18:00.000Z",
    updatedAt: "2026-09-19T15:18:00.000Z"
  },
  {
    id: "demo-perfume",
    demo: true,
    source: "plaza-demo",
    title: "秋冬限定香水",
    amount: "1080",
    reason: "这个味道很像雨后的木头，和我现有的每一瓶都不一样。",
    inventory: "现有 17 瓶香水，其中 9 瓶容量还剩八成以上",
    imageUrl: "",
    emoji: "🧴",
    applicantId: "anonymous-demo-6",
    applicantNickname: "一位陌生人",
    publicAlias: "闻什么都缺一瓶的人",
    visibility: "public",
    agentVerdict: "reject",
    agentReason: "驳回。17 瓶里有 9 瓶还没过试用期，雨后的木头先在专柜闻完就走。",
    agentName: "Hermes",
    status: "published",
    voteCounts: { approve: 311, reject: 1472 },
    commentsCount: 121,
    createdAt: "2026-09-20T02:05:00.000Z",
    updatedAt: "2026-09-20T02:05:00.000Z"
  },
  {
    id: "demo-concert",
    demo: true,
    source: "plaza-demo",
    title: "喜欢了八年的歌手演唱会",
    amount: "1280",
    reason: "第一次抢到原价票，而且就在本地，不用额外买机票住酒店。",
    inventory: "本月娱乐预算还剩 1460 元；没有为这场演出买过重复场次",
    imageUrl: "",
    emoji: "🎫",
    applicantId: "anonymous-demo-7",
    applicantNickname: "一位陌生人",
    publicAlias: "终于抢到票的人",
    visibility: "public",
    agentVerdict: "approve",
    agentReason: "通过。喜欢八年、原价、本地、预算内——这都不批，留钱是准备给遗憾付利息吗？",
    agentName: "Hermes",
    status: "published",
    voteCounts: { approve: 1882, reject: 126 },
    commentsCount: 94,
    createdAt: "2026-09-20T04:26:00.000Z",
    updatedAt: "2026-09-20T04:26:00.000Z"
  },
  {
    id: "demo-treadmill",
    demo: true,
    source: "plaza-demo",
    title: "可折叠家用跑步机",
    amount: "2399",
    reason: "以后下雨也能在家跑步，折叠起来还不占地方。",
    inventory: "健身房年卡还剩 9 个月，过去 60 天打卡 4 次；阳台已有一台闲置动感单车",
    imageUrl: "",
    emoji: "🏃",
    applicantId: "anonymous-demo-8",
    applicantNickname: "一位陌生人",
    publicAlias: "下雨才想运动的人",
    visibility: "public",
    agentVerdict: "reject",
    agentReason: "驳回。年卡 60 天去了 4 次，跑步机折叠后的主要用途大概率是挂衣服。",
    agentName: "Hermes",
    status: "published",
    voteCounts: { approve: 208, reject: 1649 },
    commentsCount: 137,
    createdAt: "2026-09-20T08:03:00.000Z",
    updatedAt: "2026-09-20T08:03:00.000Z"
  },
  {
    id: "demo-figure",
    demo: true,
    source: "plaza-demo",
    title: "等了一年的限定手办",
    amount: "1299",
    reason: "从第一次公布就一直想要，预售问过三次，到现在也没找到更喜欢的。",
    inventory: "今年还没买过手办；收藏柜已提前留出位置",
    imageUrl: "",
    emoji: "🎲",
    applicantId: "anonymous-demo-9",
    applicantNickname: "一位陌生人",
    publicAlias: "问了三次还没下单的人",
    visibility: "public",
    agentVerdict: "approve",
    agentReason: "通过。问了三次、等了一年、位置都留好了——这不是冲动，是审批流程拖得太久。",
    agentName: "Hermes",
    status: "published",
    voteCounts: { approve: 1108, reject: 247 },
    commentsCount: 66,
    createdAt: "2026-09-20T11:47:00.000Z",
    updatedAt: "2026-09-20T11:47:00.000Z"
  },
  {
    id: "demo-keyboard",
    demo: true,
    source: "plaza-demo",
    title: "第三把机械键盘",
    amount: "799",
    reason: "办公室那把声音太大，这把是静音轴，而且配色真的很治愈。",
    inventory: "家里两把键盘都能正常使用；其中一把同样是静音轴",
    imageUrl: "",
    emoji: "⌨️",
    applicantId: "anonymous-demo-10",
    applicantNickname: "一位陌生人",
    publicAlias: "被配色治愈的人",
    visibility: "public",
    agentVerdict: "reject",
    agentReason: "驳回。静音轴家里已经有了，你想治愈的不是打字声，是购物车没结算的红点。",
    agentName: "Hermes",
    status: "published",
    voteCounts: { approve: 427, reject: 1216 },
    commentsCount: 84,
    createdAt: "2026-09-20T14:32:00.000Z",
    updatedAt: "2026-09-20T14:32:00.000Z"
  }
];

const plazaDemoComments = {
  "demo-headphones": [
    ["耳机收藏家", "第六副买回去，前五副会给它开欢迎会吗？"],
    ["通勤降噪受害者", "颜色可以换耳罩解决，别拿配色冒充刚需。"],
  ],
  "demo-camera": [
    ["四条视频观众", "设备升级得很勤，更新频率倒是很稳定。"],
    ["器材党观察员", "先用 Action 连续拍十条，再谈 Pocket 的未来。"],
  ],
  "demo-chair": [
    ["腰椎代表", "这单我替你的腰按下通过。"],
    ["办公室坐牢人", "餐椅坐八小时不是省钱，是分期付款给理疗店。"],
  ],
  "demo-photo-printer": [
    ["相册停更三年", "建议先给旧打印机补一包相纸，看它能不能复工。"],
    ["仪式感审计员", "一年三次，这不是设备问题，是项目已经停摆。"],
  ],
  "demo-dishwasher": [
    ["家庭和平大使", "能少吵一次架就开始回本了。"],
    ["今晚不洗碗", "22 次做饭的数据比‘提升幸福感’有说服力多了。"],
  ],
  "demo-perfume": [
    ["鼻子已经工伤", "九瓶八成新，说明每一瓶都曾经‘完全不一样’。"],
    ["专柜试香纸", "允许闻，不允许带走。"],
  ],
  "demo-concert": [
    ["抢票陪跑选手", "原价、本地、预算内，这已经不是消费审批，是炫耀。"],
    ["八年老粉", "通过，散场后记得回来提交周边审批。"],
  ],
  "demo-treadmill": [
    ["阳台衣架管理员", "动感单车：所以爱会消失，对吗？"],
    ["年卡守墓人", "先把健身房打卡次数从 4 变成 14。"],
  ],
  "demo-figure": [
    ["预售观察员", "能惦记一年，已经过了冲动消费的保质期。"],
    ["柜门测量师", "连位置都量好了，这审批只是走流程。"],
  ],
  "demo-keyboard": [
    ["轴体调解员", "已有静音轴还买静音轴，真正响的是购买欲。"],
    ["桌搭预算委员会", "配色治愈一次，信用卡账单复发一个月。"],
  ],
};

function normalizeStore(store) {
  const normalized = {
    ...emptyStore(),
    ...store,
    members: store?.members || {},
    relationships: store?.relationships || {},
    requests: Array.isArray(store?.requests) ? store.requests : [],
    ledger: Array.isArray(store?.ledger) ? store.ledger : [],
    votes: store?.votes || {},
    comments: store?.comments || {},
    version: 4,
  };
  const ids = new Set(normalized.requests.map((item) => item.id));
  for (const seed of plazaSeeds) if (!ids.has(seed.id)) normalized.requests.push(structuredClone(seed));
  return normalized;
}

async function loadDotEnv() {
  try {
    const raw = await readFile(".env", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index < 1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {}
}

async function loadStore() {
  await mkdir(dataRoot, { recursive: true });
  try {
    return normalizeStore(JSON.parse(await readFile(storePath, "utf8")));
  } catch {
    const store = normalizeStore(emptyStore());
    await saveStore(store);
    return store;
  }
}

async function saveStore(store) {
  store.updatedAt = new Date().toISOString();
  await mkdir(dataRoot, { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
}

function header(req, name) {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value || "";
}

function viewer(req) {
  const trustedId = header(req, userHeader);
  if (trustedId) return { userId: trustedId, nickname: decodeURIComponent(header(req, nicknameHeader) || "ClawChat 用户") };
  if (process.env.NODE_ENV !== "production" && process.env.DEV_USER_ID) {
    return { userId: process.env.DEV_USER_ID, nickname: process.env.DEV_USER_NICKNAME || "本地预览用户" };
  }
  return null;
}

function agentAuthorized(req) {
  const expected = process.env.AGENT_API_TOKEN || "";
  const actual = header(req, "authorization").replace(/^Bearer\s+/i, "");
  if (!expected || expected.length !== actual.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

async function json(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error("payload_too_large");
  }
  return raw ? JSON.parse(raw) : {};
}

function ensureMember(store, member) {
  store.members[member.userId] = { ...store.members[member.userId], ...member, userId: member.userId };
  return store.members[member.userId];
}

function createRequest(store, input, source) {
  const now = new Date().toISOString();
  const applicant = ensureMember(store, { userId: input.applicantId, nickname: input.applicantNickname || "ClawChat 用户" });
  const approverId = input.approverId || store.relationships[input.applicantId]?.coApproverId || null;
  const approver = approverId ? store.members[approverId] : null;
  const item = {
    id: input.id || `oa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    source,
    title: String(input.title || "").trim(),
    amount: String(input.amount || "").trim(),
    reason: String(input.reason || "").trim(),
    inventory: String(input.inventory || "").trim(),
    imageUrl: String(input.imageUrl || "").trim(),
    applicantId: applicant.userId,
    applicantNickname: applicant.nickname,
    approverId,
    approverNickname: approver?.nickname || "待指定共同审批人",
    agentVerdict: "pending",
    agentReason: `等待 ${agentName} 审判`,
    agentName,
    visibility: input.publishToPlaza === true || input.publishToPlaza === "on" ? "public" : "private",
    publicAlias: "一位陌生人",
    emoji: String(input.emoji || "🛒").trim(),
    voteCounts: { approve: 0, reject: 0 },
    commentsCount: 0,
    status: "pending",
    humanReason: "",
    createdAt: now,
    updatedAt: now,
  };
  if (!item.title || !item.reason) throw new Error("title_and_reason_required");
  if (store.requests.some((request) => request.id === item.id)) throw new Error("duplicate_request_id");
  store.requests.unshift(item);
  return item;
}

function createLedgerEntry(store, input, source) {
  const now = new Date().toISOString();
  const member = ensureMember(store, { userId: input.memberId, nickname: input.memberNickname || "ClawChat 用户" });
  const amount = Number(input.amount);
  const kind = input.kind === "income" ? "income" : "expense";
  const date = String(input.date || now.slice(0, 10)).trim();
  const category = String(input.category || (kind === "income" ? "其他收入" : "其他支出")).trim();
  const note = String(input.note || "").trim();
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("positive_amount_required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("invalid_date");
  if (!category) throw new Error("category_required");
  const entry = {
    id: input.id || `txn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    source,
    memberId: member.userId,
    memberNickname: member.nickname,
    kind,
    amount: Math.round(amount * 100) / 100,
    category,
    date,
    note,
    createdAt: now,
    updatedAt: now,
  };
  if (store.ledger.some((item) => item.id === entry.id)) throw new Error("duplicate_ledger_id");
  store.ledger.unshift(entry);
  return entry;
}

function visible(store, userId) {
  return store.requests.filter((item) => !item.demo && (item.applicantId === userId || item.approverId === userId));
}

function commentAlias(userId) {
  const names = ["路过的陪审员", "预算纪律委员", "购物车观察员", "人间清醒代表", "本月账单证人"];
  const score = [...String(userId)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return names[score % names.length];
}

function plazaItems(store, viewerId = "") {
  return store.requests
    .filter((item) => item.visibility === "public" && ["approve", "reject"].includes(item.agentVerdict))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .map(({ applicantId, applicantNickname, approverId, approverNickname, ...item }) => {
      const saved = (store.comments[item.id] || []).map(({ authorId, ...comment }) => comment);
      const samples = (plazaDemoComments[item.id] || []).map(([author, text], index) => ({ id: `${item.id}-sample-${index}`, author, text, demo: true }));
      return {
        ...item,
        applicantNickname: item.publicAlias || "一位陌生人",
        viewerVote: viewerId ? store.votes[item.id]?.[viewerId] || null : null,
        commentsCount: Number(item.commentsCount || 0) + saved.length,
        topComments: [...saved].reverse().concat(samples).slice(0, 2),
      };
    });
}

async function handleApi(req, res, url) {
  if (url.pathname === "/api/health") return send(res, 200, { ok: true });
  if (req.method === "GET" && url.pathname === "/api/config") return send(res, 200, { agentName, agentUsername });
  if (req.method === "GET" && url.pathname === "/api/plaza") {
    const store = await loadStore();
    return send(res, 200, { items: plazaItems(store, viewer(req)?.userId), updatedAt: store.updatedAt });
  }

  if (url.pathname.startsWith("/api/agent/")) {
    if (!agentAuthorized(req)) return send(res, 401, { error: "invalid_agent_token" });
    const store = await loadStore();
    if (req.method === "GET" && url.pathname === "/api/agent/requests") {
      const applicantId = url.searchParams.get("applicantId");
      if (!applicantId) return send(res, 400, { error: "applicant_id_required" });
      return send(res, 200, { requests: store.requests.filter((item) => !item.demo && item.applicantId === applicantId), updatedAt: store.updatedAt });
    }
    if (req.method === "GET" && url.pathname === "/api/agent/ledger") {
      const memberId = url.searchParams.get("memberId");
      if (!memberId) return send(res, 400, { error: "member_id_required" });
      return send(res, 200, { entries: store.ledger.filter((item) => item.memberId === memberId), updatedAt: store.updatedAt });
    }
    if (req.method === "POST" && url.pathname === "/api/agent/ledger") {
      try {
        const entry = createLedgerEntry(store, await json(req), "clawchat-chat");
        await saveStore(store);
        return send(res, 201, { entry });
      } catch (error) { return send(res, 400, { error: error.message }); }
    }
    if (req.method === "POST" && url.pathname === "/api/agent/requests") {
      try {
        const item = createRequest(store, await json(req), "clawchat-chat");
        await saveStore(store);
        return send(res, 201, { request: item });
      } catch (error) { return send(res, 400, { error: error.message }); }
    }
    if (req.method === "PUT" && url.pathname === "/api/agent/relationship") {
      const body = await json(req);
      if (!body.applicantId || !body.coApproverId) return send(res, 400, { error: "ids_required" });
      ensureMember(store, { userId: body.applicantId, nickname: body.applicantNickname || "申请人" });
      ensureMember(store, { userId: body.coApproverId, nickname: body.coApproverNickname || "共同审批人" });
      store.relationships[body.applicantId] = { coApproverId: body.coApproverId };
      await saveStore(store);
      return send(res, 200, { relationship: store.relationships[body.applicantId] });
    }
    const recommend = url.pathname.match(/^\/api\/agent\/requests\/([^/]+)\/recommendation$/);
    if (req.method === "PATCH" && recommend) {
      const item = store.requests.find((entry) => entry.id === decodeURIComponent(recommend[1]));
      if (!item) return send(res, 404, { error: "request_not_found" });
      const body = await json(req);
      if (!["approve", "reject", "need-info", "conditional"].includes(body.verdict)) return send(res, 400, { error: "invalid_verdict" });
      item.agentVerdict = body.verdict;
      item.agentReason = String(body.reason || "").trim() || "Agent 已完成初审";
      item.agentName = String(body.agentName || agentName).trim();
      if (item.visibility === "public") item.status = "published";
      item.updatedAt = new Date().toISOString();
      await saveStore(store);
      return send(res, 200, { request: item });
    }
    return send(res, 404, { error: "not_found" });
  }

  const who = viewer(req);
  if (!who) return send(res, 401, { error: "open_in_clawchat" });
  const store = await loadStore();
  const member = ensureMember(store, who);

  const vote = url.pathname.match(/^\/api\/plaza\/([^/]+)\/vote$/);
  if (req.method === "POST" && vote) {
    const item = store.requests.find((entry) => entry.id === decodeURIComponent(vote[1]) && entry.visibility === "public");
    if (!item) return send(res, 404, { error: "plaza_item_not_found" });
    const body = await json(req);
    if (!["approve", "reject"].includes(body.choice)) return send(res, 400, { error: "invalid_vote" });
    const previous = store.votes[item.id]?.[member.userId];
    item.voteCounts ||= { approve: 0, reject: 0 };
    if (previous && previous !== body.choice) item.voteCounts[previous] = Math.max(0, Number(item.voteCounts[previous] || 0) - 1);
    if (previous !== body.choice) item.voteCounts[body.choice] = Number(item.voteCounts[body.choice] || 0) + 1;
    store.votes[item.id] ||= {};
    store.votes[item.id][member.userId] = body.choice;
    item.updatedAt = new Date().toISOString();
    await saveStore(store);
    return send(res, 200, { viewerVote: body.choice, voteCounts: item.voteCounts });
  }

  const comment = url.pathname.match(/^\/api\/plaza\/([^/]+)\/comments$/);
  if (req.method === "POST" && comment) {
    const item = store.requests.find((entry) => entry.id === decodeURIComponent(comment[1]) && entry.visibility === "public" && ["approve", "reject"].includes(entry.agentVerdict));
    if (!item) return send(res, 404, { error: "plaza_item_not_found" });
    const body = await json(req);
    const text = String(body.text || "").trim();
    if (text.length < 2 || text.length > 140) return send(res, 400, { error: "comment_length_invalid" });
    const entry = {
      id: `comment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      authorId: member.userId,
      author: commentAlias(member.userId),
      text,
      createdAt: new Date().toISOString(),
    };
    store.comments[item.id] ||= [];
    store.comments[item.id].push(entry);
    await saveStore(store);
    const { authorId, ...publicComment } = entry;
    return send(res, 201, { comment: publicComment, commentsCount: Number(item.commentsCount || 0) + store.comments[item.id].length });
  }

  if (req.method === "GET" && url.pathname === "/api/session") {
    await saveStore(store);
    return send(res, 200, {
      user: member,
      requests: visible(store, member.userId),
      ledger: store.ledger.filter((item) => item.memberId === member.userId),
      updatedAt: store.updatedAt,
    });
  }
  if (req.method === "POST" && url.pathname === "/api/ledger") {
    try {
      const body = await json(req);
      const entry = createLedgerEntry(store, { ...body, memberId: member.userId, memberNickname: member.nickname }, "liveware");
      await saveStore(store);
      return send(res, 201, { entry });
    } catch (error) { return send(res, 400, { error: error.message }); }
  }
  if (req.method === "POST" && url.pathname === "/api/requests") {
    try {
      const body = await json(req);
      const item = createRequest(store, { ...body, applicantId: member.userId, applicantNickname: member.nickname }, "liveware");
      await saveStore(store);
      return send(res, 201, { request: item });
    } catch (error) { return send(res, 400, { error: error.message }); }
  }
  const review = url.pathname.match(/^\/api\/requests\/([^/]+)\/review$/);
  if (req.method === "PATCH" && review) {
    const item = store.requests.find((entry) => entry.id === decodeURIComponent(review[1]));
    if (!item) return send(res, 404, { error: "request_not_found" });
    if (!item.approverId || item.approverId !== member.userId) return send(res, 403, { error: "not_designated_approver" });
    const body = await json(req);
    if (!["approved", "rejected", "conditional"].includes(body.status)) return send(res, 400, { error: "invalid_status" });
    item.status = body.status;
    item.humanReason = String(body.reason || "").trim() || "共同审批人已完成终审";
    item.updatedAt = new Date().toISOString();
    await saveStore(store);
    return send(res, 200, { request: item });
  }
  return send(res, 404, { error: "not_found" });
}

async function serveStatic(res, url) {
  const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const safe = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
  let path = join(publicRoot, safe);
  try { if (!(await stat(path)).isFile()) throw new Error(); } catch { path = join(publicRoot, "index.html"); }
  const body = await readFile(path);
  res.writeHead(200, { "content-type": mime[extname(path)] || "application/octet-stream", "cache-control": "no-store" });
  res.end(body);
}

export const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || `${host}:${port}`}`);
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return await serveStatic(res, url);
  } catch (error) { return send(res, 500, { error: "internal_error", message: error.message }); }
});

if (process.env.NODE_ENV !== "test") server.listen(port, host, () => console.log(`Liveware: http://${host}:${port}`));
