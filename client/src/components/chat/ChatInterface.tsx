import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAgentStore } from "@/store/agentStore";
import { ChatMessage } from "./ChatMessage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    <div className="min-h-[calc(100vh-2rem)] flex flex-col h-full">
      {hasInsufficientBalance && (
        <Alert className="mb-4 bg-gray-50 border-gray-200">
          <AlertCircle className="h-4 w-4 text-gray-500" />
          <AlertDescription className="space-y-2">
            <p>
              The AI service is temporarily paused.
            </p>
            <div className="flex gap-2 text-sm text-gray-600">
              <a
                href="https://platform.deepseek.com/top_up"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Check service status
              </a>
              <span>•</span>
              <a
                href="https://help.deepseek.com/issues/service-maintenance"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Technical details
              </a>
            </div>
          </AlertDescription>
        </Alert>
      )}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <ChatMessage key={message.id ?? index} message={message} />
          ))}
        </div>
      </ScrollArea>
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder={hasInsufficientBalance ? "Service temporarily unavailable" : "Type your message..."}
            className="flex-1"
          />
          <Button 
            type="submit" 
            variant={hasInsufficientBalance ? "outline" : "default"}
            className={hasInsufficientBalance ? "text-gray-400" : ""}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}