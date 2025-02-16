import { Bot, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/components/code/CodeBlock";
import type { Message } from "@shared/schema";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isError = Boolean(message.metadata?.error);
  const hasCode = message.content.includes("```");

  // Split content into text and code blocks
  const parts = hasCode ? message.content.split(/(```[\s\S]*?```)/g) : [message.content];

  return (
    <div
      className={cn(
        "flex gap-2",
        isUser ? "justify-end" : "justify-start",
        "w-full py-1"
      )}
    >
      {!isUser && !isError && (
        <Bot className="h-4 w-4 text-muted-foreground/70 mt-1 flex-shrink-0" />
      )}
      {isError && (
        <AlertCircle className="h-4 w-4 text-destructive/70 mt-1 flex-shrink-0" />
      )}

      <div
        className={cn(
          "max-w-[85%] space-y-2",
          isUser && "bg-gradient-to-r from-gray-700 to-gray-600 text-white p-2 rounded-lg",
          !isUser && "text-foreground/90"
        )}
      >
        {parts.map((part, index) => {
          if (part.startsWith("```") && part.endsWith("```")) {
            // Remove the backticks and language identifier
            const code = part.slice(3, -3).replace(/^[a-z]+\n/, '');
            return <CodeBlock key={index} code={code} />;
          }
          // Regular text content
          return (
            <p key={index} className="whitespace-pre-wrap break-words">
              {part}
            </p>
          );
        })}
      </div>
    </div>
  );
}
