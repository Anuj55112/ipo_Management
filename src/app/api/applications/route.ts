import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ipoId = searchParams.get("ipoId") || "";
    const accountId = searchParams.get("accountId") || "";
    const allotmentStatus = searchParams.get("allotmentStatus") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const where: any = {};
    if (ipoId) {
      where.ipoId = ipoId;
    }
    if (accountId) {
      where.accountId = accountId;
    }
    if (allotmentStatus) {
      where.allotmentStatus = allotmentStatus;
    }
    if (startDate || endDate) {
      where.applicationDate = {};
      if (startDate) {
        where.applicationDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.applicationDate.lte = new Date(endDate);
      }
    }

    const applications = await prisma.application.findMany({
      where,
      include: {
        account: true,
        ipo: true
      },
      orderBy: { applicationDate: "desc" }
    });

    return NextResponse.json(applications);
  } catch (error: any) {
    console.error("GET applications error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch applications" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountId, ipoId, amountSent, commissionPaid, applicationDate } = body;

    if (!accountId || !ipoId || amountSent === undefined || commissionPaid === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Parse values
    const parsedAmount = parseFloat(amountSent);
    const parsedCommission = parseFloat(commissionPaid);
    const parsedDate = applicationDate ? new Date(applicationDate) : new Date();

    // Use Prisma transaction to create application and transactions together
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Application
      const application = await tx.application.create({
        data: {
          accountId,
          ipoId,
          amountSent: parsedAmount,
          commissionPaid: parsedCommission,
          applicationDate: parsedDate,
          allotmentStatus: "PENDING",
          sharesAllotted: 0
        },
        include: {
          account: true,
          ipo: true
        }
      });

      // 2. Create DEPLOYMENT transaction
      await tx.transaction.create({
        data: {
          applicationId: application.id,
          type: "DEPLOYMENT",
          amount: parsedAmount,
          remarks: `Capital deployed for ${application.ipo.ipoName}`,
          createdAt: parsedDate
        }
      });

      // 3. Create COMMISSION transaction
      await tx.transaction.create({
        data: {
          applicationId: application.id,
          type: "COMMISSION",
          amount: parsedCommission,
          remarks: `Commission recorded for ${application.account.accountName}`,
          createdAt: parsedDate
        }
      });

      return application;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("POST applications error:", error);
    return NextResponse.json({ error: error.message || "Failed to create application" }, { status: 500 });
  }
}
