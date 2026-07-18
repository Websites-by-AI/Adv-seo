import { NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLogs,
  audits,
  companies,
  proposals,
  quoteRequests,
  seoVendors,
  vendorQuotes,
} from "@/db/schema";
import {
  SEO_MARKET_ESTIMATE,
  SAMPLE_SEO_VENDORS,
  buildAnonymousBrief,
  simulateVendorQuote,
} from "@/lib/rfq";

export const dynamic = "force-dynamic";

async function seedVendorsIfNeeded() {
  const existing = await db.select({ id: seoVendors.id }).from(seoVendors).limit(1);
  if (existing.length > 0) return;
  await db.insert(seoVendors).values(SAMPLE_SEO_VENDORS);
  await db.insert(activityLogs).values({
    level: "info",
    message: `${SAMPLE_SEO_VENDORS.length} ارائه‌دهنده نمونه سئو برای بازار ایران اضافه شد`,
  });
}

async function listRequests() {
  const reqs = await db
    .select({ request: quoteRequests, company: companies, proposal: proposals })
    .from(quoteRequests)
    .leftJoin(companies, eq(companies.id, quoteRequests.companyId))
    .leftJoin(proposals, eq(proposals.id, quoteRequests.proposalId))
    .orderBy(desc(quoteRequests.id))
    .limit(50);

  const quotes = await db.select().from(vendorQuotes).orderBy(desc(vendorQuotes.id)).limit(500);
  return reqs.map((r) => ({
    ...r.request,
    companyName: r.company?.name ?? "—",
    totalMin: r.proposal?.totalMin ?? 0,
    totalMax: r.proposal?.totalMax ?? 0,
    quotes: quotes.filter((q) => q.requestId === r.request.id),
  }));
}

export async function GET() {
  await seedVendorsIfNeeded();
  const vendors = await db.select().from(seoVendors).orderBy(desc(seoVendors.score));
  return NextResponse.json({
    market: SEO_MARKET_ESTIMATE,
    vendors,
    requests: await listRequests(),
  });
}

export async function POST(req: Request) {
  try {
    await seedVendorsIfNeeded();
    const body = (await req.json()) as { companyId?: number; inviteCount?: number };
    const companyId = Number(body.companyId);
    if (!Number.isFinite(companyId)) {
      return NextResponse.json({ error: "شناسه شرکت نامعتبر است" }, { status: 400 });
    }

    const rows = await db
      .select({ company: companies, audit: audits, proposal: proposals })
      .from(companies)
      .leftJoin(audits, eq(audits.companyId, companyId))
      .leftJoin(proposals, eq(proposals.companyId, companyId))
      .where(eq(companies.id, companyId))
      .limit(1);
    const row = rows[0];
    if (!row?.company || !row.proposal) {
      return NextResponse.json(
        { error: "برای این شرکت ابتدا باید پیشنهادنامه ساخته شود" },
        { status: 422 },
      );
    }

    const brief = buildAnonymousBrief({
      company: row.company,
      audit: row.audit,
      proposal: row.proposal,
    });

    const inviteCount = Math.min(Math.max(body.inviteCount ?? 12, 3), 20);
    const vendors = await db.select().from(seoVendors).orderBy(desc(seoVendors.score)).limit(inviteCount);
    const invitedVendorIds = vendors.map((v) => v.id);

    const [rfq] = await db
      .insert(quoteRequests)
      .values({
        companyId,
        proposalId: row.proposal.id,
        alias: brief.alias,
        brief,
        invitedVendorIds,
        status: "draft",
        escrowAmount: Math.round(((row.proposal.totalMin ?? 0) * 0.15) / 500_000) * 500_000,
        revealToken: crypto.randomUUID(),
      })
      .returning();

    await db.insert(activityLogs).values({
      level: "success",
      message: `استعلام محرمانه «${brief.alias}» ساخته شد — ${invitedVendorIds.length} ارائه‌دهنده آماده دعوت`,
    });

    return NextResponse.json({ ok: true, request: rfq, vendors });
  } catch (err) {
    console.error("rfq create error", err);
    return NextResponse.json({ error: "خطا در ساخت استعلام محرمانه" }, { status: 500 });
  }
}
