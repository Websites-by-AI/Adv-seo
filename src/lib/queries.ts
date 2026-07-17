import { db } from "@/db";
import { companies, reports } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import type { LeadView, ReportData } from "@/lib/types";

type CompanyRow = typeof companies.$inferSelect;
type ReportRow = typeof reports.$inferSelect;

function toView(
  company: CompanyRow,
  report: ReportRow | null
): LeadView {
  const reportData: ReportData | null = report
    ? {
        seoScore: report.seoScore,
        googleRank: report.googleRank,
        onPageOne: report.onPageOne,
        loadMs: report.loadMs,
        dataSource: (report.dataSource as "live" | "estimated") ?? "estimated",
        rankSource: (report.rankSource as "serper" | "estimated" | "none") ?? "estimated",
        opportunity: report.opportunity ?? 0,
        keywordRanks: report.keywordRanks ?? [],
        keywords: report.keywords,
        checks: report.checks,
        issues: report.issues,
        actions: report.actions,
        design: report.design,
        roadmap: report.roadmap,
        analyzedAt: report.analyzedAt,
      }
    : null;

  return {
    id: company.id,
    name: company.name,
    category: company.category,
    exhibition: company.exhibition,
    city: company.city,
    booth: company.booth,
    phone: company.phone,
    website: company.website,
    status: company.status as "pending" | "analyzed",
    stage: (company.stage as LeadView["stage"]) ?? "new",
    report: reportData,
  };
}

export async function getLeads(): Promise<LeadView[]> {
  const rows = await db
    .select()
    .from(companies)
    .leftJoin(reports, eq(reports.companyId, companies.id))
    .orderBy(asc(companies.id));
  return rows.map((r) => toView(r.companies, r.reports));
}

export async function getLeadById(id: number): Promise<LeadView | null> {
  const rows = await db
    .select()
    .from(companies)
    .leftJoin(reports, eq(reports.companyId, companies.id))
    .where(eq(companies.id, id))
    .limit(1);
  if (!rows[0]) return null;
  return toView(rows[0].companies, rows[0].reports);
}
