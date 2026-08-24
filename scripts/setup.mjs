import { randomBytes } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";

try {
  await access(".env");
  console.log(".env 已存在，未覆盖。直接运行 npm start 即可。");
} catch {
  const token = randomBytes(32).toString("hex");
  const env = [
    "PORT=4174",
    "HOST=127.0.0.1",
    "DATA_DIR=./data",
    `AGENT_API_TOKEN=${token}`,
    "CLAWCHAT_USER_HEADER=x-clawchat-user-id",
    "CLAWCHAT_NICKNAME_HEADER=x-clawchat-nickname",
    "DEV_USER_ID=",
    "DEV_USER_NICKNAME=",
    "",
  ].join("\n");
  await writeFile(".env", env, { mode: 0o600 });
  await mkdir("data", { recursive: true });
  console.log("已生成 .env 和随机 Agent 访问令牌。请勿提交 .env。运行 npm start 启动。");
}

