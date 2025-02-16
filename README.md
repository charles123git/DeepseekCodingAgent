# DeepSeek AI Coding Agent Platform

A cost-effective multimodal AI coding agent platform leveraging DeepSeek API and open-source alternatives. This project implements a collaborative AI coding assistant that can help with code generation, review, and technical discussions.

![Project Preview](preview.png)

## 🎯 Project Overview

This platform provides a modern, real-time chat interface for interacting with AI coding agents powered by DeepSeek's API. It's designed to be:
- Cost-effective: Uses DeepSeek API which offers competitive pricing
- Real-time: WebSocket-based communication for instant responses
- Persistent: PostgreSQL database for message history
- Extensible: Modular architecture for adding new AI providers

### Key Features
- Real-time chat interface with AI coding agents
- Code editor with syntax highlighting
- Message persistence across sessions
- Modular agent system with different roles (planner, coder, reviewer)
- WebSocket-based real-time updates
- Error handling and retry mechanisms
- Mobile-responsive design

## 🚀 Getting Started with Replit

### Prerequisites
1. A Replit account (free)
2. DeepSeek API key (sign up at https://platform.deepseek.com)

### Quick Start
1. Fork this Repl: [Link to Repl]
2. Add your DeepSeek API key:
   - Click on "Secrets" (padlock icon) in Tools
   - Add a new secret with key `DEEPSEEK_API_KEY`
   - Paste your API key as the value
3. Click "Run" to start the application

## 💡 For New Developers

### Understanding the Project Structure
```
project/
├── client/              # Frontend React application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Page components
│   │   ├── store/      # State management
│   │   └── lib/        # Utility functions
├── server/             # Backend Express server
│   ├── agents/         # AI agent implementation
│   ├── services/       # External services (DeepSeek)
│   └── routes.ts       # API endpoints
└── shared/            # Shared types and schemas
```

### Key Concepts Explained

#### 1. WebSocket Communication
The project uses WebSockets for real-time communication between the client and server. This enables:
- Instant message updates
- Real-time typing indicators
- Efficient server-client communication

```typescript
// How WebSocket connection works:
const socket = new WebSocket('ws://your-server/ws');
socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    // Handle message
};
```

#### 2. State Management
We use Zustand for state management, which is simpler than Redux but powerful enough for our needs:

```typescript
const useStore = create((set) => ({
    messages: [],
    addMessage: (message) => 
        set((state) => ({ messages: [...state.messages, message] }))
}));
```

#### 3. Database Integration
PostgreSQL with Drizzle ORM provides type-safe database operations:

```typescript
// Example schema definition
const messages = pgTable('messages', {
    id: serial('id').primaryKey(),
    content: text('content').notNull(),
    // ...
});
```

## 🛠️ Development Guide

### Setting Up Your Development Environment

1. **Fork the Project on Replit**
   - Go to [Replit](https://replit.com)
   - Click "Create Repl"
   - Choose "Import from GitHub"
   - Paste the repository URL

2. **Configure Environment**
   - Add required secrets (DEEPSEEK_API_KEY)
   - The database will be automatically provisioned

3. **Understanding the Development Workflow**
   - The project uses `npm run dev` for development
   - Frontend changes hot reload automatically
   - Backend changes restart the server

### Making Changes

1. **Frontend Changes**
   ```bash
   # Navigate to client folder
   cd client
   
   # Install new dependencies if needed
   npm install new-package
   ```

2. **Backend Changes**
   ```bash
   # Navigate to server folder
   cd server
   
   # Update database schema
   npm run db:push
   ```

## 🎓 Common Tasks Tutorial

### 1. Adding a New Agent Type

1. Define the agent in `shared/schema.ts`:
   ```typescript
   export const agents = pgTable('agents', {
     id: serial('id').primaryKey(),
     name: text('name').notNull(),
     role: text('role').notNull(),
     // ...
   });
   ```

2. Implement agent logic in `server/agents/`:
   ```typescript
   export class NewAgent implements IAgent {
     async handleMessage(message: Message): Promise<Response> {
       // Implementation
     }
   }
   ```

### 2. Customizing the Chat Interface

1. Modify `client/src/components/chat/ChatInterface.tsx`
2. Style using Tailwind CSS classes
3. Add new features like typing indicators or file uploads

## 🔍 Architecture Deep Dive

### Frontend Architecture

- **React** with TypeScript for type safety
- **Zustand** for state management
- **TanStack Query** for data fetching
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components

### Backend Architecture

- **Express** server with TypeScript
- **WebSocket** for real-time communication
- **PostgreSQL** with Drizzle ORM
- **DeepSeek API** integration

### Data Flow

1. User sends message
2. WebSocket transmits to server
3. Server processes with AI agent
4. Response broadcasted to all clients
5. Messages persisted to database

## 📚 Additional Resources

- [DeepSeek API Documentation](https://platform.deepseek.com/docs)
- [Replit Documentation](https://docs.replit.com)
- [WebSocket Guide](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

1. Fork the project
2. Create your feature branch
3. Commit changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
