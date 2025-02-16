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
  const { messages, sendMessage, initializeSocket, setMessages, hasInsufficientBalance } = useAgentStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
    if (inputRef.current?.value) {
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
    }
  };

  return (
    <div className="flex flex-col h-full">
      {hasInsufficientBalance && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p>
              DeepSeek API service is currently limited due to server constraints. 
              New account top-ups are temporarily suspended.
            </p>
            <p className="text-sm">
              You can check the service status at{" "}
              <a
                href="https://platform.deepseek.com/top_up"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-red-300"
              >
                platform.deepseek.com/top_up
              </a>
            </p>
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
            placeholder="Type your message..."
            className="flex-1"
            disabled={hasInsufficientBalance}
          />
          <Button type="submit" disabled={hasInsufficientBalance}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}