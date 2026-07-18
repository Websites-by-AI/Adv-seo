import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  companies,
  proposals,
  quoteRequests,
  seoVendors,
  vendorQuotes,
} from "@/db/schema";
import { simulateVendorQuote } from "@/lib/rfq";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const requestId = Number(id);
  const [rfq] = await db.select().from(quoteRequests).where(eq(quoteRequests.id, requestId)).limit(1);
  if (!rfq) return NextResponse.json({ error: "استعلام یافت نشد" }, { status: 404 });

  const vendors = rfq.invitedVendorIds.length
    ? await db.select().from(seoVendors).where(inArray(seoVendors.id, rfq.invitedVendorIds))
    : [];
  const quotes = await db.select().from(vendorQuotes).where(eq(vendorQuotes.requestId, requestId));
  const reveal = ["escrow", "revealed", "awarded", "closed"].includes(rfq.status);
  let company: unknown = null;
  if (reveal) {
    const [row] = await db.select().from(companies).where(eq(companies.id, rfq.companyId)).limit(1);
    company = row ?? null;
  }
  return NextResponse.json({ rfq, vendors, quotes, company, revealed: reveal });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const requestId = Number(id);
  const body = (await req.json()) as { action?: "send" | "escrow" | "reveal" | "award"; vendorId?: number };
  const [rfq] = await db.select().from(quoteRequests).where(eq(quoteRequests.id, requestId)).limit(1);
  if (!rfq) return NextResponse.json({ error: "استعلام یافت نشد" }, { status: 404 });

  if (body.action === "send") {
    const vendors = rfq.invitedVendorIds.length
      ? await db.select().from(seoVendors).where(inArray(seoVendors.id, rfq.invitedVendorIds))
      : [];
    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, rfq.proposalId ?? 0)).limit(1);
    const existing = await db.select().from(vendorQuotes).where(eq(vendorQuotes.requestId, requestId));
    const existingVendorIds = new Set(existing.map((q) => q.vendorId));
    const values = vendors
      .filter((v) => !existingVendorIds.has(v.id))
      .map((v) => {
        const q = simulateVendorQuote({
          vendorScore: v.score,
          totalMin: proposal?.totalMin ?? 50_000_000,
          totalMax: proposal?.totalMax ?? 120_000_000,
          seed: `${requestId}-${v.id}-${v.name}`,
        });
        return {
          requestId,
          vendorId: v.id,
          ...q,
          message: `قیمت محرمانه بر اساس بریف بدون نام شرکت ارائه شد. اجرای وایت‌هت، گزارش هفتگی و تحویل مستندات تضمین می‌شود.`,
        };
      });
    if (values.length) await db.insert(vendorQuotes).values(values);
    const [updated] = await db
      .update(quoteRequests)
      .set({ status: "sent" })
      .where(eq(quoteRequests.id, requestId))
      .returning();
    await db.insert(activityLogs).values({
      level: "success",
      message: `استعلام محرمانه «${rfq.alias}» برای ${vendors.length} ارائه‌دهنده ارسال شد و قیمت‌ها دریافت شد`,
    });
    return NextResponse.json({ ok: true, request: updated, quotesCreated: values.length });
  }

  if (body.action === "escrow" || body.action === "reveal") {
    const [updated] = await db
      .update(quoteRequests)
      .set({ status: "revealed" })
      .where(eq(quoteRequests.id, requestId))
      .returning();
    await db.insert(activityLogs).values({
      level: "warn",
      message: `اطلاعات واقعی «${rfq.alias}» پس از ثبت امانت/پورسانت برای مجری منتخب قابل مشاهده شد`,
    });
    return NextResponse.json({ ok: true, request: updated });
  }

  if (body.action === "award" && body.vendorId) {
    await db
      .update(vendorQuotes)
      .set({ status: "accepted" })
      .where(eq(vendorQuotes.vendorId, body.vendorId));
    const [updated] = await db
      .update(quoteRequests)
      .set({ status: "awarded" })
      .where(eq(quoteRequests.id, requestId))
      .returning();
    await db.insert(activityLogs).values({
      level: "success",
      message: `مجری منتخب برای «${rfq.alias}» انتخاب شد؛ داده‌های پروژه برای شروع کار آماده است`,
    });
    return NextResponse.json({ ok: true, request: updated });
  }

  return NextResponse.json({ error: "اکشن نامعتبر" }, { status: 400 });
}
