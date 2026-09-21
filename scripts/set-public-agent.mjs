import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const username = process.argv[2] || "";
if (!/^agent_[A-Za-z0-9_]+$/.test(username)) throw new Error("Invalid ClawChat agent username");
const path = resolve(import.meta.dirname, "..", ".env");
const raw = await readFile(path, "utf8");
const lines = raw.split(/\r?\n/).filter((line) => !line.startsWith("CLAWCHAT_AGENT_USERNAME="));
lines.push(`CLAWCHAT_AGENT_USERNAME=${username}`);
await writeFile(path, `${lines.filter(Boolean).join("\n")}\n`, { mode: 0o600 });
console.log("Public agent username configured; credentials were not displayed.");
