import { NextResponse } from "next/server";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { LEAD_STAGES, type LeadStage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = Number(id);
    if (!Number.isFinite(companyId)) {
      return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
    }
    const body = (await req.json().catch(() => ({}))) as { stage?: string };
    const valid = LEAD_STAGES.some((s) => s.key === body.stage);
    if (!valid) {
      return NextResponse.json({ error: "وضعیت نامعتبر است" }, { status: 400 });
    }
    await db
      .update(companies)
      .set({ stage: body.stage as LeadStage })
      .where(eq(companies.id, companyId));
    return NextResponse.json({ ok: true, stage: body.stage });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطا در به‌روزرسانی وضعیت" },
      { status: 500 }
    );
  }
}
