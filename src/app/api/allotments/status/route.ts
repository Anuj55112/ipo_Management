import { NextResponse } from "next/server";
import { futureAPIProvider } from "@/services/allotment";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ipoId = searchParams.get("ipoId") || "";
    const pan = searchParams.get("pan") || "";

    if (!ipoId || !pan) {
      return NextResponse.json({ error: "Missing ipoId or pan parameters" }, { status: 400 });
    }

    const checkResult = await futureAPIProvider.checkAllotment(pan, ipoId);

    return NextResponse.json(checkResult);
  } catch (error: any) {
    console.error("GET allotments status error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch allotment status" }, { status: 500 });
  }
}
