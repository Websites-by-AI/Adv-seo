import { NextResponse } from "next/server";
import { db } from "@/db";
import { companies, exhibitions, proposals } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { generateProposal } from "@/lib/proposal";
import { enhanceProposalWithAi } from "@/lib/ai-proposal";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const companyId = Number(id);
  if (!Number.isInteger(companyId)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(proposals)
    .where(eq(proposals.companyId, companyId))
    .orderBy(desc(proposals.createdAt));

  return NextResponse.json({ proposals: rows });
}

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const companyId = Number(id);
  if (!Number.isInteger(companyId)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
  if (!company) {
    return NextResponse.json({ error: "شرکت یافت نشد" }, { status: 404 });
  }

  const [exhibition] = await db
    .select()
    .from(exhibitions)
    .where(eq(exhibitions.id, company.exhibitionId));

  const templateInput = {
    name: company.name,
    exhibitionTitle: exhibition?.title,
    phone: company.phone,
    website: company.website,
    address: company.address,
    category: company.category,
  };
  const templateContent = generateProposal(templateInput);
  const { content, aiGenerated } = await enhanceProposalWithAi(templateContent, templateInput);

  const [proposal] = await db.insert(proposals).values({ companyId, content, aiGenerated }).returning();

  return NextResponse.json({ proposal }, { status: 201 });
}
