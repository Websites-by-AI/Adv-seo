import { NextResponse } from "next/server";
import { getLeads } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const leads = await getLeads();
    return NextResponse.json(leads);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطا در خواندن داده" },
      { status: 500 }
    );
  }
}
