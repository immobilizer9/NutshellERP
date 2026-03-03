const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function normalize(str) {
  return str.toLowerCase().replace(/\s+/g, "-");
}

console.log("\n🧬 ENGINEERING CONTROLLER INITIATED\n");

// 1️⃣ Safety checkpoint
try {
  run("git add .");
  run('git commit -m "Auto checkpoint before evolution"');
} catch {}

const roadmapPath = "./docs/ROADMAP.md";
const sidebarPath = "./config/sidebar.json";

if (!fs.existsSync(roadmapPath)) {
  console.log("❌ ROADMAP.md missing.");
  process.exit(1);
}

const roadmap = fs.readFileSync(roadmapPath, "utf-8");
const lines = roadmap.split("\n");

const unchecked = lines.filter(l => l.trim().startsWith("[ ]"));
const checked = lines.filter(l => l.trim().startsWith("[x]"));

if (unchecked.length === 0) {
  console.log("🎉 All roadmap items completed.");
  process.exit(0);
}

const nextFeatureName = unchecked[0].replace("[ ]", "").trim();
const slug = normalize(nextFeatureName);

console.log("🚀 Next Feature:", nextFeatureName);

// 2️⃣ FILE SYSTEM SYNC CHECK
const pagePath = `./app/(protected)/${slug}`;
const apiPath = `./app/api/${slug}`;

const pageExists = fs.existsSync(pagePath);
const apiExists = fs.existsSync(apiPath);

if (pageExists && apiExists) {
  console.log("⚠️ Feature already exists in filesystem.");
} else {
  console.log("📁 Scaffolding new feature...");
  fs.mkdirSync(pagePath, { recursive: true });
  fs.mkdirSync(apiPath, { recursive: true });

  fs.writeFileSync(
    path.join(pagePath, "page.tsx"),
    `"use client";

export default function ${slug.replace(/-/g, "")}Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">${nextFeatureName}</h1>
    </div>
  );
}
`
  );

  fs.writeFileSync(
    path.join(apiPath, "route.ts"),
    `import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "${nextFeatureName} API working" });
}
`
  );
}

// 3️⃣ SIDEBAR SYNC
let sidebar = { modules: [] };

if (fs.existsSync(sidebarPath)) {
  sidebar = JSON.parse(fs.readFileSync(sidebarPath, "utf-8"));
}

if (!sidebar.modules.includes(slug)) {
  sidebar.modules.push(slug);
  fs.writeFileSync(sidebarPath, JSON.stringify(sidebar, null, 2));
  console.log("📌 Sidebar updated.");
}

// 4️⃣ SCHEMA INTELLIGENCE
if (fs.existsSync("./prisma/schema.prisma")) {
  const schema = fs.readFileSync("./prisma/schema.prisma", "utf-8");
  const modelExists = schema.includes(`model ${nextFeatureName}`);

  if (!modelExists) {
    console.log("🧠 No matching Prisma model detected for this feature.");
  } else {
    console.log("🧠 Prisma model exists.");
  }
}

// 5️⃣ HEALTH CHECK
try {
  run("npm run health");
  console.log("\n✅ System Stable.");
} catch {
  console.log("\n❌ System unstable. Fix errors before proceeding.");
  process.exit(1);
}

console.log("\n⚡ Evolution complete for:", nextFeatureName);
console.log("Mark it [x] in ROADMAP.md once implemented.\n");