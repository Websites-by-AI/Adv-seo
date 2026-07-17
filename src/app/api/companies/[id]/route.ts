import { NextResponse } from "next/server";
import { db } from "@/db";
import { companies, proposals } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const companyId = Number(id);
  if (!Number.isInteger(companyId)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
  if (!company) {
    return NextResponse.json({ error: "شرکت یافت نشد" }, { status: 404 });
  }

  const companyProposals = await db
    .select()
    .from(proposals)
    .where(eq(proposals.companyId, companyId))
    .orderBy(desc(proposals.createdAt));

  return NextResponse.json({ company, proposals: companyProposals });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const companyId = Number(id);
  if (!Number.isInteger(companyId)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });
  }

  const allowed: Record<string, unknown> = {};
  for (const key of ["name", "phone", "website", "email", "address", "category", "notes"] as const) {
    if (typeof body[key] === "string") allowed[key] = body[key];
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "هیچ فیلد قابل‌به‌روزرسانی ارسال نشد" }, { status: 400 });
  }

  const [updated] = await db
    .update(companies)
    .set({ ...allowed, updatedAt: new Date() })
    .where(eq(companies.id, companyId))
    .returning();

  return NextResponse.json({ company: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const companyId = Number(id);
  if (!Number.isInteger(companyId)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  await db.delete(companies).where(eq(companies.id, companyId));
  return NextResponse.json({ ok: true });
}
