import { pgTable, serial, text, integer, numeric, timestamp, boolean, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const servicesTable = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  platform: text("platform").notNull(),
  description: text("description").notNull().default(""),
  pricePerThousand: numeric("price_per_thousand", { precision: 10, scale: 4 }).notNull(),
  minQuantity: integer("min_quantity").notNull().default(100),
  maxQuantity: integer("max_quantity").notNull().default(100000),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Service = typeof servicesTable.$inferSelect;
export const insertServiceSchema = createInsertSchema(servicesTable).omit({ id: true, createdAt: true });
export type InsertService = z.infer<typeof insertServiceSchema>;

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id),
  link: text("link").notNull(),
  quantity: integer("quantity").notNull(),
  charge: numeric("charge", { precision: 10, scale: 4 }).notNull(),
  status: text("status").notNull().default("Pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Order = typeof ordersTable.$inferSelect;
export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => usersTable.id),
  balance: numeric("balance", { precision: 12, scale: 4 }).notNull().default("0"),
  totalSpent: numeric("total_spent", { precision: 12, scale: 4 }).notNull().default("0"),
  totalAdded: numeric("total_added", { precision: 12, scale: 4 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Wallet = typeof walletsTable.$inferSelect;

export const topupRequestsTable = pgTable("topup_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id),
  amount: numeric("amount", { precision: 12, scale: 4 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  transactionId: text("transaction_id").notNull(),
  status: text("status").notNull().default("Pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TopupRequest = typeof topupRequestsTable.$inferSelect;
export const insertTopupSchema = createInsertSchema(topupRequestsTable).omit({ id: true, createdAt: true });
export type InsertTopup = z.infer<typeof insertTopupSchema>;

export const settingsTable = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
