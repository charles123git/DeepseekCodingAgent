import { Message, InsertMessage, Agent, InsertAgent } from "@shared/schema";

export interface IStorage {
  getMessages(): Promise<Message[]>;
  addMessage(message: InsertMessage): Promise<Message>;
  getAgents(): Promise<Agent[]>;
  addAgent(agent: InsertAgent): Promise<Agent>;
  getAgent(id: number): Promise<Agent | undefined>;
}

export class MemStorage implements IStorage {
  private messages: Map<number, Message>;
  private agents: Map<number, Agent>;
  private messageId: number;
  private agentId: number;

  constructor() {
    this.messages = new Map();
    this.agents = new Map();
    this.messageId = 1;
    this.agentId = 1;
  }

  async getMessages(): Promise<Message[]> {
    return Array.from(this.messages.values());
  }

  async addMessage(message: InsertMessage): Promise<Message> {
    const id = this.messageId++;
    const timestamp = new Date();
    const newMessage: Message = { ...message, id, timestamp };
    this.messages.set(id, newMessage);
    return newMessage;
  }

  async getAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async addAgent(agent: InsertAgent): Promise<Agent> {
    const id = this.agentId++;
    const newAgent: Agent = { ...agent, id };
    this.agents.set(id, newAgent);
    return newAgent;
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    return this.agents.get(id);
  }
}

export const storage = new MemStorage();
