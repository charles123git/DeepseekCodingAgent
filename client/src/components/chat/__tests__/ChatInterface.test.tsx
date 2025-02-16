import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from '../ChatInterface';
import { useAgentStore } from '@/store/agentStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Create a wrapper with the required providers
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('ChatInterface', () => {
  beforeEach(() => {
    // Reset Zustand store before each test
    useAgentStore.setState({
      messages: [],
      socket: null,
      hasInsufficientBalance: false,
      initializeSocket: vi.fn(),
      sendMessage: vi.fn(),
      addMessage: vi.fn(),
      setMessages: vi.fn(),
    });
  });

  it('should render message input and submit button', () => {
    render(<ChatInterface />, { wrapper: Wrapper });

    const input = screen.getByPlaceholderText(/type your message/i);
    const button = screen.getByRole('button');

    expect(input).toBeDefined();
    expect(button).toBeDefined();
  });

  it('should initialize WebSocket connection on component mount', () => {
    const initializeSocket = vi.fn();
    useAgentStore.setState({ initializeSocket });

    render(<ChatInterface />, { wrapper: Wrapper });
    expect(initializeSocket).toHaveBeenCalled();
  });

  it('should show loading state while sending message', async () => {
    const sendMessage = vi.fn((content, onError) => {
      return new Promise(resolve => setTimeout(resolve, 100));
    });
    useAgentStore.setState({ sendMessage });

    render(<ChatInterface />, { wrapper: Wrapper });

    const input = screen.getByPlaceholderText(/type your message/i);
    const form = input.closest('form')!;

    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/waiting for response/i)).toBeDefined();
    });
  });

  it('should handle insufficient balance state', () => {
    useAgentStore.setState({ hasInsufficientBalance: true });
    render(<ChatInterface />, { wrapper: Wrapper });

    expect(screen.getByText(/switching to alternative ai service/i)).toBeDefined();
  });

  it('should show error toast when WebSocket is disconnected', async () => {
    const mockToast = vi.fn();
    vi.mock('@/hooks/use-toast', () => ({
      useToast: () => ({
        toast: mockToast,
      }),
    }));

    const sendMessage = vi.fn().mockImplementation((_, onError) => {
      onError('Not connected to server');
    });
    useAgentStore.setState({ sendMessage });

    render(<ChatInterface />, { wrapper: Wrapper });

    const input = screen.getByPlaceholderText(/type your message/i);
    const form = input.closest('form')!;

    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error',
        variant: 'destructive',
      }));
    });
  });
});