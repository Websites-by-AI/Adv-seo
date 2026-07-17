export type Severity = "high" | "medium" | "low";

export interface Check {
  key: string;
  label: string;
  ok: boolean;
  hint: string;
}

export interface Issue {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
}

export interface ActionItem {
  id: string;
  title: string;
  detail: string;
  category: "سئو فنی" | "محتوا" | "تجربه کاربری" | "اعتبارسازی" | "سئو محلی";
  priority: "بالا" | "متوسط" | "کم";
  impact: number; // 0-100
}

export interface DesignProposal {
  headline: string;
  style: string;
  font: string;
  cta: string;
  palette: { name: string; hex: string; role: string }[];
  structure: string[];
}

export interface RoadmapPhase {
  title: string;
  window: string;
  goal: string;
  tasks: string[];
}

export interface KeywordRank {
  keyword: string;
  rank: number | null; // null = خارج از ۱۰۰ نتیجه اول
}

export interface ReportData {
  seoScore: number;
  googleRank: number | null;
  onPageOne: boolean;
  loadMs: number;
  dataSource: "live" | "estimated";
  rankSource: "serper" | "estimated" | "none";
  opportunity: number;
  keywordRanks: KeywordRank[];
  keywords: string[];
  checks: Check[];
  issues: Issue[];
  actions: ActionItem[];
  design: DesignProposal;
  roadmap: RoadmapPhase[];
  analyzedAt: string;
}

export type LeadStage = "new" | "contacted" | "proposal" | "won" | "lost";

export const LEAD_STAGES: { key: LeadStage; label: string; hint: string }[] = [
  { key: "new", label: "جدید", hint: "تازه شکار شده؛ تماس برقرار نشده" },
  { key: "contacted", label: "تماس گرفته شد", hint: "اولین تماس با شرکت برقرار شده" },
  { key: "proposal", label: "پیشنهاد ارسال شد", hint: "گزارش و پیشنهاد طراحی ارسال شده" },
  { key: "won", label: "قرارداد بسته شد", hint: "تبدیل به مشتری شد" },
  { key: "lost", label: "رد شده", hint: "فعلاً منجر به فروش نشد" },
];

export interface LeadView {
  id: number;
  name: string;
  category: string;
  exhibition: string;
  city: string;
  booth: string;
  phone: string;
  website: string;
  status: "pending" | "analyzed";
  stage: LeadStage;
  report: ReportData | null;
}
