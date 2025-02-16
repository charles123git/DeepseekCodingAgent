import { pgTable, text, serial, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  role: text("role").notNull(),
  metadata: jsonb("metadata").default({}),
  timestamp: timestamp("timestamp").defaultNow(),
  agentId: text("agent_id"),
});

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  capabilities: jsonb("capabilities").default([]),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  role: true,
  metadata: true,
  agentId: true,
});

export const insertAgentSchema = createInsertSchema(agents).pick({
  name: true,
  role: true,
  capabilities: true,
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
