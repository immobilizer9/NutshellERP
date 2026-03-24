const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Clean existing data in safe order (children before parents) ─
  // Quiz session children
  await prisma.quizTopPerformer.deleteMany();
  await prisma.quizClassResult.deleteMany();
  await prisma.quizParticipatingSchool.deleteMany();
  await prisma.quizSessionTrainer.deleteMany();
  await prisma.quizSession.deleteMany();
  // Training session children
  await prisma.trainingSessionTrainer.deleteMany();
  await prisma.trainingSession.deleteMany();
  await prisma.trainingMaterial.deleteMany();
  // School/user dependents
  await prisma.schoolActivity.deleteMany();
  await prisma.schoolEvent.deleteMany();
  await prisma.competitorNote.deleteMany();
  // Content
  await prisma.contentDocument.deleteMany();
  await prisma.contentTopic.deleteMany();
  await prisma.question.deleteMany();
  await prisma.questionBank.deleteMany();
  // Misc user dependents
  await prisma.notification.deleteMany();
  await prisma.target.deleteMany();
  // Orders
  await prisma.orderPOC.deleteMany();
  await prisma.return.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  // Core
  await prisma.visit.deleteMany();
  await prisma.dailyReport.deleteMany();
  await prisma.task.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.school.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.organization.deleteMany();

  // ─── Organization ────────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: { name: "Nutshell Books" },
  });
  console.log("✅ Organization created:", org.name);

  // ─── Roles ───────────────────────────────────────────────────────
  const adminRole   = await prisma.role.create({ data: { name: "ADMIN" } });
  const bdRole      = await prisma.role.create({ data: { name: "BD_HEAD" } });
  const salesRole   = await prisma.role.create({ data: { name: "SALES" } });
  const contentRole = await prisma.role.create({ data: { name: "CONTENT_TEAM" } });
  const trainerRole = await prisma.role.create({ data: { name: "TRAINER" } });
  const designRole  = await prisma.role.create({ data: { name: "DESIGN_TEAM" } });
  console.log("✅ Roles created: ADMIN, BD_HEAD, SALES, CONTENT_TEAM, TRAINER, DESIGN_TEAM");

  // ─── Permissions (Modules) ───────────────────────────────────────
  const MODULE_NAMES = [
    "ORDERS", "PIPELINE", "SCHOOLS", "ANALYTICS",
    "TEAM_MANAGEMENT", "USER_MANAGEMENT", "AUDIT_LOG",
    "TARGETS", "DAILY_REPORTS", "TASKS",
    "CONTENT_CREATE", "CONTENT_ASSIGN", "CONTENT_REVIEW",
    "QUIZ_SESSIONS", "TRAINING_SESSIONS", "EXPORTS",
    "DESIGN_WORK", "EVENTS", "RECEIVABLES", "SETTINGS",
  ];

  const permissions = {};
  for (const name of MODULE_NAMES) {
    permissions[name] = await prisma.permission.create({ data: { name } });
  }
  console.log("✅ Permissions (modules) created:", MODULE_NAMES.join(", "));

  // ─── Role → Module assignments ───────────────────────────────────
  const ROLE_MODULES = {
    ADMIN:        ["USER_MANAGEMENT", "AUDIT_LOG", "EXPORTS", "SETTINGS", "CONTENT_ASSIGN", "CONTENT_REVIEW",
                   "ANALYTICS", "ORDERS", "PIPELINE", "SCHOOLS", "TARGETS", "TEAM_MANAGEMENT",
                   "QUIZ_SESSIONS", "TRAINING_SESSIONS", "EVENTS", "RECEIVABLES"],
    BD_HEAD:      ["TEAM_MANAGEMENT", "ORDERS", "PIPELINE", "SCHOOLS", "ANALYTICS",
                   "TASKS", "DAILY_REPORTS", "TARGETS", "EVENTS", "RECEIVABLES"],
    SALES:        ["ORDERS", "PIPELINE", "ANALYTICS", "TASKS", "DAILY_REPORTS", "EVENTS"],
    CONTENT_TEAM: ["CONTENT_CREATE", "CONTENT_ASSIGN", "QUIZ_SESSIONS", "TRAINING_SESSIONS"],
    TRAINER:      ["QUIZ_SESSIONS", "TRAINING_SESSIONS", "CONTENT_CREATE"],
    DESIGN_TEAM:  ["DESIGN_WORK"],
  };

  const roleMap = {
    ADMIN: adminRole, BD_HEAD: bdRole, SALES: salesRole,
    CONTENT_TEAM: contentRole, TRAINER: trainerRole, DESIGN_TEAM: designRole,
  };

  for (const [roleName, modules] of Object.entries(ROLE_MODULES)) {
    const role = roleMap[roleName];
    for (const mod of modules) {
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: permissions[mod].id },
      });
    }
  }
  console.log("✅ RolePermission assignments seeded");

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

  // ─── Content Team user ───────────────────────────────────────────
  const contentPw = await bcrypt.hash("content123", 10);
  const contentUser = await prisma.user.create({
    data: {
      name: "Content Writer",
      email: "content1@nutshell.com",
      password: contentPw,
      organizationId: org.id,
    },
  });
  await prisma.userRole.create({ data: { userId: contentUser.id, roleId: contentRole.id } });
  console.log("✅ Content Team created: content1@nutshell.com / content123");

  // ─── Trainer user ────────────────────────────────────────────────
  const trainerPw = await bcrypt.hash("trainer123", 10);
  const trainerUser = await prisma.user.create({
    data: {
      name: "Trainer",
      email: "trainer1@nutshell.com",
      password: trainerPw,
      organizationId: org.id,
    },
  });
  await prisma.userRole.create({ data: { userId: trainerUser.id, roleId: trainerRole.id } });
  console.log("✅ Trainer created: trainer1@nutshell.com / trainer123 (TRAINER role)");

  // ─── Design Team user ────────────────────────────────────────────
  const designPw = await bcrypt.hash("design123", 10);
  const designUser = await prisma.user.create({
    data: {
      name: "Design Artist",
      email: "design1@nutshell.com",
      password: designPw,
      organizationId: org.id,
    },
  });
  await prisma.userRole.create({ data: { userId: designUser.id, roleId: designRole.id } });
  console.log("✅ Design Team created: design1@nutshell.com / design123");

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
  console.log("  admin@nutshell.com    →  admin123");
  console.log("  bd@nutshell.com       →  bd123456");
  console.log("  sales1@nutshell.com   →  sales123");
  console.log("  sales2@nutshell.com   →  sales123");
  console.log("  content1@nutshell.com →  content123");
  console.log("  trainer1@nutshell.com →  trainer123");
  console.log("  design1@nutshell.com  →  design123");
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