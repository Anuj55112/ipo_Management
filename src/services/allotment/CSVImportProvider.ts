import { prisma } from "@/lib/prisma";
import { AllotmentProvider, AllotmentResponse } from "./types";

export class CSVImportProvider implements AllotmentProvider {
  async checkAllotment(panNumber: string, ipoId: string): Promise<AllotmentResponse> {
    const check = await prisma.allotmentCheck.findFirst({
      where: {
        panNumber: panNumber.toUpperCase(),
        ipoId,
        source: "CSV"
      },
      orderBy: { checkedAt: "desc" }
    });

    if (!check) {
      return {
        status: "PENDING",
        sharesAllotted: 0,
        source: "CSV",
        checkedAt: new Date()
      };
    }

    return {
      status: check.status as any,
      sharesAllotted: check.sharesAllotted,
      source: "CSV",
      checkedAt: check.checkedAt
    };
  }

  async checkBulkAllotment(panNumbers: string[], ipoId: string): Promise<Record<string, AllotmentResponse>> {
    const results: Record<string, AllotmentResponse> = {};
    for (const pan of panNumbers) {
      results[pan.toUpperCase()] = await this.checkAllotment(pan, ipoId);
    }
    return results;
  }

  async getAllotmentStatus(applicationId: string): Promise<AllotmentResponse> {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { account: true }
    });
    if (!app) throw new Error("Application not found");
    return this.checkAllotment(app.account.panNumber, app.ipoId);
  }

  // Custom bulk CSV processor
  async importCsvData(
    ipoId: string,
    rows: Array<{ pan: string; status: string; sharesAllotted: number }>,
    updatedBy: string = "Admin / CSV"
  ) {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    const ipo = await prisma.ipo.findUnique({
      where: { id: ipoId }
    });
    if (!ipo) {
      throw new Error(`IPO ${ipoId} not found`);
    }

    for (const row of rows) {
      const { pan, status, sharesAllotted } = row;
      const formattedPan = pan.toUpperCase().trim();
      const normStatus = status.toUpperCase().trim();

      let targetStatus: "PENDING" | "ALLOTTED" | "NOT_ALLOTTED" = "PENDING";
      if (normStatus.includes("ALLOT") && !normStatus.includes("NOT")) {
        targetStatus = "ALLOTTED";
      } else if (normStatus.includes("NOT") || normStatus.includes("REFUND") || normStatus.includes("FAIL")) {
        targetStatus = "NOT_ALLOTTED";
      } else {
        targetStatus = "PENDING";
      }

      try {
        // Find Account by PAN
        const account = await prisma.account.findUnique({
          where: { panNumber: formattedPan }
        });

        if (!account) {
          errors.push(`PAN ${formattedPan}: Account not found in IPO Ledger`);
          failedCount++;
          continue;
        }

        // Find Application by Account & IPO
        const application = await prisma.application.findFirst({
          where: { accountId: account.id, ipoId }
        });

        if (!application) {
          errors.push(`PAN ${formattedPan} (${account.accountName}): Application not found for this IPO`);
          failedCount++;
          continue;
        }

        // Run updates inside a transaction to keep calculations synced
        await prisma.$transaction(async (tx) => {
          const prevStatus = application.allotmentStatus;
          const finalShares = targetStatus === "ALLOTTED" ? (sharesAllotted || ipo.lotSize) : 0;
          
          // Set sold price defaults if allotted
          let newSoldPrice = targetStatus === "ALLOTTED" ? ipo.issuePrice : null;
          let newSellDate = targetStatus === "ALLOTTED" ? new Date(ipo.listingDate) : null;

          // Update application record
          await tx.application.update({
            where: { id: application.id },
            data: {
              allotmentStatus: targetStatus,
              sharesAllotted: finalShares,
              soldPrice: newSoldPrice,
              sellDate: newSellDate
            }
          });

          // Sync transactions (delete old refund & sale, then recreate)
          await tx.transaction.deleteMany({
            where: {
              applicationId: application.id,
              type: { in: ["REFUND", "SALE"] }
            }
          });

          const refundDate = new Date(ipo.closeDate);
          refundDate.setDate(refundDate.getDate() + 4);

          if (targetStatus === "NOT_ALLOTTED") {
            await tx.transaction.create({
              data: {
                applicationId: application.id,
                type: "REFUND",
                amount: application.amountSent,
                remarks: `Capital refund (CSV Import) for non-allotment in ${ipo.ipoName}`,
                createdAt: refundDate
              }
            });
          } else if (targetStatus === "ALLOTTED" && newSoldPrice && newSellDate) {
            const investmentValue = ipo.issuePrice * finalShares;
            const refundAmount = application.amountSent - investmentValue;

            if (refundAmount > 0) {
              await tx.transaction.create({
                data: {
                  applicationId: application.id,
                  type: "REFUND",
                  amount: refundAmount,
                  remarks: `Partial refund (CSV Import Allotted ${finalShares}) in ${ipo.ipoName}`,
                  createdAt: refundDate
                }
              });
            }

            await tx.transaction.create({
              data: {
                applicationId: application.id,
                type: "SALE",
                amount: finalShares * newSoldPrice,
                remarks: `Shares sold at ₹${newSoldPrice} (CSV Import Realized)`,
                createdAt: newSellDate
              }
            });
          }

          // Write Audit Log
          await tx.allotmentAuditLog.create({
            data: {
              applicationId: application.id,
              updatedBy,
              previousStatus: prevStatus,
              newStatus: targetStatus,
              source: "CSV"
            }
          });

          // Write Check log
          await tx.allotmentCheck.create({
            data: {
              panNumber: formattedPan,
              ipoId,
              status: targetStatus,
              sharesAllotted: finalShares,
              source: "CSV"
            }
          });
        });

        successCount++;
      } catch (err: any) {
        errors.push(`PAN ${formattedPan}: ${err.message}`);
        failedCount++;
      }
    }

    return {
      successCount,
      failedCount,
      errors
    };
  }
}
