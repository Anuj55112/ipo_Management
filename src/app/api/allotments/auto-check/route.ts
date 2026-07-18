import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { futureAPIProvider } from "@/services/allotment";

export async function GET(request: Request) {
  return handleAutoCheck();
}

export async function POST(request: Request) {
  return handleAutoCheck();
}

async function handleAutoCheck() {
  try {
    // 1. Fetch pending applications
    const pendings = await prisma.application.findMany({
      where: { allotmentStatus: "PENDING" },
      include: {
        ipo: true,
        account: true
      }
    });

    if (pendings.length === 0) {
      return NextResponse.json({
        message: "No pending applications found to sync.",
        checked: 0,
        resolved: 0,
        details: []
      });
    }

    let checked = 0;
    let resolved = 0;
    const details: any[] = [];

    for (const app of pendings) {
      checked++;
      const pan = app.account.panNumber.trim().toUpperCase();
      const ipoId = app.ipoId;
      const ipoName = app.ipo.ipoName;
      const externalId = app.ipo.externalId;

      let status: "PENDING" | "ALLOTTED" | "NOT_ALLOTTED" = "PENDING";
      let sharesAllotted = 0;
      let checkSource = "SIMULATED";

      if (externalId) {
        checkSource = "API";
        try {
          const checkResult = await futureAPIProvider.checkAllotment(pan, ipoId);
          status = checkResult.status;
          sharesAllotted = checkResult.sharesAllotted;
        } catch (err: any) {
          console.error(`Auto check API query failed for PAN ${pan} under IPO ${ipoName}:`, err);
        }
      } else {
        // Fallback simulation: deterministic hash check
        let hash = 0;
        for (let i = 0; i < pan.length; i++) {
          hash += pan.charCodeAt(i);
        }
        const isAllotted = hash % 3 === 0;
        status = isAllotted ? "ALLOTTED" : "NOT_ALLOTTED";
        sharesAllotted = isAllotted ? app.ipo.lotSize : 0;
      }

      if (status !== "PENDING") {
        const finalSoldPrice = status === "ALLOTTED" ? app.ipo.issuePrice : null;
        const finalSellDate = status === "ALLOTTED" ? new Date(app.ipo.listingDate) : null;

        await prisma.$transaction(async (tx) => {
          const prevStatus = app.allotmentStatus;

          // 1. Update Application status
          await tx.application.update({
            where: { id: app.id },
            data: {
              allotmentStatus: status,
              sharesAllotted: sharesAllotted,
              soldPrice: finalSoldPrice,
              sellDate: finalSellDate
            }
          });

          // 2. Sync transactions (delete old refund/sale)
          await tx.transaction.deleteMany({
            where: {
              applicationId: app.id,
              type: { in: ["REFUND", "SALE"] }
            }
          });

          const refundDate = new Date(app.ipo.closeDate);
          refundDate.setDate(refundDate.getDate() + 4);

          if (status === "NOT_ALLOTTED") {
            await tx.transaction.create({
              data: {
                applicationId: app.id,
                type: "REFUND",
                amount: app.amountSent,
                remarks: `Capital refund (Auto Sync) for non-allotment in ${app.ipo.ipoName}`,
                createdAt: refundDate
              }
            });
          } else if (status === "ALLOTTED") {
            const investmentValue = app.ipo.issuePrice * sharesAllotted;
            const refundAmount = app.amountSent - investmentValue;

            if (refundAmount > 0) {
              await tx.transaction.create({
                data: {
                  applicationId: app.id,
                  type: "REFUND",
                  amount: refundAmount,
                  remarks: `Partial refund (Auto Sync Allotted ${sharesAllotted}) in ${app.ipo.ipoName}`,
                  createdAt: refundDate
                }
              });
            }

            if (finalSoldPrice && finalSellDate) {
              await tx.transaction.create({
                data: {
                  applicationId: app.id,
                  type: "SALE",
                  amount: sharesAllotted * finalSoldPrice,
                  remarks: `Shares sold at ₹${finalSoldPrice} (Auto Sync Realized)`,
                  createdAt: finalSellDate
                }
              });
            }
          }

          // 3. Write AllotmentAuditLog
          await tx.allotmentAuditLog.create({
            data: {
              applicationId: app.id,
              updatedBy: "System / Auto Sync Endpoint",
              previousStatus: prevStatus,
              newStatus: status,
              source: checkSource
            }
          });
        });

        resolved++;
        details.push({
          account: app.account.accountName,
          pan: `${pan.substring(0, 5)}*****`,
          ipo: ipoName,
          status,
          sharesAllotted,
          source: checkSource
        });
      }
    }

    return NextResponse.json({
      message: `Successfully processed auto-checks.`,
      checked,
      resolved,
      details
    });
  } catch (error: any) {
    console.error("Auto check error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process auto allotment checks" },
      { status: 500 }
    );
  }
}
