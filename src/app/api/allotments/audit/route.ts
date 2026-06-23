import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const logs = await prisma.allotmentAuditLog.findMany({
      include: {
        application: {
          include: {
            account: {
              select: {
                accountName: true,
                panNumber: true
              }
            },
            ipo: {
              select: {
                ipoName: true
              }
            }
          }
        }
      },
      orderBy: { timestamp: "desc" },
      take: 200 // Limit to latest 200 logs
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error("GET audit logs error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch audit logs" }, { status: 500 });
  }
}
