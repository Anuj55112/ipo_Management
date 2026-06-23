import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const imports = await prisma.allotmentImport.findMany({
      include: {
        ipo: {
          select: {
            ipoName: true
          }
        }
      },
      orderBy: { importedAt: "desc" }
    });

    return NextResponse.json(imports);
  } catch (error: any) {
    console.error("GET allotment imports error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch import logs" }, { status: 500 });
  }
}
