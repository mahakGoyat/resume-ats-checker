import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import app from "./app";
import { logger } from "./lib/logger";

let dir = path.dirname(fileURLToPath(import.meta.url));
for (let i = 0; i < 5; i += 1) {
  const candidate = path.join(dir, ".env");
  if (fs.existsSync(candidate)) {
    loadEnv({ path: candidate });
    break;
  }
  const parent = path.dirname(dir);
  if (parent === dir) break;
  dir = parent;
}
loadEnv();

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
