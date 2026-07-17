import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const googleStatusEnum = pgEnum("google_status", [
  "not_checked",
  "found",
  "not_found",
]);

export const proposalStatusEnum = pgEnum("proposal_status", [
  "draft",
  "sent",
]);

export const exhibitions = pgTable("exhibitions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  sourceUrl: text("source_url"),
  year: varchar("year", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const companies = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),
    exhibitionId: integer("exhibition_id")
      .notNull()
      .references(() => exhibitions.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 300 }).notNull(),
    phone: varchar("phone", { length: 300 }),
    website: text("website"),
    email: varchar("email", { length: 200 }),
    address: text("address"),
    category: varchar("category", { length: 200 }),
    googleStatus: googleStatusEnum("google_status").default("not_checked").notNull(),
    googlePlaceName: text("google_place_name"),
    googleMapsUrl: text("google_maps_url"),
    checkedAt: timestamp("checked_at"),
    priority: integer("priority").default(0).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // Defense-in-depth against duplicate imports: even if two requests race
    // past the application-level dedupe check at the same time, the
    // database itself refuses a second row with the same (case-insensitive)
    // name inside the same exhibition.
    uniqueIndex("companies_exhibition_name_unique").on(table.exhibitionId, sql`lower(${table.name})`),
    index("companies_exhibition_status_idx").on(table.exhibitionId, table.googleStatus),
  ],
);

export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  status: proposalStatusEnum("status").default("draft").notNull(),
  aiGenerated: boolean("ai_generated").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
