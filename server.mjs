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

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function emptyStore() {
  return { version: 1, members: {}, relationships: {}, requests: [], updatedAt: new Date().toISOString() };
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
    return JSON.parse(await readFile(storePath, "utf8"));
  } catch {
    const store = emptyStore();
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
    agentReason: "等待 Agent 初审",
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

function visible(store, userId) {
  return store.requests.filter((item) => item.applicantId === userId || item.approverId === userId);
}

async function handleApi(req, res, url) {
  if (url.pathname === "/api/health") return send(res, 200, { ok: true });

  if (url.pathname.startsWith("/api/agent/")) {
    if (!agentAuthorized(req)) return send(res, 401, { error: "invalid_agent_token" });
    const store = await loadStore();
    if (req.method === "GET" && url.pathname === "/api/agent/requests") return send(res, 200, { requests: store.requests, updatedAt: store.updatedAt });
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

  if (req.method === "GET" && url.pathname === "/api/session") {
    await saveStore(store);
    return send(res, 200, { user: member, requests: visible(store, member.userId), updatedAt: store.updatedAt });
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
  res.writeHead(200, { "content-type": mime[extname(path)] || "application/octet-stream", "cache-control": path.endsWith("index.html") ? "no-store" : "public, max-age=3600" });
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

