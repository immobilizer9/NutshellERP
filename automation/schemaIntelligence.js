const fs = require("fs");

const schema = fs.readFileSync("./prisma/schema.prisma", "utf-8");

const models = [...schema.matchAll(/model\s+(\w+)/g)].map(m => m[1]);

console.log("\n🧠 SCHEMA INTELLIGENCE REPORT\n");
console.log("--------------------------------");

models.forEach(model => {
  console.log("Model detected:", model);
});

if (!models.includes("Visit")) {
  console.log("⚠️ Visit tracking not implemented.");
}

if (!models.includes("School")) {
  console.log("⚠️ School pipeline missing.");
}

console.log("\nSchema scan complete.\n");