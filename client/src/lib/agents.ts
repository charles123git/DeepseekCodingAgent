export const AGENT_ROLES = {
  PLANNER: "planner",
  CODER: "coder",
  REVIEWER: "reviewer",
} as const;

export type AgentRole = typeof AGENT_ROLES[keyof typeof AGENT_ROLES];

export interface AgentCapability {
  name: string;
  description: string;
}

export const DEFAULT_CAPABILITIES: Record<AgentRole, AgentCapability[]> = {
  [AGENT_ROLES.PLANNER]: [
    {
      name: "task_breakdown",
      description: "Break down complex tasks into smaller, manageable steps",
    },
    {
      name: "architecture_design",
      description: "Design system architecture and component relationships",
    },
  ],
  [AGENT_ROLES.CODER]: [
    {
      name: "code_generation",
      description: "Generate code based on specifications",
    },
    {
      name: "code_completion",
      description: "Complete partial code snippets",
    },
  ],
  [AGENT_ROLES.REVIEWER]: [
    {
      name: "code_review",
      description: "Review code for best practices and potential issues",
    },
    {
      name: "security_analysis",
      description: "Analyze code for security vulnerabilities",
    },
  ],
};
