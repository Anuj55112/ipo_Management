import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let setting = await prisma.setting.findUnique({
      where: { id: "default" }
    });

    if (!setting) {
      setting = await prisma.setting.create({
        data: {
          id: "default",
          defaultCommission: 300,
          currency: "INR",
          profitCalculationRules: "STANDARD"
        }
      });
    }

    return NextResponse.json(setting);
  } catch (error: any) {
    console.error("GET settings error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { defaultCommission, currency, profitCalculationRules } = body;

    const setting = await prisma.setting.upsert({
      where: { id: "default" },
      update: {
        defaultCommission: defaultCommission !== undefined ? parseFloat(defaultCommission) : undefined,
        currency: currency || undefined,
        profitCalculationRules: profitCalculationRules || undefined
      },
      create: {
        id: "default",
        defaultCommission: defaultCommission !== undefined ? parseFloat(defaultCommission) : 300,
        currency: currency || "INR",
        profitCalculationRules: profitCalculationRules || "STANDARD"
      }
    });

    return NextResponse.json(setting);
  } catch (error: any) {
    console.error("PUT settings error:", error);
    return NextResponse.json({ error: error.message || "Failed to update settings" }, { status: 500 });
  }
}
