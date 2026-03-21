const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Clean existing data in safe order ───────────────────────────
  await prisma.return.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.dailyReport.deleteMany();
  await prisma.task.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.school.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.organization.deleteMany();

  // ─── Organization ────────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: { name: "Nutshell Books" },
  });
  console.log("✅ Organization created:", org.name);

  // ─── Roles ───────────────────────────────────────────────────────
  const adminRole = await prisma.role.create({ data: { name: "ADMIN" } });
  const bdRole    = await prisma.role.create({ data: { name: "BD_HEAD" } });
  const salesRole = await prisma.role.create({ data: { name: "SALES" } });
  console.log("✅ Roles created: ADMIN, BD_HEAD, SALES");

  // ─── Admin user ──────────────────────────────────────────────────
  const adminPw = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@nutshell.com",
      password: adminPw,
      organizationId: org.id,
    },
  });
  await prisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });
  console.log("✅ Admin created: admin@nutshell.com / admin123");

  // ─── BD Head user ────────────────────────────────────────────────
  const bdPw = await bcrypt.hash("bd123456", 10);
  const bd = await prisma.user.create({
    data: {
      name: "BD Head",
      email: "bd@nutshell.com",
      password: bdPw,
      organizationId: org.id,
    },
  });
  await prisma.userRole.create({ data: { userId: bd.id, roleId: bdRole.id } });
  console.log("✅ BD Head created: bd@nutshell.com / bd123456");

  // ─── Sales users (report to BD Head) ────────────────────────────
  const salesCredentials = [
    { name: "Sales Rep 1", email: "sales1@nutshell.com", password: "sales123" },
    { name: "Sales Rep 2", email: "sales2@nutshell.com", password: "sales123" },
  ];

  const salesUsers = [];
  for (const cred of salesCredentials) {
    const pw = await bcrypt.hash(cred.password, 10);
    const user = await prisma.user.create({
      data: {
        name: cred.name,
        email: cred.email,
        password: pw,
        organizationId: org.id,
        managerId: bd.id,   // reports to BD Head
      },
    });
    await prisma.userRole.create({ data: { userId: user.id, roleId: salesRole.id } });
    salesUsers.push(user);
  }
  console.log("✅ Sales users created: sales1@nutshell.com, sales2@nutshell.com / sales123");

  // ─── Schools ─────────────────────────────────────────────────────
  const stages = [
    "LEAD",
    "CONTACTED",
    "VISITED",
    "PROPOSAL_SENT",
    "NEGOTIATION",
    "CLOSED_WON",
    "CLOSED_LOST",
  ];

  const cities = ["Kolkata", "Delhi", "Mumbai", "Bangalore", "Siliguri"];

  const schools = [];
  for (let i = 1; i <= 25; i++) {
    const school = await prisma.school.create({
      data: {
        name: `School ${i}`,
        address: `${i} School Road`,
        city: cities[i % cities.length],
        state: "West Bengal",
        latitude: 22.5 + Math.random(),
        longitude: 88.3 + Math.random(),
        contactPerson: `Principal ${i}`,
        contactPhone: `9000000${String(i).padStart(2, "0")}`,
        pipelineStage: stages[i % stages.length],
        // Assign schools to sales users in round-robin
        assignedToId: salesUsers[i % salesUsers.length].id,
      },
    });
    schools.push(school);
  }
  console.log("✅ 25 schools created");

  // ─── Sample visits ───────────────────────────────────────────────
  for (let i = 0; i < 5; i++) {
    await prisma.visit.create({
      data: {
        schoolId: schools[i].id,
        salesUserId: salesUsers[i % salesUsers.length].id,
        notes: `Visit notes for school ${i + 1}`,
      },
    });
  }
  console.log("✅ 5 sample visits created");

  // ─── Sample tasks ────────────────────────────────────────────────
  await prisma.task.create({
    data: {
      title: "Follow up with School 1",
      description: "Call principal and confirm order",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      assignedToId: salesUsers[0].id,
      assignedById: bd.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "Submit proposal to School 2",
      description: "Send pricing proposal",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      assignedToId: salesUsers[1].id,
      assignedById: bd.id,
    },
  });
  console.log("✅ 2 sample tasks created");

  // ─── Sample daily report ─────────────────────────────────────────
  await prisma.dailyReport.create({
    data: {
      summary: "Visited 3 schools today. School 1 is interested in Class 5 books.",
      location: "Siliguri",
      latitude: 26.7271,
      longitude: 88.3953,
      salesUserId: salesUsers[0].id,
    },
  });
  console.log("✅ 1 sample daily report created");

  console.log("\n🎉 Seed complete!");
  console.log("─────────────────────────────────────");
  console.log("  admin@nutshell.com   →  admin123");
  console.log("  bd@nutshell.com      →  bd123456");
  console.log("  sales1@nutshell.com  →  sales123");
  console.log("  sales2@nutshell.com  →  sales123");
  console.log("─────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });