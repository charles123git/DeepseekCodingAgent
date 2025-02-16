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
        isUser 
          ? "ml-auto bg-gradient-to-r from-gray-700 to-gray-600 text-white" 
          : "mr-auto bg-card/30 border-border/50",
        isError && "bg-background/50 border-border/50"
      )}
    >
      <div className="flex flex-col gap-1">
        {!isUser && (
          <span className="text-sm font-medium text-muted-foreground">
            {message.agentId || "Assistant"}
          </span>
        )}
        {isError && <AlertCircle className="h-4 w-4 text-muted-foreground opacity-50" />}
        <div className={cn(
          "whitespace-pre-wrap",
          isUser ? "text-white" : "text-foreground/90",
          isError && "text-muted-foreground"
        )}>
          {message.content}
        </div>
      </div>
    </Card>
  );
}