const { execSync } = require("child_process");

console.log("\n🔎 Running System Health Check...\n");

try {
  execSync("npm run check", { stdio: "inherit" });
  execSync("npm run build", { stdio: "inherit" });
  console.log("\n✅ System Stable.");
} catch {
  console.log("\n❌ System unstable. Fix errors before continuing.");
  process.exit(1);
}