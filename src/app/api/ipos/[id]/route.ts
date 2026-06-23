import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { ipoName, openDate, closeDate, listingDate, issuePrice, lotSize, status, externalId } = body;

    const existing = await prisma.ipo.findUnique({
      where: { id }
    });
    if (!existing) {
      return NextResponse.json({ error: "IPO not found" }, { status: 404 });
    }

    const updated = await prisma.ipo.update({
      where: { id },
      data: {
        ipoName: ipoName || undefined,
        openDate: openDate ? new Date(openDate) : undefined,
        closeDate: closeDate ? new Date(closeDate) : undefined,
        listingDate: listingDate ? new Date(listingDate) : undefined,
        issuePrice: issuePrice !== undefined ? parseFloat(issuePrice) : undefined,
        lotSize: lotSize !== undefined ? parseInt(lotSize, 10) : undefined,
        status: status || undefined,
        externalId: externalId !== undefined ? (externalId ? String(externalId).trim() : null) : undefined
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT ipo error:", error);
    return NextResponse.json({ error: error.message || "Failed to update IPO" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.ipo.findUnique({
      where: { id }
    });
    if (!existing) {
      return NextResponse.json({ error: "IPO not found" }, { status: 404 });
    }

    // Delete IPO (cascade deletes applications and transactions)
    await prisma.ipo.delete({
      where: { id }
    });

    return NextResponse.json({ message: "IPO deleted successfully" });
  } catch (error: any) {
    console.error("DELETE ipo error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete IPO" }, { status: 500 });
  }
}
