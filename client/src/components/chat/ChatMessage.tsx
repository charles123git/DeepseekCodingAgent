import { Message } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, Bot } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isError = message.metadata?.error === true;

  return isUser ? (
    <Card
      className={cn(
        "p-3 max-w-[80%]",
        "bg-gradient-to-r from-gray-700 to-gray-600 text-white",
        isError && "bg-background/50 border-border/50"
      )}
    >
      <div className="whitespace-pre-wrap text-white">
        {message.content}
      </div>
    </Card>
  ) : (
    <div className="max-w-[80%] space-y-1">
      {!isError && (
        <div className="flex items-center gap-2 mb-1">
          <Bot className="h-3 w-3 text-muted-foreground/70" />
        </div>
      )}
      {isError && <AlertCircle className="h-4 w-4 text-muted-foreground opacity-50 mb-1" />}
      <div className={cn(
        "whitespace-pre-wrap text-foreground/90",
        isError && "text-muted-foreground"
      )}>
        {message.content}
      </div>
    </div>
  );
}