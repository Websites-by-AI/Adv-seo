import { NextResponse } from "next/server";
import { db } from "@/db";
import { companies, exhibitions } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

const STATUS_LABEL: Record<string, string> = {
  not_checked: "بررسی نشده",
  found: "دارای پروفایل گوگل",
  not_found: "یافت نشد",
};

function csvEscape(value: string | null | undefined): string {
  const v = value ?? "";
  if (/[",\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const exhibitionId = Number(id);
  if (!Number.isInteger(exhibitionId)) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  const [exhibition] = await db.select().from(exhibitions).where(eq(exhibitions.id, exhibitionId));
  if (!exhibition) {
    return NextResponse.json({ error: "نمایشگاه یافت نشد" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status"); // "not_found" | "found" | "not_checked" | null (all)

  const whereClause =
    statusFilter && ["not_found", "found", "not_checked"].includes(statusFilter)
      ? and(eq(companies.exhibitionId, exhibitionId), eq(companies.googleStatus, statusFilter as "not_found" | "found" | "not_checked"))
      : eq(companies.exhibitionId, exhibitionId);

  const rows = await db
    .select()
    .from(companies)
    .where(whereClause)
    .orderBy(desc(companies.priority), desc(companies.createdAt));

  const header = [
    "نام شرکت",
    "تلفن",
    "وبسایت",
    "ایمیل",
    "آدرس",
    "دسته‌بندی",
    "وضعیت گوگل",
    "لینک نقشه گوگل",
  ];

  const lines = [header.map(csvEscape).join(",")];
  for (const c of rows) {
    lines.push(
      [
        c.name,
        c.phone,
        c.website,
        c.email,
        c.address,
        c.category,
        STATUS_LABEL[c.googleStatus] ?? c.googleStatus,
        c.googleMapsUrl,
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  // BOM so Excel opens the Persian text as UTF-8 correctly.
  const csv = "\uFEFF" + lines.join("\r\n");

  // HTTP header values must be plain ByteStrings, so Persian text can't go
  // directly into `filename=`. Use an ASCII-only fallback plus the
  // RFC 5987 `filename*=UTF-8''...` form so browsers still show the
  // original Persian title when saving the file.
  const asciiFallback = `exhibition-${exhibitionId}.csv`;
  const encodedTitle = encodeURIComponent(`${exhibition.title}.csv`);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedTitle}`,
    },
  });
}
