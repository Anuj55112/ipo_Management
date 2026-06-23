import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accounts } = body;

    if (!accounts || !Array.isArray(accounts)) {
      return NextResponse.json({ error: "Invalid accounts array" }, { status: 400 });
    }

    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    // Process accounts sequentially or in a transaction to handle PAN duplicates gracefully
    for (const acc of accounts) {
      const { accountName, panNumber, bankName, accountNumber, upiId, phoneNumber, status, notes } = acc;

      if (!accountName || !panNumber || !bankName || !accountNumber || !upiId || !phoneNumber) {
        errors.push(`Row for ${accountName || "Unknown"} skipped: missing required fields`);
        skipCount++;
        continue;
      }

      const formattedPan = panNumber.toUpperCase().trim();

      // Simple validation for PAN format: 5 letters, 4 numbers, 1 letter
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(formattedPan)) {
        errors.push(`Row for ${accountName} skipped: invalid PAN format "${formattedPan}"`);
        skipCount++;
        continue;
      }

      try {
        // Check duplicate PAN
        const existing = await prisma.account.findUnique({
          where: { panNumber: formattedPan }
        });

        if (existing) {
          errors.push(`Row for ${accountName} skipped: Account with PAN ${formattedPan} already exists`);
          skipCount++;
          continue;
        }

        await prisma.account.create({
          data: {
            accountName: accountName.trim(),
            panNumber: formattedPan,
            bankName: bankName.trim(),
            accountNumber: accountNumber.trim(),
            upiId: upiId.trim(),
            phoneNumber: phoneNumber.trim(),
            status: status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
            notes: notes ? notes.trim() : null
          }
        });
        successCount++;
      } catch (err: any) {
        errors.push(`Failed to insert ${accountName}: ${err.message}`);
        skipCount++;
      }
    }

    return NextResponse.json({
      success: true,
      successCount,
      skipCount,
      errors
    });
  } catch (error: any) {
    console.error("Bulk accounts import error:", error);
    return NextResponse.json({ error: error.message || "Failed to process bulk import" }, { status: 500 });
  }
}
