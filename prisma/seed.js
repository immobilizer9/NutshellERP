const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {

  const org = await prisma.organization.create({
    data: { name: "Nutshell ERP" },
  });

  const adminRole = await prisma.role.create({
    data: { name: "ADMIN" },
  });

  const hashedPassword = await bcrypt.hash("admin123", 10);

  const user = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@nutshell.com",
      password: hashedPassword,
      organizationId: org.id,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: adminRole.id,
    },
  });

  console.log("Seed complete with ADMIN role.");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });