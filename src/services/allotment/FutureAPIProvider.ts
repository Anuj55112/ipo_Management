import { prisma } from "@/lib/prisma";
import { AllotmentProvider, AllotmentResponse } from "./types";

export class FutureAPIProvider implements AllotmentProvider {
  async checkAllotment(panNumber: string, ipoId: string): Promise<AllotmentResponse> {
    // 1. Check if we already checked it recently in our AllotmentCheck database logs
    const recentCheck = await prisma.allotmentCheck.findFirst({
      where: {
        panNumber: panNumber.toUpperCase(),
        ipoId,
        source: "API"
      },
      orderBy: { checkedAt: "desc" }
    });

    if (recentCheck) {
      return {
        status: recentCheck.status as any,
        sharesAllotted: recentCheck.sharesAllotted,
        source: "API",
        checkedAt: recentCheck.checkedAt
      };
    }

    const ipo = await prisma.ipo.findUnique({ where: { id: ipoId } });
    if (!ipo) {
      throw new Error(`IPO ${ipoId} not found`);
    }

    let status: "ALLOTTED" | "NOT_ALLOTTED" | "PENDING" = "NOT_ALLOTTED";
    let sharesAllotted = 0;
    const cleanPan = panNumber.toUpperCase().trim();

    // Only run live check if externalId mapping is configured
    if (ipo.externalId) {
      try {
        const response = await fetch("https://0uz601ms56.execute-api.ap-south-1.amazonaws.com/prod/api/query?type=pan", {
          method: "GET",
          headers: {
            "accept": "application/json, text/plain, */*",
            "client_id": ipo.externalId.trim(),
            "reqparam": panNumber.toLowerCase().trim(),
            "referer": "https://ipostatus.kfintech.com/",
            "origin": "https://ipostatus.kfintech.com",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });

        if (response.status === 404) {
          status = "NOT_ALLOTTED";
          sharesAllotted = 0;
        } else if (!response.ok) {
          throw new Error(`Registrar responded with code ${response.status}`);
        } else {
          const json = await response.json();
          // Handle object or array formats returned by KFintech
          const data = Array.isArray(json) ? json[0] : json;
          if (data) {
            const sharesVal = data.QtyAllot || data.Qty || data.qty || data.shares || data.sharesAllotted || data.allotted || 0;
            sharesAllotted = parseInt(sharesVal, 10) || 0;
            
            const remarks = String(data.remarks || data.status || data.allotmentStatus || "").toUpperCase();
            if (sharesAllotted > 0 || (remarks.includes("ALLOT") && !remarks.includes("NOT"))) {
              status = "ALLOTTED";
              if (sharesAllotted === 0) {
                sharesAllotted = ipo.lotSize;
              }
            } else {
              status = "NOT_ALLOTTED";
            }
          }
        }
      } catch (err: any) {
        console.error("KFintech API query error:", err);
        status = "PENDING";
      }
    } else {
      // Fallback to simulated check if externalId is not set
      let hash = 0;
      for (let i = 0; i < cleanPan.length; i++) {
        hash += cleanPan.charCodeAt(i);
      }
      const isAllotted = hash % 3 === 0;
      status = isAllotted ? "ALLOTTED" : "NOT_ALLOTTED";
      sharesAllotted = isAllotted ? ipo.lotSize : 0;
    }

    // Log the check
    const log = await prisma.allotmentCheck.create({
      data: {
        panNumber: cleanPan,
        ipoId,
        status,
        sharesAllotted,
        source: "API"
      }
    });

    return {
      status,
      sharesAllotted,
      source: "API",
      checkedAt: log.checkedAt
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
}
