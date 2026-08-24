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
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
