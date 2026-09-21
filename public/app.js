const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  user: null,
  items: [],
  filter: "all",
  agentName: "Hermes",
  agentUsername: "",
};

const verdictLabels = { approve: "通过", reject: "驳回" };
const productEmoji = { 耳机: "🎧", 相机: "📷", 椅: "🪑", 手表: "⌚", 打印机: "🖨️", 手办: "🎲", 鞋: "👟", 包: "👜" };
const productArt = { 耳机: "/assets/headphones.svg", 相机: "/assets/camera.svg", 椅: "/assets/chair.svg" };

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `请求失败（${response.status}）`);
  return payload;
}

let toastTimer;
function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { element.hidden = true; }, 2800);
}

function relativeTime(date) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时前`;
  return `${Math.floor(minutes / 1440)} 天前`;
}

function visual(item) {
  if (item.imageUrl) return `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" referrerpolicy="no-referrer" />`;
  const artwork = Object.entries(productArt).find(([word]) => item.title.includes(word));
  if (artwork) return `<img src="${artwork[1]}" alt="${escapeHtml(item.title)}插画" loading="lazy" />`;
  const match = Object.entries(productEmoji).find(([word]) => item.title.includes(word));
  return `<span aria-hidden="true">${escapeHtml(match?.[1] || item.emoji || "🛒")}</span>`;
}

function render() {
  const items = state.items.filter((item) => state.filter === "all" || item.agentVerdict === state.filter);
  $("#feedEmpty").hidden = items.length > 0;
  $("#feed").innerHTML = items.map((item, index) => {
    const verdict = item.agentVerdict === "approve" ? "approve" : "reject";
    const votes = item.voteCounts || { approve: 0, reject: 0 };
    const selected = item.viewerVote || "";
    return `
      <article class="case-card ${verdict}">
        <header class="case-meta">
          <div class="anonymous"><span class="anon-avatar">匿</span><div><strong>${escapeHtml(item.publicAlias || "一位陌生人")}</strong><small>${relativeTime(item.updatedAt)}${item.demo ? " · 演示案例" : ""}</small></div></div>
          <span class="case-no">#${String(index + 1).padStart(3, "0")}</span>
        </header>
        <div class="case-main">
          <div class="case-copy">
            <span class="case-kind">购物申请 <span>·</span> 等待你的表态</span>
            <h3>${escapeHtml(item.title)}</h3>
            <p class="case-price">${item.amount ? `¥ ${escapeHtml(item.amount)}` : "未填写价格"}</p>
            <div class="case-reason"><span>想买的理由</span><p>${escapeHtml(item.reason)}</p></div>
          </div>
          <div class="product-visual">${visual(item)}</div>
        </div>
        ${item.inventory ? `<p class="inventory"><span>已有替代</span>${escapeHtml(item.inventory)}</p>` : ""}
        <div class="verdict-box"><div class="verdict-label"><span class="judge-icon">H</span><strong>${escapeHtml(item.agentName || state.agentName)} 的判词</strong><span class="verdict-pill">${verdictLabels[verdict]}</span></div><p>${escapeHtml(item.agentReason)}</p></div>
        <div class="vote-row"><span class="vote-prompt">你怎么判？</span><div class="vote-actions"><button class="vote ${selected === "approve" ? "selected" : ""}" data-vote="approve" data-id="${escapeHtml(item.id)}"><span class="vote-icon">✓</span> 通过${item.demo ? "" : ` <b>${Number(votes.approve || 0).toLocaleString()}</b>`}</button><button class="vote ${selected === "reject" ? "selected" : ""}" data-vote="reject" data-id="${escapeHtml(item.id)}"><span class="vote-icon">×</span> 驳回${item.demo ? "" : ` <b>${Number(votes.reject || 0).toLocaleString()}</b>`}</button></div></div>
      </article>`;
  }).join("");
}

async function load() {
  try {
    const [plaza, config] = await Promise.all([api("/api/plaza"), api("/api/config")]);
    state.items = plaza.items || [];
    state.agentName = config.agentName || "Hermes";
    state.agentUsername = config.agentUsername || "";
    $$(".agent-card h2, .agent-dialog h2").forEach((element) => { element.textContent = state.agentName; });
    render();
  } catch (error) {
    toast(error.message);
  }
  try {
    const session = await api("/api/session");
    state.user = session.user;
    $("#identity").textContent = session.user?.nickname || "ClawChat 用户";
  } catch {
    $("#identity").textContent = "在 ClawChat 内打开";
  }
}

async function vote(id, choice) {
  try {
    const result = await api(`/api/plaza/${encodeURIComponent(id)}/vote`, { method: "POST", body: JSON.stringify({ choice }) });
    const item = state.items.find((entry) => entry.id === id);
    if (item) {
      item.voteCounts = result.voteCounts;
      item.viewerVote = result.viewerVote;
      render();
    }
  } catch (error) {
    toast(error.message === "open_in_clawchat" ? "请在 ClawChat 里打开后参与投票" : error.message);
  }
}

function openAgent() { $("#agentDialog").showModal(); }
async function addAgent() {
  if (state.agentUsername) {
    try {
      await navigator.clipboard.writeText(state.agentUsername);
      toast(`已复制账号 ${state.agentUsername}，去 ClawChat 搜索添加`);
    } catch {
      toast(`在 ClawChat 搜索账号：${state.agentUsername}`);
    }
    return;
  }
  toast("请在 ClawChat 搜索审判官账号，或从与 Agent 的聊天页打开此 Liveware");
}

$("#feed").addEventListener("click", (event) => {
  const button = event.target.closest("[data-vote]");
  if (button) vote(button.dataset.id, button.dataset.vote);
});

$$('[data-filter]').forEach((button) => button.addEventListener("click", () => {
  state.filter = button.dataset.filter;
  $$('[data-filter]').forEach((item) => item.classList.toggle("active", item === button));
  render();
}));

$("#openSubmit").addEventListener("click", () => $("#submitDialog").showModal());
$("#openSubmitHero").addEventListener("click", () => $("#submitDialog").showModal());
$("#openAgentTop").addEventListener("click", openAgent);
$("#openAgentHero").addEventListener("click", openAgent);
$("#addAgent").addEventListener("click", addAgent);
$("#addAgentDialog").addEventListener("click", addAgent);
$$('[data-close]').forEach((button) => button.addEventListener("click", () => $(`#${button.dataset.close}`).close()));
$$('dialog').forEach((dialog) => dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
}));

$("#requestForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  data.publishToPlaza = data.publishToPlaza === "on";
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  submit.textContent = "正在投递…";
  try {
    await api("/api/requests", { method: "POST", body: JSON.stringify(data) });
    form.reset();
    form.elements.publishToPlaza.checked = false;
    $("#submitDialog").close();
    toast(`申请已保存。私聊 ${state.agentName} 说“处理待审申请”即可出判词`);
  } catch (error) {
    toast(error.message === "open_in_clawchat" ? "请在 ClawChat 里打开这个 Liveware 再投递" : error.message);
  } finally {
    submit.disabled = false;
    submit.textContent = `交给 ${state.agentName} 审判`;
  }
});

load();
setInterval(load, 20000);
