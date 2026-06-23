import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { csvImportProvider } from "@/services/allotment";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ipoId, fileName, rows } = body;

    if (!ipoId || !fileName || !rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const ipo = await prisma.ipo.findUnique({
      where: { id: ipoId }
    });
    if (!ipo) {
      return NextResponse.json({ error: "IPO not found" }, { status: 404 });
    }

    // Process bulk CSV import
    const result = await csvImportProvider.importCsvData(
      ipoId,
      rows,
      `Admin / CSV (${fileName})`
    );

    // Save AllotmentImport details in the database
    const importRecord = await prisma.allotmentImport.create({
      data: {
        ipoId,
        fileName,
        successCount: result.successCount,
        failedCount: result.failedCount
      }
    });

    return NextResponse.json({
      success: true,
      importId: importRecord.id,
      successCount: result.successCount,
      failedCount: result.failedCount,
      errors: result.errors
    });
  } catch (error: any) {
    console.error("POST allotments import error:", error);
    return NextResponse.json({ error: error.message || "Failed to process CSV import" }, { status: 500 });
  }
}
