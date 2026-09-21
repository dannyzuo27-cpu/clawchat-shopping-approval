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
  return { version: 3, members: {}, relationships: {}, requests: [], ledger: [], votes: {}, updatedAt: new Date().toISOString() };
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
  }
];

function normalizeStore(store) {
  const normalized = {
    ...emptyStore(),
    ...store,
    members: store?.members || {},
    relationships: store?.relationships || {},
    requests: Array.isArray(store?.requests) ? store.requests : [],
    ledger: Array.isArray(store?.ledger) ? store.ledger : [],
    votes: store?.votes || {},
    version: 3,
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

function plazaItems(store, viewerId = "") {
  return store.requests
    .filter((item) => item.visibility === "public" && ["approve", "reject"].includes(item.agentVerdict))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .map(({ applicantId, applicantNickname, approverId, approverNickname, ...item }) => ({
      ...item,
      applicantNickname: item.publicAlias || "一位陌生人",
      viewerVote: viewerId ? store.votes[item.id]?.[viewerId] || null : null,
    }));
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
