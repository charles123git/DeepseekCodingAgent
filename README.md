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