import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const exhibitions = pgTable("exhibitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sourceUrl: text("source_url"),
  country: text("country").default("ایران"),
  city: text("city"),
  venue: text("venue"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  year: text("year"),
  isInternational: boolean("is_international").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  exhibitionId: integer("exhibition_id").references(() => exhibitions.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  website: text("website"),
  sourceUrl: text("source_url"),
  category: text("category"),
  booth: text("booth"),
  country: text("country"),
  websiteStatus: text("website_status").default("unknown"),
  opportunityScore: integer("opportunity_score").default(0),
  recommendedPackage: text("recommended_package"),
  googleStatus: text("google_status").notNull().default("not_checked"),
  googlePlaceName: text("google_place_name"),
  googleMapsUrl: text("google_maps_url"),
  checkedAt: timestamp("checked_at", { withTimezone: true }),
  priority: integer("priority").notNull().default(50),
  notes: text("notes"),
  googleRank: integer("google_rank"),
  onFirstPage: boolean("on_first_page"),
  rankMode: text("rank_mode"), // 'live' | 'simulated'
  rankCheckedAt: timestamp("rank_checked_at", { withTimezone: true }),
  status: text("status").notNull().default("new"), // new | checked | audited | proposal_ready
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Company = typeof companies.$inferSelect;

export const audits = pgTable("audits", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  url: text("url"),
  httpStatus: integer("http_status"),
  loadTimeMs: integer("load_time_ms"),
  title: text("title"),
  metaDescription: text("meta_description"),
  hasTitle: boolean("has_title").notNull().default(false),
  hasMetaDescription: boolean("has_meta_description")
    .notNull()
    .default(false),
  hasH1: boolean("has_h1").notNull().default(false),
  hasViewport: boolean("has_viewport").notNull().default(false),
  isHttps: boolean("is_https").notNull().default(false),
  hasJsonLd: boolean("has_json_ld").notNull().default(false),
  hasFaqSchema: boolean("has_faq_schema").notNull().default(false),
  wordCount: integer("word_count").notNull().default(0),
  h1Count: integer("h1_count").notNull().default(0),
  score: integer("score").notNull().default(0),
  mode: text("mode").notNull().default("live"), // live | no-site | unreachable
  issues: jsonb("issues").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Audit = typeof audits.$inferSelect;

export interface ProposalSection {
  heading: string;
  body: string;
  bullets?: string[];
}

/** One priced line item of the SEO package (amounts in Toman). */
export interface PricingItem {
  title: string;
  details: string;
  costMin: number;
  costMax: number;
}

/** One black-hat practice that Google penalizes. */
export interface PenaltyItem {
  title: string;
  consequence: string;
}

export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  keyword: text("keyword").notNull(),
  grade: text("grade").notNull(), // A | B | C (priority)
  summary: text("summary").notNull(),
  sections: jsonb("sections").$type<ProposalSection[]>().notNull().default([]),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  pricing: jsonb("pricing").$type<PricingItem[]>().notNull().default([]),
  penalties: jsonb("penalties").$type<PenaltyItem[]>().notNull().default([]),
  totalMin: integer("total_min"),
  totalMax: integer("total_max"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Proposal = typeof proposals.$inferSelect;

export interface SerpEntry {
  position: number;
  title: string;
  url: string;
  domain: string;
  snippet: string | null;
  fromExhibitor?: boolean;
  matchedCompanyId?: number | null;
  matchedCompanyName?: string | null;
}

export const marketScans = pgTable("market_scans", {
  id: serial("id").primaryKey(),
  keyword: text("keyword").notNull(),
  mode: text("mode").notNull().default("live"), // live | simulated
  engine: text("engine").notNull().default("google"), // google | duckduckgo | bing | simulated
  results: jsonb("results").$type<SerpEntry[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type MarketScan = typeof marketScans.$inferSelect;

export interface AnonymousBrief {
  alias: string;
  confidentiality: string;
  industry: string;
  city: string;
  currentState: string[];
  goals: string[];
  packageScope: string[];
  prohibited: string[];
  discloseAfter: string;
}

export const seoVendors = pgTable("seo_vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tier: text("tier").notNull().default("agency"), // top-agency | agency | freelancer
  city: text("city").default("تهران"),
  website: text("website"),
  contact: text("contact"),
  specialties: jsonb("specialties").$type<string[]>().notNull().default([]),
  minProjectBudget: integer("min_project_budget").default(0),
  score: integer("score").notNull().default(70),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SeoVendor = typeof seoVendors.$inferSelect;

export const quoteRequests = pgTable("quote_requests", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  proposalId: integer("proposal_id").references(() => proposals.id, {
    onDelete: "set null",
  }),
  alias: text("alias").notNull(),
  brief: jsonb("brief").$type<AnonymousBrief>().notNull(),
  status: text("status").notNull().default("draft"), // draft | sent | escrow | revealed | awarded | closed
  invitedVendorIds: jsonb("invited_vendor_ids").$type<number[]>().notNull().default([]),
  commissionPercent: integer("commission_percent").notNull().default(12),
  escrowAmount: integer("escrow_amount").default(0),
  revealToken: text("reveal_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type QuoteRequest = typeof quoteRequests.$inferSelect;

export const vendorQuotes = pgTable("vendor_quotes", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id")
    .references(() => quoteRequests.id, { onDelete: "cascade" })
    .notNull(),
  vendorId: integer("vendor_id")
    .references(() => seoVendors.id, { onDelete: "cascade" })
    .notNull(),
  priceMin: integer("price_min").notNull(),
  priceMax: integer("price_max").notNull(),
  durationWeeks: integer("duration_weeks").notNull().default(16),
  message: text("message").notNull(),
  status: text("status").notNull().default("submitted"), // submitted | shortlisted | accepted | rejected
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type VendorQuote = typeof vendorQuotes.$inferSelect;

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull().default("info"), // info | success | warn | error
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
