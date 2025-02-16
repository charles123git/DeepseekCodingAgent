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
        isUser ? "ml-auto bg-primary text-primary-foreground" : "mr-auto",
        isError && "border-gray-200 bg-gray-50 dark:bg-gray-900/10"
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isUser ? "You" : message.agentId || "Assistant"}
          </span>
          {isError && <AlertCircle className="h-4 w-4 text-gray-500" />}
        </div>
        <div className={cn(
          "whitespace-pre-wrap",
          isError && "text-gray-600 dark:text-gray-300"
        )}>
          {message.content}
        </div>
      </div>
    </Card>
  );
}