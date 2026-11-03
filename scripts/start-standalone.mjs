import { cpSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const standaloneRoot = resolve(projectRoot, ".next/standalone");

if (!existsSync(resolve(standaloneRoot, "server.js"))) {
  console.error("Missing .next/standalone/server.js. Run npm run build first.");
  process.exit(1);
}

for (const [source, destination] of [
  [resolve(projectRoot, "public"), resolve(standaloneRoot, "public")],
  [resolve(projectRoot, ".next/static"), resolve(standaloneRoot, ".next/static")],
]) {
  if (existsSync(source)) cpSync(source, destination, { recursive: true, force: true });
}

const args = process.argv.slice(2);
const env = { ...process.env };
const hostnameIndex = args.indexOf("--hostname");
const portIndex = args.indexOf("--port");
if (hostnameIndex >= 0 && args[hostnameIndex + 1]) env.HOSTNAME = args[hostnameIndex + 1];
if (portIndex >= 0 && args[portIndex + 1]) env.PORT = args[portIndex + 1];

const server = spawn(process.execPath, [resolve(standaloneRoot, "server.js")], {
  env,
  stdio: "inherit",
});

server.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
