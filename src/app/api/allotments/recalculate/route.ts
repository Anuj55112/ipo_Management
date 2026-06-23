import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const applications = await prisma.application.findMany({
      include: {
        ipo: true,
        account: true
      }
    });

    let syncCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const app of applications) {
        // 1. Wipe all transactions for this application
        await tx.transaction.deleteMany({
          where: { applicationId: app.id }
        });

        // 2. Re-create core DEPLOYMENT transaction
        await tx.transaction.create({
          data: {
            applicationId: app.id,
            type: "DEPLOYMENT",
            amount: app.amountSent,
            remarks: `Capital deployed for ${app.ipo.ipoName} (System Sync)`,
            createdAt: app.applicationDate
          }
        });

        // 3. Re-create core COMMISSION transaction
        await tx.transaction.create({
          data: {
            applicationId: app.id,
            type: "COMMISSION",
            amount: app.commissionPaid,
            remarks: `Commission recorded for ${app.account.accountName} (System Sync)`,
            createdAt: app.applicationDate
          }
        });

        // 4. Re-create secondary status transactions (REFUND & SALE)
        const refundDate = new Date(app.ipo.closeDate);
        refundDate.setDate(refundDate.getDate() + 4);

        if (app.allotmentStatus === "NOT_ALLOTTED") {
          await tx.transaction.create({
            data: {
              applicationId: app.id,
              type: "REFUND",
              amount: app.amountSent,
              remarks: `Full capital refund for non-allotment in ${app.ipo.ipoName} (System Sync)`,
              createdAt: refundDate
            }
          });
        } else if (app.allotmentStatus === "ALLOTTED") {
          const finalShares = app.sharesAllotted || app.ipo.lotSize;
          const investmentValue = app.ipo.issuePrice * finalShares;
          const refundAmount = app.amountSent - investmentValue;

          // Partial refund if amount sent is larger than allotted cost
          if (refundAmount > 0) {
            await tx.transaction.create({
              data: {
                applicationId: app.id,
                type: "REFUND",
                amount: refundAmount,
                remarks: `Partial refund (Allotted ${finalShares}) in ${app.ipo.ipoName} (System Sync)`,
                createdAt: refundDate
              }
            });
          }

          // Sale proceeds
          const finalSoldPrice = app.soldPrice || app.ipo.issuePrice;
          const finalSellDate = app.sellDate || new Date(app.ipo.listingDate);
          
          await tx.transaction.create({
            data: {
              applicationId: app.id,
              type: "SALE",
              amount: finalShares * finalSoldPrice,
              remarks: `Shares sold at ₹${finalSoldPrice} (System Sync)`,
              createdAt: finalSellDate
            }
          });
        }

        syncCount++;
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized and rebuilt transactions for all ${syncCount} applications.`
    });
  } catch (error: any) {
    console.error("POST recalculate error:", error);
    return NextResponse.json({ error: error.message || "Failed to recalculate statistics" }, { status: 500 });
  }
}
