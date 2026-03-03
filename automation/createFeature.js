const fs = require("fs");
const path = require("path");

const feature = process.argv[2];

if (!feature) {
  console.log("Usage: npm run create-feature <feature-name>");
  process.exit(1);
}

const basePath = `./app/(protected)/${feature}`;
const apiPath = `./app/api/${feature}`;

if (fs.existsSync(basePath)) {
  console.log("Feature already exists.");
  process.exit(0);
}

fs.mkdirSync(basePath, { recursive: true });
fs.mkdirSync(apiPath, { recursive: true });

fs.writeFileSync(
  path.join(basePath, "page.tsx"),
  `"use client";

export default function ${capitalize(feature)}Page() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">
        ${capitalize(feature)} Module
      </h1>
    </div>
  );
}
`
);

fs.writeFileSync(
  path.join(apiPath, "route.ts"),
  `import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "${feature} API working" });
}
`
);

console.log(`🚀 Feature '${feature}' scaffolded successfully.`);

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}