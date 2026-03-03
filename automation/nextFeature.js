const fs = require("fs");
const { execSync } = require("child_process");

const roadmapPath = "./docs/ROADMAP.md";
const content = fs.readFileSync(roadmapPath, "utf-8");
const lines = content.split("\n");

const next = lines.find(l => l.trim().startsWith("[ ]"));

if (!next) {
  console.log("🎉 Roadmap complete.");
  process.exit(0);
}

const feature = next.replace("[ ]", "").trim();

console.log("\n🚀 NEXT FEATURE:", feature, "\n");

try {
  execSync("npm run health", { stdio: "inherit" });
} catch {
  console.log("❌ System unhealthy. Fix first.");
  process.exit(1);
}

console.log("\n🧠 Ready to evolve:", feature);