import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { accountName, panNumber, bankName, accountNumber, upiId, phoneNumber, status, notes } = body;

    // Check if account exists
    const existing = await prisma.account.findUnique({
      where: { id }
    });
    if (!existing) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Check if PAN changed and is unique
    if (panNumber && panNumber.toUpperCase() !== existing.panNumber) {
      const panConflict = await prisma.account.findUnique({
        where: { panNumber: panNumber.toUpperCase() }
      });
      if (panConflict) {
        return NextResponse.json({ error: "An account with this PAN already exists" }, { status: 400 });
      }
    }

    const updated = await prisma.account.update({
      where: { id },
      data: {
        accountName: accountName || undefined,
        panNumber: panNumber ? panNumber.toUpperCase() : undefined,
        bankName: bankName || undefined,
        accountNumber: accountNumber || undefined,
        upiId: upiId || undefined,
        phoneNumber: phoneNumber || undefined,
        status: status || undefined,
        notes: notes !== undefined ? notes : undefined
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT account error:", error);
    return NextResponse.json({ error: error.message || "Failed to update account" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.account.findUnique({
      where: { id }
    });
    if (!existing) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Delete account (cascade deletes applications and transactions)
    await prisma.account.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (error: any) {
    console.error("DELETE account error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete account" }, { status: 500 });
  }
}
