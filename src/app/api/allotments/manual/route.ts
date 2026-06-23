import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      applicationId,
      status,
      sharesAllotted,
      soldPrice,
      sellDate,
      commissionPaid,
      updatedBy = "Admin / Manual"
    } = body;

    if (!applicationId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normStatus = status.toUpperCase().trim();
    if (normStatus !== "PENDING" && normStatus !== "ALLOTTED" && normStatus !== "NOT_ALLOTTED") {
      return NextResponse.json({ error: "Invalid allotment status" }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { ipo: true, account: true }
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const prevStatus = application.allotmentStatus;
      const finalShares = normStatus === "ALLOTTED" ? parseInt(sharesAllotted || application.ipo.lotSize, 10) : 0;
      const finalSoldPrice = normStatus === "ALLOTTED" ? parseFloat(soldPrice || application.ipo.issuePrice) : null;
      const finalSellDate = normStatus === "ALLOTTED" ? (sellDate ? new Date(sellDate) : new Date(application.ipo.listingDate)) : null;

      // 1. Update Application status
      const updatedApp = await tx.application.update({
        where: { id: applicationId },
        data: {
          allotmentStatus: normStatus,
          sharesAllotted: finalShares,
          soldPrice: finalSoldPrice,
          sellDate: finalSellDate,
          commissionPaid: commissionPaid !== undefined ? parseFloat(commissionPaid) : undefined
        }
      });

      // 2. Sync transactions
      await tx.transaction.deleteMany({
        where: {
          applicationId,
          type: { in: ["REFUND", "SALE"] }
        }
      });

      if (commissionPaid !== undefined) {
        await tx.transaction.updateMany({
          where: {
            applicationId,
            type: "COMMISSION"
          },
          data: {
            amount: parseFloat(commissionPaid)
          }
        });
      }

      const refundDate = new Date(application.ipo.closeDate);
      refundDate.setDate(refundDate.getDate() + 4);

      if (normStatus === "NOT_ALLOTTED") {
        await tx.transaction.create({
          data: {
            applicationId,
            type: "REFUND",
            amount: application.amountSent,
            remarks: `Capital refund (Manual Resolve) for non-allotment in ${application.ipo.ipoName}`,
            createdAt: refundDate
          }
        });
      } else if (normStatus === "ALLOTTED" && finalSoldPrice && finalSellDate) {
        const investmentValue = application.ipo.issuePrice * finalShares;
        const refundAmount = application.amountSent - investmentValue;

        if (refundAmount > 0) {
          await tx.transaction.create({
            data: {
              applicationId,
              type: "REFUND",
              amount: refundAmount,
              remarks: `Partial refund (Manual Resolve Allotted ${finalShares}) in ${application.ipo.ipoName}`,
              createdAt: refundDate
            }
          });
        }

        await tx.transaction.create({
          data: {
            applicationId,
            type: "SALE",
            amount: finalShares * finalSoldPrice,
            remarks: `Shares sold at ₹${finalSoldPrice} (Manual Resolve Realized)`,
            createdAt: finalSellDate
          }
        });
      }

      // 3. Write AllotmentAuditLog
      await tx.allotmentAuditLog.create({
        data: {
          applicationId,
          updatedBy,
          previousStatus: prevStatus,
          newStatus: normStatus,
          source: "MANUAL"
        }
      });

      // 4. Write AllotmentCheck log
      await tx.allotmentCheck.create({
        data: {
          panNumber: application.account.panNumber,
          ipoId: application.ipoId,
          status: normStatus,
          sharesAllotted: finalShares,
          source: "MANUAL"
        }
      });

      return updatedApp;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST manual allotments error:", error);
    return NextResponse.json({ error: error.message || "Failed to manually resolve allotment" }, { status: 500 });
  }
}
