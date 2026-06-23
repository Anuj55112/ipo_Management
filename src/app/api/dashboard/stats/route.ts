import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ipoId = searchParams.get("ipoId") || "";
    const accountId = searchParams.get("accountId") || "";
    const allotmentStatus = searchParams.get("allotmentStatus") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    // 1. Setup filters for applications
    const where: any = {};
    if (ipoId) where.ipoId = ipoId;
    if (accountId) where.accountId = accountId;
    if (allotmentStatus) where.allotmentStatus = allotmentStatus;
    if (startDate || endDate) {
      where.applicationDate = {};
      if (startDate) where.applicationDate.gte = new Date(startDate);
      if (endDate) where.applicationDate.lte = new Date(endDate);
    }

    // Fetch filtered applications with related data
    const applications = await prisma.application.findMany({
      where,
      include: {
        account: true,
        ipo: true
      }
    });

    // Fetch counts that might be independent of the global filters (or we can filter accounts/ipos too)
    const totalAccounts = await prisma.account.count({
      where: accountId ? { id: accountId } : {}
    });

    const activeIpos = await prisma.ipo.count({
      where: {
        status: { in: ["OPEN", "UPCOMING"] },
        ...(ipoId ? { id: ipoId } : {})
      }
    });

    // 2. Compute KPI Metrics
    let totalCapitalDeployed = 0;
    let totalCommissionPaid = 0;
    let totalGrossProfit = 0;
    let totalNetProfit = 0;
    let pendingCount = 0;
    let allottedCount = 0;
    let notAllottedCount = 0;

    // Analytics grouping helpers
    const ipoPerformanceMap: Record<string, { ipoName: string; netProfit: number; grossProfit: number; capital: number; count: number }> = {};
    const accountPerformanceMap: Record<string, { accountName: string; netProfit: number; commission: number; count: number }> = {};
    const monthlyPerformanceMap: Record<string, { month: string; netProfit: number; grossProfit: number; commission: number; capital: number }> = {};

    applications.forEach((app) => {
      totalCapitalDeployed += app.amountSent;
      totalCommissionPaid += app.commissionPaid;

      let grossProfit = 0;
      let netProfit = 0;

      if (app.allotmentStatus === "ALLOTTED") {
        allottedCount++;
        const soldPrice = app.soldPrice || 0;
        const issuePrice = app.ipo.issuePrice;
        grossProfit = (soldPrice - issuePrice) * app.sharesAllotted;
        netProfit = grossProfit - app.commissionPaid;
      } else if (app.allotmentStatus === "NOT_ALLOTTED") {
        notAllottedCount++;
        grossProfit = 0;
        netProfit = -app.commissionPaid;
      } else {
        pendingCount++;
        grossProfit = 0;
        netProfit = 0; // Pending profit is 0 until allotment
      }

      totalGrossProfit += grossProfit;
      totalNetProfit += netProfit;

      // Group by IPO
      if (!ipoPerformanceMap[app.ipoId]) {
        ipoPerformanceMap[app.ipoId] = {
          ipoName: app.ipo.ipoName,
          netProfit: 0,
          grossProfit: 0,
          capital: 0,
          count: 0
        };
      }
      ipoPerformanceMap[app.ipoId].netProfit += netProfit;
      ipoPerformanceMap[app.ipoId].grossProfit += grossProfit;
      ipoPerformanceMap[app.ipoId].capital += app.amountSent;
      ipoPerformanceMap[app.ipoId].count += 1;

      // Group by Account
      if (!accountPerformanceMap[app.accountId]) {
        accountPerformanceMap[app.accountId] = {
          accountName: app.account.accountName,
          netProfit: 0,
          commission: 0,
          count: 0
        };
      }
      accountPerformanceMap[app.accountId].netProfit += netProfit;
      accountPerformanceMap[app.accountId].commission += app.commissionPaid;
      accountPerformanceMap[app.accountId].count += 1;

      // Group by Month (using Application Date)
      const date = new Date(app.applicationDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; // e.g. "2026-06"
      const monthLabel = date.toLocaleString("default", { month: "short", year: "2-digit" }); // e.g. "Jun 26"
      
      if (!monthlyPerformanceMap[monthKey]) {
        monthlyPerformanceMap[monthKey] = {
          month: monthLabel,
          netProfit: 0,
          grossProfit: 0,
          commission: 0,
          capital: 0
        };
      }
      monthlyPerformanceMap[monthKey].netProfit += netProfit;
      monthlyPerformanceMap[monthKey].grossProfit += grossProfit;
      monthlyPerformanceMap[monthKey].commission += app.commissionPaid;
      monthlyPerformanceMap[monthKey].capital += app.amountSent;
    });

    // Format chart data arrays
    const monthlyTrends = Object.entries(monthlyPerformanceMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, val]) => val);

    const ipoBreakdown = Object.entries(ipoPerformanceMap)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.netProfit - a.netProfit);

    const accountBreakdown = Object.entries(accountPerformanceMap)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.netProfit - a.netProfit);

    // Compute advanced analytics metrics
    const totalResolved = allottedCount + notAllottedCount;
    const successRate = totalResolved > 0 ? (allottedCount / totalResolved) * 100 : 0;
    const roiPercentage = totalCapitalDeployed > 0 ? (totalNetProfit / totalCapitalDeployed) * 100 : 0;
    const averageProfitPerIpo = ipoBreakdown.length > 0 ? totalNetProfit / ipoBreakdown.length : 0;
    const averageCommissionCost = applications.length > 0 ? totalCommissionPaid / applications.length : 0;

    const bestPerformingIpo = ipoBreakdown.length > 0 ? ipoBreakdown[0] : null;
    const worstPerformingIpo = ipoBreakdown.length > 0 ? ipoBreakdown[ipoBreakdown.length - 1] : null;
    const mostProfitableAccount = accountBreakdown.length > 0 ? accountBreakdown[0] : null;

    return NextResponse.json({
      kpis: {
        totalAccounts,
        activeIPOs: activeIpos,
        totalCapitalDeployed,
        totalCommissionPaid,
        totalGrossProfit,
        totalNetProfit,
        pendingApplications: pendingCount,
        allottedApplications: allottedCount,
        notAllottedApplications: notAllottedCount
      },
      analytics: {
        successRate,
        roiPercentage,
        averageProfitPerIpo,
        averageCommissionCost,
        bestPerformingIpo: bestPerformingIpo ? { name: bestPerformingIpo.ipoName, profit: bestPerformingIpo.netProfit } : null,
        worstPerformingIpo: worstPerformingIpo ? { name: worstPerformingIpo.ipoName, profit: worstPerformingIpo.netProfit } : null,
        mostProfitableAccount: mostProfitableAccount ? { name: mostProfitableAccount.accountName, profit: mostProfitableAccount.netProfit } : null
      },
      charts: {
        monthlyTrends,
        ipoBreakdown: ipoBreakdown.slice(0, 10), // Top 10 IPOs
        accountBreakdown: accountBreakdown.slice(0, 10) // Top 10 Accounts
      }
    });
  } catch (error: any) {
    console.error("GET dashboard stats error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch stats" }, { status: 500 });
  }
}
