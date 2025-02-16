import { pgTable, text, serial, jsonb, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  role: text("role").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  timestamp: timestamp("timestamp").defaultNow(),
  agentId: text("agent_id"),
  serviceId: text("service_id"),
});

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  capabilities: jsonb("capabilities").$type<Record<string, unknown>[]>().notNull().default([]),
  preferredService: text("preferred_service"),
  fallbackServices: jsonb("fallback_services").$type<string[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(), // e.g., 'together', 'deepseek', etc.
  apiKey: text("api_key"),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default('active'),
  healthCheck: timestamp("health_check"),
  errorCount: integer("error_count").notNull().default(0),
  isEnabled: boolean("is_enabled").notNull().default(true),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  role: true,
  metadata: true,
  agentId: true,
  serviceId: true,
});

export const insertAgentSchema = createInsertSchema(agents).pick({
  name: true,
  role: true,
  capabilities: true,
  preferredService: true,
  fallbackServices: true,
  isActive: true,
});

export const insertServiceSchema = createInsertSchema(services).pick({
  name: true,
  provider: true,
  apiKey: true,
  config: true,
  status: true,
  isEnabled: true,
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;