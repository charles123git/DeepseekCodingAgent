import { ChatInterface } from "@/components/chat/ChatInterface";
import { CodeEditor } from "@/components/code/CodeEditor";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-[calc(100vh-2rem)]">
            <ChatInterface />
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Code Output</h2>
            <CodeEditor />
          </div>
        </div>
      </div>
    </div>
  );
}
