require("tsconfig-paths/register");
const { prisma } = require("./src/lib/db.ts");

async function main() {
  const adminRole = await prisma.userRole.findUnique({ where: { name: "Admin" } });
  if (adminRole) {
    const perms = new Set(adminRole.permissions || []);
    perms.add("lab_view");
    perms.add("lab_create");
    perms.add("lab_engineer");
    
    await prisma.userRole.update({
      where: { name: "Admin" },
      data: { permissions: Array.from(perms) }
    });
    console.log("Admin role updated with lab permissions.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
