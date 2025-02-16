import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import type { Message } from "@shared/schema";

interface ChatFormData {
  content: string;
}

export default function Chat() {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<"together" | "deepseek">("together");

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/messages"],
  });

  const { register, handleSubmit, reset } = useForm<ChatFormData>();

  const sendMessage = useMutation({
    mutationFn: async (data: ChatFormData) => {
      const response = await apiRequest("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          content: data.content,
          role: "user",
          metadata: { provider: selectedProvider }
        }),
      });
      return response;
    },
    onSuccess: (newMessages: Message[]) => {
      // Update the messages cache with the new messages array
      queryClient.setQueryData<Message[]>(["/api/messages"], (oldMessages = []) => {
        // Ensure we don't add duplicate messages
        const newMessageIds = new Set(newMessages.map(msg => msg.id));
        const filteredOldMessages = oldMessages.filter(msg => !newMessageIds.has(msg.id));
        return [...filteredOldMessages, ...newMessages];
      });
      reset();
    },
  });

  const onSubmit = (data: ChatFormData) => {
    sendMessage.mutate(data);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl h-[calc(100vh-2rem)]">
      <Card className="flex flex-col h-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h1 className="text-xl font-semibold">AI Coding Assistant</h1>
          <div className="flex gap-2">
            <Button
              variant={selectedProvider === "together" ? "default" : "outline"}
              onClick={() => setSelectedProvider("together")}
            >
              Together.ai
            </Button>
            <Button
              variant={selectedProvider === "deepseek" ? "default" : "outline"}
              onClick={() => setSelectedProvider("deepseek")}
            >
              DeepSeek
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          {messages.map((message: Message) => (
            <div
              key={message.id}
              className={`mb-4 ${
                message.role === "assistant" ? "pl-4" : "pr-4"
              }`}
            >
              <Card className={`p-4 ${
                message.role === "assistant" ? "bg-muted" : ""
              }`}>
                <div className="text-sm text-muted-foreground mb-1">
                  {message.role === "assistant" ? "AI Assistant" : "You"}
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.metadata?.provider && (
                  <div className="text-xs text-muted-foreground mt-2">
                    via {message.metadata.provider}
                  </div>
                )}
              </Card>
            </div>
          ))}
        </ScrollArea>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 border-t">
          <Textarea
            {...register("content")}
            placeholder="Ask me anything about coding..."
            className="min-h-[100px] mb-2"
          />
          <Button 
            type="submit" 
            disabled={sendMessage.isPending}
            className="w-full"
          >
            {sendMessage.isPending ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </Card>
    </div>
  );
}