import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [accounts, ipos, applications, transactions] = await prisma.$transaction([
      prisma.account.findMany(),
      prisma.ipo.findMany(),
      prisma.application.findMany(),
      prisma.transaction.findMany()
    ]);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      version: "1.0",
      data: {
        accounts,
        ipos,
        applications,
        transactions
      }
    });
  } catch (error: any) {
    console.error("GET backup error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate database backup" }, { status: 500 });
  }
}
