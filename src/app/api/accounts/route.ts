import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    // Filters
    const where: any = {};
    if (search) {
      where.OR = [
        { accountName: { contains: search, mode: "insensitive" } },
        { panNumber: { contains: search, mode: "insensitive" } }
      ];
    }
    if (status) {
      where.status = status;
    }

    const [accounts, totalCount] = await prisma.$transaction([
      prisma.account.findMany({
        where,
        include: {
          applications: {
            include: {
              ipo: {
                select: {
                  issuePrice: true
                }
              }
            }
          }
        },
        orderBy: { accountName: "asc" },
        skip,
        take: limit
      }),
      prisma.account.count({ where })
    ]);

    // Calculate aggregated fields for each account
    const accountsData = accounts.map((account) => {
      let totalProfit = 0;
      account.applications.forEach((app) => {
        if (app.allotmentStatus === "ALLOTTED") {
          const soldPrice = app.soldPrice || 0;
          const issuePrice = app.ipo?.issuePrice || 0;
          const grossProfit = (soldPrice - issuePrice) * app.sharesAllotted;
          totalProfit += grossProfit - app.commissionPaid;
        } else if (app.allotmentStatus === "NOT_ALLOTTED") {
          totalProfit -= app.commissionPaid;
        }
      });

      return {
        id: account.id,
        accountName: account.accountName,
        panNumber: account.panNumber,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        upiId: account.upiId,
        phoneNumber: account.phoneNumber,
        status: account.status,
        notes: account.notes,
        totalApplications: account.applications.length,
        totalProfit
      };
    });

    return NextResponse.json({
      accounts: accountsData,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error: any) {
    console.error("GET accounts error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountName, panNumber, bankName, accountNumber, upiId, phoneNumber, status, notes } = body;

    // Validation
    if (!accountName || !panNumber || !bankName || !accountNumber || !upiId || !phoneNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check PAN uniqueness
    const existing = await prisma.account.findUnique({
      where: { panNumber: panNumber.toUpperCase() }
    });
    if (existing) {
      return NextResponse.json({ error: "An account with this PAN already exists" }, { status: 400 });
    }

    const account = await prisma.account.create({
      data: {
        accountName,
        panNumber: panNumber.toUpperCase(),
        bankName,
        accountNumber,
        upiId,
        phoneNumber,
        status: status || "ACTIVE",
        notes
      }
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error: any) {
    console.error("POST accounts error:", error);
    return NextResponse.json({ error: error.message || "Failed to create account" }, { status: 500 });
  }
}
