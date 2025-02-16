import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAgentStore } from "@/store/agentStore";
import { ChatMessage } from "./ChatMessage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { Message } from "@shared/schema";

export function ChatInterface() {
  const { toast } = useToast();
  const { messages, sendMessage, initializeSocket, setMessages, hasInsufficientBalance } = useAgentStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRef.current?.value.trim()) return;

    sendMessage(
      inputRef.current.value,
      (errorMessage) => {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    );
    inputRef.current.value = "";
  };

  return (
    <div className="min-h-[calc(100vh-2rem)] flex flex-col h-full bg-background/95">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-6 max-w-4xl mx-auto">
          {hasInsufficientBalance && (
            <div className="px-4 py-3 mb-4 text-sm bg-background/50 border border-border/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <p>The AI service is temporarily paused.</p>
              </div>
              <div className="mt-2 flex gap-2 text-xs">
                <a
                  href="https://platform.deepseek.com/top_up"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Check service status
                </a>
                <span className="text-muted-foreground">•</span>
                <a
                  href="https://help.deepseek.com/issues/service-maintenance"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Technical details
                </a>
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <ChatMessage key={message.id ?? index} message={message} />
          ))}
        </div>
      </ScrollArea>
      <form onSubmit={handleSubmit} className="p-4 border-t border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Input
            ref={inputRef}
            placeholder={hasInsufficientBalance ? "Service temporarily unavailable" : "Type your message..."}
            className="flex-1 bg-background/50"
          />
          <Button
            type="submit"
            variant={hasInsufficientBalance ? "outline" : "default"}
            className={hasInsufficientBalance ? "text-muted-foreground" : ""}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}