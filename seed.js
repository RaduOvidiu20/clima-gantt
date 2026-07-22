const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { createHash } = require('crypto');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Missing DATABASE_URL");

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function hashPassword(password) {
  return createHash("sha256").update(password, "utf8").digest("base64");
}

async function main() {
  const roles = [
    { name: 'Admin', permissions: ["calendar_view", "calendar_book", "gantt_view", "gantt_edit", "admin"] },
    { name: 'User', permissions: ["calendar_view", "calendar_book", "gantt_view"] }
  ];
  for (const role of roles) {
    await prisma.userRole.upsert({
      where: { name: role.name },
      update: {},
      create: { name: role.name, permissions: role.permissions }
    });
  }

  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!admin) {
    await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash: hashPassword('admin'),
        role: 'Admin',
        firstName: 'System',
        lastName: 'Admin'
      }
    });
    console.log("Created admin user (admin / admin)");
  } else {
    console.log("Admin user already exists");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(err => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
