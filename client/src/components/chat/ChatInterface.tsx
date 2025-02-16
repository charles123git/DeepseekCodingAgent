import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAgentStore } from "@/store/agentStore";
import { ChatMessage } from "./ChatMessage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, AlertCircle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { Message } from "@shared/schema";
import cn from 'classnames';


export function ChatInterface() {
  const { toast } = useToast();
  const { messages, sendMessage, initializeSocket, setMessages, hasInsufficientBalance } = useAgentStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: initialMessages } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages]);

  useEffect(() => {
    initializeSocket();
  }, [initializeSocket]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRef.current?.value.trim() || isLoading) return;

    setIsLoading(true);
    const content = inputRef.current.value;
    inputRef.current.value = "";

    try {
      await sendMessage(content, (errorMessage) => {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col bg-background/95">
      {hasInsufficientBalance && (
        <div className="px-3 py-2 text-sm bg-background/50 border-b border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground max-w-4xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <p>Switching to alternative AI service...</p>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-3 max-w-4xl mx-auto py-4 px-3">
          {messages.map((message, index) => (
            <ChatMessage key={message.id ?? index} message={message} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground px-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm">AI is thinking...</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-2 border-t border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Input
            ref={inputRef}
            placeholder={isLoading ? "Waiting for response..." : "Type your message..."}
            disabled={isLoading}
            className="flex-1 bg-background/50"
          />
          <Button
            type="submit"
            disabled={isLoading}
            variant={hasInsufficientBalance ? "outline" : "default"}
            className={cn(
              hasInsufficientBalance && "text-muted-foreground",
              isLoading && "cursor-not-allowed opacity-50"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}