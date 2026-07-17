import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import type {
  Check,
  Issue,
  ActionItem,
  DesignProposal,
  RoadmapPhase,
  KeywordRank,
} from "@/lib/types";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default(""),
  exhibition: text("exhibition").notNull().default(""),
  city: text("city").notNull().default(""),
  booth: text("booth").notNull().default(""),
  phone: text("phone").notNull().default(""),
  website: text("website").notNull().default(""),
  status: text("status").notNull().default("pending"), // pending | analyzed
  stage: text("stage").notNull().default("new"), // new | contacted | proposal | won | lost
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" })
    .unique(),
  seoScore: integer("seo_score").notNull().default(0),
  googleRank: integer("google_rank"),
  onPageOne: boolean("on_page_one").notNull().default(false),
  loadMs: integer("load_ms").notNull().default(0),
  dataSource: text("data_source").notNull().default("estimated"), // live | estimated
  rankSource: text("rank_source").notNull().default("estimated"), // serper | estimated | none
  opportunity: integer("opportunity").notNull().default(0),
  keywordRanks: jsonb("keyword_ranks").$type<KeywordRank[]>().notNull().default([]),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  checks: jsonb("checks").$type<Check[]>().notNull().default([]),
  issues: jsonb("issues").$type<Issue[]>().notNull().default([]),
  actions: jsonb("actions").$type<ActionItem[]>().notNull().default([]),
  design: jsonb("design").$type<DesignProposal>().notNull(),
  roadmap: jsonb("roadmap").$type<RoadmapPhase[]>().notNull().default([]),
  analyzedAt: timestamp("analyzed_at", { mode: "string" }).defaultNow().notNull(),
});
