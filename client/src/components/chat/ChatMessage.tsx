import { Message } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isError = message.metadata?.error === true;

  return (
    <Card
      className={cn(
        "p-4 max-w-[80%]",
        isUser ? "ml-auto bg-primary text-primary-foreground" : "mr-auto bg-card/50",
        isError && "bg-background/50 border-border/50"
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {isUser ? "You" : message.agentId || "Assistant"}
          </span>
          {isError && <AlertCircle className="h-4 w-4 text-muted-foreground opacity-50" />}
        </div>
        <div className={cn(
          "whitespace-pre-wrap",
          isError && "text-muted-foreground"
        )}>
          {message.content}
        </div>
      </div>
    </Card>
  );
}