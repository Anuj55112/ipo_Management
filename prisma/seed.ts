import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set in environment");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Clearing all database tables...");

  // Clean existing data in dependency order
  await prisma.transaction.deleteMany();
  await prisma.application.deleteMany();
  await prisma.ipo.deleteMany();
  await prisma.account.deleteMany();
  await prisma.setting.deleteMany();

  console.log("All tables cleared successfully.");

  // Create default setting
  await prisma.setting.create({
    data: {
      id: "default",
      defaultCommission: 300,
      currency: "INR",
      profitCalculationRules: "STANDARD"
    }
  });
  console.log("Default settings created successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
