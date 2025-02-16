import { Message } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <Card
      className={cn(
        "p-4 max-w-[80%]",
        isUser ? "ml-auto bg-primary text-primary-foreground" : "mr-auto"
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="text-sm font-medium">
          {isUser ? "You" : message.agentId || "Assistant"}
        </div>
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </Card>
  );
}
