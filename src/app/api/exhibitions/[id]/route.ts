import { NextResponse } from "next/server";
import { db } from "@/db";
import { exhibitions } from "@/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const exhibitionId = Number(id);
  if (!Number.isInteger(exhibitionId)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  const [exhibition] = await db.select().from(exhibitions).where(eq(exhibitions.id, exhibitionId));
  if (!exhibition) {
    return NextResponse.json({ error: "نمایشگاه یافت نشد" }, { status: 404 });
  }

  return NextResponse.json({ exhibition });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const exhibitionId = Number(id);
  if (!Number.isInteger(exhibitionId)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  await db.delete(exhibitions).where(eq(exhibitions.id, exhibitionId));
  return NextResponse.json({ ok: true });
}
