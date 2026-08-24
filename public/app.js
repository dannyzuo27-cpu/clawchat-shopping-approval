const $ = (selector) => document.querySelector(selector);
const state = { user: null, requests: [], selectedId: null };
const verdicts = { pending: "等待初审", approve: "建议批准", reject: "建议不批", "need-info": "需要补充", conditional: "建议附条件" };
const statuses = { pending: "等待终审", approved: "已批准", rejected: "未批准", conditional: "附条件批准" };

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 2600);
}

async function api(path, options = {}) {
  const response = await fetch(path, { cache: "no-store", ...options, headers: { "content-type": "application/json", ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

function render() {
  $("#identity").textContent = state.user ? `${state.user.nickname} · 已连接` : "未连接 ClawChat";
  $("#empty").hidden = state.requests.length > 0;
  $("#list").innerHTML = state.requests.map((item) => {
    const canReview = item.approverId && item.approverId === state.user?.userId && item.status === "pending";
    return `<article class="request">
      <div class="request-head"><span class="source">${item.source === "liveware" ? "LIVEWARE" : "CLAWCHAT"}</span><span class="status ${escapeHtml(item.status)}">${statuses[item.status] || item.status}</span></div>
      <h2>${escapeHtml(item.title)} ${item.amount ? `<small>¥${escapeHtml(item.amount)}</small>` : ""}</h2>
      <p class="people">${escapeHtml(item.applicantNickname)} 提出 · ${escapeHtml(item.approverNickname)} 共同审批</p>
      <p>${escapeHtml(item.reason)}</p>
      ${item.inventory ? `<p class="muted">家中现有：${escapeHtml(item.inventory)}</p>` : ""}
      <div class="decision"><span>Agent 初审</span><strong>${verdicts[item.agentVerdict] || item.agentVerdict}</strong><p>${escapeHtml(item.agentReason)}</p></div>
      ${item.status !== "pending" ? `<div class="human"><span>人类终审</span><strong>${statuses[item.status]}</strong><p>${escapeHtml(item.humanReason)}</p></div>` : ""}
      ${canReview ? `<button class="review" data-review="${escapeHtml(item.id)}">由我终审</button>` : ""}
    </article>`;
  }).join("");
  document.querySelectorAll("[data-review]").forEach((button) => button.addEventListener("click", () => openReview(button.dataset.review)));
}

async function load() {
  try {
    const body = await api("/api/session");
    state.user = body.user;
    state.requests = body.requests;
    render();
  } catch (error) {
    state.user = null;
    render();
    if (error.message === "open_in_clawchat") toast("请从 ClawChat Liveware 入口打开");
    else toast(`读取失败：${error.message}`);
  }
}

function openReview(id) {
  const item = state.requests.find((request) => request.id === id);
  if (!item) return;
  state.selectedId = id;
  $("#reviewTitle").textContent = `${item.applicantNickname} 想买：${item.title}`;
  $("#reviewDialog").showModal();
}

$("#toggleForm").addEventListener("click", () => { $("#requestForm").hidden = !$("#requestForm").hidden; });
$("#refresh").addEventListener("click", load);
$("#requestForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await api("/api/requests", { method: "POST", body: JSON.stringify(data) });
    event.currentTarget.reset();
    event.currentTarget.hidden = true;
    toast("已提交，等待 Agent 初审");
    await load();
  } catch (error) { toast(`提交失败：${error.message}`); }
});
document.querySelectorAll("[data-status]").forEach((button) => button.addEventListener("click", async () => {
  const reason = new FormData($("#reviewForm")).get("reason")?.trim();
  if (!reason) return toast("请填写具体理由");
  try {
    await api(`/api/requests/${encodeURIComponent(state.selectedId)}/review`, { method: "PATCH", body: JSON.stringify({ status: button.dataset.status, reason }) });
    $("#reviewDialog").close();
    $("#reviewForm").reset();
    toast("终审结果已同步");
    await load();
  } catch (error) { toast(`审批失败：${error.message}`); }
}));

load();
setInterval(load, 15000);

