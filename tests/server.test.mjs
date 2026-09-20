import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("health endpoint and shared chat/liveware flow", async () => {
  const dir = await mkdtemp(join(tmpdir(), "clawchat-shopping-approval-"));
  process.env.NODE_ENV = "test";
  process.env.DATA_DIR = dir;
  process.env.AGENT_API_TOKEN = "test-token";
  const { server } = await import(`../server.mjs?test=${Date.now()}`);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const health = await fetch(`${base}/api/health`).then((response) => response.json());
    assert.equal(health.ok, true);
    const created = await fetch(`${base}/api/agent/requests`, {
      method: "POST",
      headers: { authorization: "Bearer test-token", "content-type": "application/json" },
      body: JSON.stringify({ applicantId: "user-a", applicantNickname: "阿甲", title: "人体工学椅", reason: "改善坐姿" }),
    }).then((response) => response.json());
    assert.match(created.request.id, /^oa-/);
    const session = await fetch(`${base}/api/session`, { headers: { "x-clawchat-user-id": "user-a", "x-clawchat-nickname": encodeURIComponent("阿甲") } }).then((response) => response.json());
    assert.equal(session.requests[0].id, created.request.id);
    assert.equal(session.requests[0].source, "clawchat-chat");

    const chatLedger = await fetch(`${base}/api/agent/ledger`, {
      method: "POST",
      headers: { authorization: "Bearer test-token", "content-type": "application/json" },
      body: JSON.stringify({ memberId: "user-a", memberNickname: "阿甲", amount: 38, category: "餐饮", date: "2026-09-10", note: "午饭" }),
    }).then((response) => response.json());
    assert.match(chatLedger.entry.id, /^txn-/);
    assert.equal(chatLedger.entry.source, "clawchat-chat");

    const livewareLedger = await fetch(`${base}/api/ledger`, {
      method: "POST",
      headers: { "x-clawchat-user-id": "user-a", "x-clawchat-nickname": encodeURIComponent("阿甲"), "content-type": "application/json" },
      body: JSON.stringify({ kind: "income", amount: 100, category: "红包", date: "2026-09-10", note: "测试收入" }),
    }).then((response) => response.json());
    assert.equal(livewareLedger.entry.kind, "income");
    assert.equal(livewareLedger.entry.source, "liveware");

    const ledgerSession = await fetch(`${base}/api/session`, { headers: { "x-clawchat-user-id": "user-a", "x-clawchat-nickname": encodeURIComponent("阿甲") } }).then((response) => response.json());
    assert.equal(ledgerSession.ledger.length, 2);
    const otherSession = await fetch(`${base}/api/session`, { headers: { "x-clawchat-user-id": "user-b", "x-clawchat-nickname": encodeURIComponent("阿乙") } }).then((response) => response.json());
    assert.equal(otherSession.ledger.length, 0);

    const agentLedger = await fetch(`${base}/api/agent/ledger?memberId=user-a`, {
      headers: { authorization: "Bearer test-token" },
    }).then((response) => response.json());
    assert.equal(agentLedger.entries.length, 2);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});

test("public plaza stays anonymous and supports one switchable vote per user", async () => {
  const dir = await mkdtemp(join(tmpdir(), "clawchat-plaza-"));
  process.env.NODE_ENV = "test";
  process.env.DATA_DIR = dir;
  process.env.AGENT_API_TOKEN = "plaza-token";
  const { server } = await import(`../server.mjs?plaza=${Date.now()}`);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const agentHeaders = { authorization: "Bearer plaza-token", "content-type": "application/json" };
  const userHeaders = { "x-clawchat-user-id": "secret-user", "x-clawchat-nickname": encodeURIComponent("不应公开的昵称"), "content-type": "application/json" };
  try {
    const created = await fetch(`${base}/api/agent/requests`, {
      method: "POST",
      headers: agentHeaders,
      body: JSON.stringify({ applicantId: "secret-user", applicantNickname: "不应公开的昵称", title: "第六副耳机", reason: "颜色很好看", inventory: "已有五副", publishToPlaza: true }),
    }).then((response) => response.json());
    await fetch(`${base}/api/agent/requests/${created.request.id}/recommendation`, {
      method: "PATCH",
      headers: agentHeaders,
      body: JSON.stringify({ verdict: "reject", reason: "驳回。你是在给前五副耳机招舍友。", agentName: "Hermes" }),
    });

    const plaza = await fetch(`${base}/api/plaza`).then((response) => response.json());
    const published = plaza.items.find((item) => item.id === created.request.id);
    assert.equal(published.publicAlias, "一位陌生人");
    assert.equal(published.agentName, "Hermes");
    assert.equal("applicantId" in published, false);
    assert.equal("approverId" in published, false);
    assert.equal(JSON.stringify(published).includes("不应公开的昵称"), false);

    const firstVote = await fetch(`${base}/api/plaza/${created.request.id}/vote`, {
      method: "POST", headers: userHeaders, body: JSON.stringify({ choice: "approve" }),
    }).then((response) => response.json());
    assert.equal(firstVote.voteCounts.approve, 1);
    const switchedVote = await fetch(`${base}/api/plaza/${created.request.id}/vote`, {
      method: "POST", headers: userHeaders, body: JSON.stringify({ choice: "reject" }),
    }).then((response) => response.json());
    assert.equal(switchedVote.voteCounts.approve, 0);
    assert.equal(switchedVote.voteCounts.reject, 1);

    const privateCreated = await fetch(`${base}/api/agent/requests`, {
      method: "POST",
      headers: agentHeaders,
      body: JSON.stringify({ applicantId: "secret-user", title: "私密申请", reason: "不想公开", publishToPlaza: false }),
    }).then((response) => response.json());
    await fetch(`${base}/api/agent/requests/${privateCreated.request.id}/recommendation`, {
      method: "PATCH", headers: agentHeaders, body: JSON.stringify({ verdict: "approve", reason: "通过。" }),
    });
    const refreshed = await fetch(`${base}/api/plaza`).then((response) => response.json());
    assert.equal(refreshed.items.some((item) => item.id === privateCreated.request.id), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
