import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (search) {
      where.ipoName = { contains: search, mode: "insensitive" };
    }
    if (status) {
      where.status = status;
    }

    const ipos = await prisma.ipo.findMany({
      where,
      include: {
        applications: {
          select: {
            amountSent: true
          }
        }
      },
      orderBy: { openDate: "desc" }
    });

    const iposData = ipos.map((ipo) => {
      const totalCapitalDeployed = ipo.applications.reduce((sum, app) => sum + app.amountSent, 0);
      return {
        id: ipo.id,
        ipoName: ipo.ipoName,
        openDate: ipo.openDate,
        closeDate: ipo.closeDate,
        listingDate: ipo.listingDate,
        issuePrice: ipo.issuePrice,
        lotSize: ipo.lotSize,
        status: ipo.status,
        externalId: ipo.externalId,
        totalApplications: ipo.applications.length,
        totalCapitalDeployed
      };
    });

    return NextResponse.json(iposData);
  } catch (error: any) {
    console.error("GET ipos error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch IPOs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ipoName, openDate, closeDate, listingDate, issuePrice, lotSize, status, externalId } = body;

    // Validation
    if (!ipoName || !openDate || !closeDate || !listingDate || !issuePrice || !lotSize) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ipo = await prisma.ipo.create({
      data: {
        ipoName,
        openDate: new Date(openDate),
        closeDate: new Date(closeDate),
        listingDate: new Date(listingDate),
        issuePrice: parseFloat(issuePrice),
        lotSize: parseInt(lotSize, 10),
        status: status || "UPCOMING",
        externalId: externalId ? String(externalId).trim() : null
      }
    });

    return NextResponse.json(ipo, { status: 201 });
  } catch (error: any) {
    console.error("POST ipos error:", error);
    return NextResponse.json({ error: error.message || "Failed to create IPO" }, { status: 500 });
  }
}
