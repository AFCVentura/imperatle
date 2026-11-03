// `node e2e/wait-for.mjs <url> -- <command...>`: waits until <url> answers,
// then runs the command. The supporter API copy waits for the first one, so
// they don't both migrate and import the content into the same empty
// database at once.
import { spawn } from "node:child_process";

const [url, separator, command, ...args] = process.argv.slice(2);
if (!url || separator !== "--" || !command) throw new Error("usage: wait-for.mjs <url> -- <command...>");

for (let i = 0; ; i++) {
  try {
    if ((await fetch(url)).ok) break;
  } catch {
    // not up yet
  }
  if (i > 240) throw new Error(`${url} did not come up`);
  await new Promise((r) => setTimeout(r, 500));
}

const child = spawn(command, args, { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
