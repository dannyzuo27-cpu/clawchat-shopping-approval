import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const envText = await readFile(resolve(projectRoot, ".env"), "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index), line.slice(index + 1)];
}));
const base = process.env.SHOPPING_APPROVAL_API || `http://127.0.0.1:${env.PORT || 4174}`;
const token = process.env.SHOPPING_APPROVAL_TOKEN || env.AGENT_API_TOKEN;

if (!token) throw new Error("Agent API token is missing");

async function request(path, method = "GET", body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`API ${response.status}: ${result.error || "unknown_error"}`);
  return result;
}

const [command, ...args] = process.argv.slice(2);
let result;
if (command === "pending") {
  const [applicantId] = args;
  if (!applicantId || args.length !== 1) throw new Error("Usage: pending <current-clawchat-user-id>");
  const data = await request(`/api/agent/requests?applicantId=${encodeURIComponent(applicantId)}`);
  result = { requests: data.requests.filter((item) => item.agentVerdict === "pending") };
} else if (command === "recommend") {
  const [id, verdict, ...reasonParts] = args;
  if (!id || !["approve", "reject", "need-info", "conditional"].includes(verdict) || !reasonParts.length) {
    throw new Error("Usage: recommend <request-id> <approve|reject|need-info|conditional> <reason>");
  }
  result = await request(`/api/agent/requests/${encodeURIComponent(id)}/recommendation`, "PATCH", {
    verdict, reason: reasonParts.join(" "), agentName: "Hermes",
  });
} else if (command === "create" || command === "ledger" || command === "relationship") {
  if (args.length !== 1) throw new Error(`Usage: ${command} '<JSON object>'`);
  const body = JSON.parse(args[0]);
  const route = command === "create" ? "/api/agent/requests" : command === "ledger" ? "/api/agent/ledger" : "/api/agent/relationship";
  result = await request(route, command === "relationship" ? "PUT" : "POST", body);
} else {
  throw new Error("Usage: agent-bridge.mjs <pending|recommend|create|ledger|relationship> ...");
}
console.log(JSON.stringify(result, null, 2));
