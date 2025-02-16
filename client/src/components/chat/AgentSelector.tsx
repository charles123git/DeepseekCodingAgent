import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Bot } from "lucide-react";
import type { Agent } from "@shared/schema";
import { AGENT_ROLES } from "@/lib/agents";

interface AgentSelectorProps {
  selectedAgentId?: number;
  onSelect: (agent: Agent) => void;
}

export function AgentSelector({ selectedAgentId, onSelect }: AgentSelectorProps) {
  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  if (!agents?.length) return null;

  return (
    <div className="flex gap-2 p-2 overflow-x-auto">
      {agents.map((agent) => (
        <Card
          key={agent.id}
          className={`p-2 cursor-pointer hover:bg-accent flex items-center gap-2 transition-colors ${
            agent.id === selectedAgentId ? "bg-accent" : ""
          }`}
          onClick={() => onSelect(agent)}
        >
          <Bot className="h-4 w-4" />
          <div>
            <p className="text-sm font-medium">{agent.name}</p>
            <p className="text-xs text-muted-foreground">{agent.role}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
