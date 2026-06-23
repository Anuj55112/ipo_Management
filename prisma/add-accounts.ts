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

const ACCOUNTS_TO_ADD = [
  // UNDER ANUJ
  { name: "Anuj meena", pan: "JWNPM6869K", upi: "8708062091-2@ybl", notes: "Under Anuj" },
  { name: "shryeas ghorpade", pan: "EQPPG7889L", upi: "shreyasghorpade2006@oksbi", notes: "Under Anuj" },
  { name: "jatin", pan: "HOAPM4104L", upi: "mamtameena7777.mm1@ybl", notes: "Under Anuj" },
  { name: "mamta", pan: "BAQPM4244P", upi: "8209614584-2@ybl", notes: "Under Anuj" },
  { name: "sushant", pan: "NLJPK6594N", upi: "sushant@okaxis", notes: "Under Anuj" },
  { name: "soham", pan: "IFXPP2100A", upi: "soham@okaxis", notes: "Under Anuj" },
  { name: "shubham", pan: "IOWPP4300G", upi: "shubham@okaxis", notes: "Under Anuj" },
  { name: "kalash", pan: "KLSHP9999K", upi: "kalash@okaxis", notes: "Under Anuj" },
  { name: "aditi", pan: "CVYPV2566B", upi: "vermaadi8219@oksbi", notes: "Under Anuj" },
  { name: "aarya", pan: "IRTPP8696D", upi: "aarya@okaxis", notes: "Under Anuj" },
  { name: "hansika", pan: "CZZPV1755P", upi: "hansika@okaxis", notes: "Under Anuj" },
  // UNDER ABHISEK
  { name: "vaishnavi", pan: "STHPS0334D", upi: "vaishnavishahapurkar0077@okaxis", notes: "Under Abhisek" },
  { name: "sunita gill", pan: "CGRPG6228H", upi: "sunitagill1987@ybl", notes: "Under Abhisek" },
  { name: "mukesh gill", pan: "AJNPG5114H", upi: "mukeshgill1984@ybl", notes: "Under Abhisek" },
  { name: "abhishek gill", pan: "PNWPK2588F", upi: "abhishekab450@icici", notes: "Under Abhisek" }
];

async function main() {
  console.log("Adding accounts from Anuj/Abhisek sheet...");

  let addedCount = 0;
  let errorCount = 0;

  for (const account of ACCOUNTS_TO_ADD) {
    try {
      const formattedPan = account.pan.toUpperCase().trim();
      
      // Check duplicate PAN
      const existing = await prisma.account.findUnique({
        where: { panNumber: formattedPan }
      });

      if (existing) {
        console.log(`Skipping duplicate PAN: ${formattedPan} (${account.name})`);
        continue;
      }

      await prisma.account.create({
        data: {
          accountName: account.name.trim().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
          panNumber: formattedPan,
          bankName: "Not Specified",
          accountNumber: "0000000000",
          upiId: account.upi.trim(),
          phoneNumber: "0000000000",
          status: "ACTIVE",
          notes: account.notes
        }
      });
      addedCount++;
    } catch (err: any) {
      console.error(`Failed to add ${account.name}:`, err.message);
      errorCount++;
    }
  }

  console.log(`Finished adding accounts. Added: ${addedCount}, Failed/Skipped: ${errorCount}`);
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
