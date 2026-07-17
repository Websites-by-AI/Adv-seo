import { NextResponse } from "next/server";
import { db } from "@/db";
import { proposals } from "@/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const proposalId = Number(id);
  if (!Number.isInteger(proposalId)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const status = body?.status;
  if (status !== "draft" && status !== "sent") {
    return NextResponse.json({ error: "وضعیت نامعتبر است" }, { status: 400 });
  }

  const [updated] = await db
    .update(proposals)
    .set({ status })
    .where(eq(proposals.id, proposalId))
    .returning();

  return NextResponse.json({ proposal: updated });
}
