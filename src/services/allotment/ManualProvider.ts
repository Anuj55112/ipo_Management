import { prisma } from "@/lib/prisma";
import { AllotmentProvider, AllotmentResponse } from "./types";

export class ManualProvider implements AllotmentProvider {
  async checkAllotment(panNumber: string, ipoId: string): Promise<AllotmentResponse> {
    const app = await prisma.application.findFirst({
      where: {
        ipoId,
        account: {
          panNumber: panNumber.toUpperCase()
        }
      }
    });

    if (!app) {
      return {
        status: "PENDING",
        sharesAllotted: 0,
        source: "MANUAL",
        checkedAt: new Date()
      };
    }

    return {
      status: app.allotmentStatus as any,
      sharesAllotted: app.sharesAllotted,
      source: "MANUAL",
      checkedAt: app.updatedAt
    };
  }

  async checkBulkAllotment(panNumbers: string[], ipoId: string): Promise<Record<string, AllotmentResponse>> {
    const apps = await prisma.application.findMany({
      where: {
        ipoId,
        account: {
          panNumber: { in: panNumbers.map(p => p.toUpperCase()) }
        }
      },
      include: {
        account: {
          select: {
            panNumber: true
          }
        }
      }
    });

    const results: Record<string, AllotmentResponse> = {};

    // Initialize all with pending defaults
    panNumbers.forEach((pan) => {
      results[pan.toUpperCase()] = {
        status: "PENDING",
        sharesAllotted: 0,
        source: "MANUAL",
        checkedAt: new Date()
      };
    });

    // Populate actuals
    apps.forEach((app) => {
      results[app.account.panNumber] = {
        status: app.allotmentStatus as any,
        sharesAllotted: app.sharesAllotted,
        source: "MANUAL",
        checkedAt: app.updatedAt
      };
    });

    return results;
  }

  async getAllotmentStatus(applicationId: string): Promise<AllotmentResponse> {
    const app = await prisma.application.findUnique({
      where: { id: applicationId }
    });

    if (!app) {
      throw new Error(`Application ${applicationId} not found`);
    }

    return {
      status: app.allotmentStatus as any,
      sharesAllotted: app.sharesAllotted,
      source: "MANUAL",
      checkedAt: app.updatedAt
    };
  }
}
