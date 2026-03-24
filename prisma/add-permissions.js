/**
 * Safe permission patch — adds missing permissions to roles without wiping data.
 * Run with: node prisma/add-permissions.js
 *
 * Use this instead of re-seeding when the live DB is already populated.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ADDITIONS = [
  // New permissions added since initial seed
  { role: "ADMIN",   permissions: ["TASKS", "DAILY_REPORTS"] },
];

async function run() {
  for (const { role: roleName, permissions } of ADDITIONS) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) { console.warn(`Role ${roleName} not found — skipping`); continue; }

    for (const permName of permissions) {
      // Upsert permission
      const perm = await prisma.permission.upsert({
        where:  { name: permName },
        update: {},
        create: { name: permName },
      });

      // Upsert role-permission link
      await prisma.rolePermission.upsert({
        where:  { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });

      console.log(`✅  ${roleName} → ${permName}`);
    }
  }
  console.log("Done.");
}

run()
  .catch((e) => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
