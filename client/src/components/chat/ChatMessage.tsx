");
}

function formatCode(codeBlock: string): string {
  return codeBlock
    .replace(/^```(\w+)?\n/, '')
    .replace(/\n```$/, '')
    .trim();
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isError = Boolean(message.metadata?.error);
  const hasCode = hasCodeBlock(message.content);

  // Split content into text and code blocks
  const parts = hasCode ? message.content.split(/(```[\s\S]*?```)/g) : [message.content];

  return (
    <div className={cn(
      "flex gap-2",
      isUser ? "justify-end" : "justify-start",
      "w-full py-1"
    )}>
      {!isUser && !isError && (
        <Bot className="h-4 w-4 text-muted-foreground/70 mt-1 flex-shrink-0" />
      )}
      {isError && (
        <AlertCircle className="h-4 w-4 text-destructive/70 mt-1 flex-shrink-0" />
      )}

      <div className={cn(
        "max-w-[85%] space-y-2",
        isUser && "bg-gradient-to-r from-gray-700 to-gray-600 text-white p-2 rounded-lg",
        !isUser && "text-foreground/90"
      )}>
        {parts.map((part, index) => {
          if (part.startsWith("```") && part.endsWith("