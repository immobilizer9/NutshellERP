const { execSync } = require("child_process");

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

try {
  console.log("\n🔒 Creating safety checkpoint...\n");

  run("git add .");
  run('git commit -m "Auto checkpoint before evolution"');

  console.log("\n✅ Safe checkpoint created.\n");
} catch {
  console.log("\n⚠️ Git not initialized or nothing to commit.\n");
}