import { spawn } from "node:child_process";

console.log("🚀 Iniciando Next.js e aguardando porta...\n");

// Start Next.js
const nextProcess = spawn("yarn", ["dev"], {
  shell: true,
  stdio: ["inherit", "pipe", "inherit"],
});

let port = null;

// Monitor the output to find the door
nextProcess.stdout.on("data", (data) => {
  process.stdout.write(data);

  const output = data.toString();
  const portMatch = output.match(/http:\/\/localhost:(\d+)/);

  if (portMatch && !port) {
    port = portMatch[1];
    console.log(`\n📡 Detectada porta ${port}, iniciando ngrok...\n`);

    // Start ngrok with the port blocked
    const ngrokProcess = spawn("npx", ["ngrok", "http", port], {
      shell: true,
      stdio: "inherit",
    });

    ngrokProcess.on("error", (err) => {
      console.error("❌ Erro ao iniciar ngrok:", err);
    });
  }
});

// Clean when leaving
process.on("SIGINT", () => {
  console.log("\n👋 Encerrando...");
  nextProcess.kill();
  process.exit();
});
