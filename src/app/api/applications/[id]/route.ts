import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // We can receive allotment updates, or general edits
    const {
      amountSent,
      commissionPaid,
      applicationDate,
      allotmentStatus,
      sharesAllotted,
      soldPrice,
      sellDate,
      notes
    } = body;

    const existingApp = await prisma.application.findUnique({
      where: { id },
      include: { ipo: true }
    });

    if (!existingApp) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Compile update values
      const parsedAmount = amountSent !== undefined ? parseFloat(amountSent) : existingApp.amountSent;
      const parsedCommission = commissionPaid !== undefined ? parseFloat(commissionPaid) : existingApp.commissionPaid;
      const parsedDate = applicationDate ? new Date(applicationDate) : existingApp.applicationDate;
      const newStatus = allotmentStatus || existingApp.allotmentStatus;
      
      const newShares = sharesAllotted !== undefined ? parseInt(sharesAllotted, 10) : existingApp.sharesAllotted;
      const newSoldPrice = soldPrice !== undefined ? (soldPrice ? parseFloat(soldPrice) : null) : existingApp.soldPrice;
      const newSellDate = sellDate ? new Date(sellDate) : (soldPrice !== undefined && !soldPrice ? null : existingApp.sellDate);

      // 2. Update Application record
      const updatedApp = await tx.application.update({
        where: { id },
        data: {
          amountSent: parsedAmount,
          commissionPaid: parsedCommission,
          applicationDate: parsedDate,
          allotmentStatus: newStatus,
          sharesAllotted: newShares,
          soldPrice: newSoldPrice,
          sellDate: newSellDate,
          notes: notes !== undefined ? notes : existingApp.notes
        },
        include: {
          account: true,
          ipo: true
        }
      });

      // 3. Keep standard DEPLOYMENT & COMMISSION transactions synced
      await tx.transaction.updateMany({
        where: { applicationId: id, type: "DEPLOYMENT" },
        data: { amount: parsedAmount, createdAt: parsedDate }
      });

      await tx.transaction.updateMany({
        where: { applicationId: id, type: "COMMISSION" },
        data: { amount: parsedCommission, createdAt: parsedDate }
      });

      // 4. Update secondary status transactions (REFUND & SALE)
      // First, wipe out any old ones for these statuses to re-create clean state
      await tx.transaction.deleteMany({
        where: {
          applicationId: id,
          type: { in: ["REFUND", "SALE"] }
        }
      });

      // Build refund transaction dates
      const refundDate = new Date(updatedApp.ipo.closeDate);
      refundDate.setDate(refundDate.getDate() + 4);

      if (newStatus === "NOT_ALLOTTED") {
        // Full refund transaction
        await tx.transaction.create({
          data: {
            applicationId: id,
            type: "REFUND",
            amount: parsedAmount,
            remarks: `Full capital refund for non-allotment in ${updatedApp.ipo.ipoName}`,
            createdAt: refundDate
          }
        });
      } else if (newStatus === "ALLOTTED") {
        // Calculate the actual investment cost
        const investmentValue = updatedApp.ipo.issuePrice * newShares;
        const refundAmount = parsedAmount - investmentValue;

        // If amount sent was greater than lot value allotted, record a partial refund
        if (refundAmount > 0) {
          await tx.transaction.create({
            data: {
              applicationId: id,
              type: "REFUND",
              amount: refundAmount,
              remarks: `Partial refund (Allotted ${newShares} shares) in ${updatedApp.ipo.ipoName}`,
              createdAt: refundDate
            }
          });
        }

        // If shares are sold and price is given, create a SALE transaction
        if (newSoldPrice && newSellDate) {
          const saleValue = newShares * newSoldPrice;
          await tx.transaction.create({
            data: {
              applicationId: id,
              type: "SALE",
              amount: saleValue,
              remarks: `Shares sold at ₹${newSoldPrice} (Gain/Loss realized)`,
              createdAt: newSellDate
            }
          });
        }
      }

      return updatedApp;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("PUT application error:", error);
    return NextResponse.json({ error: error.message || "Failed to update application" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.application.findUnique({
      where: { id }
    });
    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Delete application (cascade deletes transactions due to onDelete: Cascade)
    await prisma.application.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Application deleted successfully" });
  } catch (error: any) {
    console.error("DELETE application error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete application" }, { status: 500 });
  }
}
