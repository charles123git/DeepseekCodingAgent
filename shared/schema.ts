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
  provider: text("provider").notNull(),
  apiKey: text("api_key"),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default('active'),
  healthCheck: timestamp("health_check"),
  errorCount: integer("error_count").notNull().default(0),
  isEnabled: boolean("is_enabled").notNull().default(true),
});

// Client-side message schema for WebSocket communication
export const webSocketMessageSchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
  role: z.enum(["user", "assistant", "system"]),
  metadata: z.record(z.unknown()).default({}),
  id: z.number().optional(),
  timestamp: z.date().nullable().optional(),
  agentId: z.string().nullable().optional(),
  serviceId: z.string().nullable().optional(),
});

// Base schema for stored messages with validation rules
const messageBaseSchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
  role: z.enum(["user", "assistant", "system"]),
  metadata: z.record(z.unknown()).default({}),
  agentId: z.string().nullable(),
  serviceId: z.string().nullable(),
  timestamp: z.date().nullable(),
});

// Capability schema for agents
const capabilitySchema = z.object({
  name: z.string().min(1, "Capability name cannot be empty"),
  description: z.string().min(1, "Capability description cannot be empty"),
});

// Base schema for agents with validation rules
const agentBaseSchema = z.object({
  name: z.string().min(1, "Agent name cannot be empty"),
  role: z.enum(["planner", "coder", "reviewer"]),
  capabilities: z.array(capabilitySchema).default([]),
  preferredService: z.string().optional(),
  fallbackServices: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const insertMessageSchema = createInsertSchema(messages).merge(messageBaseSchema);
export const insertAgentSchema = createInsertSchema(agents).merge(agentBaseSchema);
export const insertServiceSchema = createInsertSchema(services);

export type WebSocketMessage = z.infer<typeof webSocketMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;