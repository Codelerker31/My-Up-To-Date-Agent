import { io, Socket } from 'socket.io-client';
import type { Message, UpdateStream, Newsletter } from '@/types';

export interface WebSocketEvents {
  // Server to client events
  'message': (data: { 
    id: string;
    type: string;
    content: string;
    timestamp: string;
    streamId: string;
    newsletter?: Newsletter;
    metadata?: any;
  }) => void;
  'streams-updated': (streams: UpdateStream[]) => void;
  'stream-created': (stream: UpdateStream) => void;
  'stream-updated': (data: { id: string; hasNewUpdate?: boolean; lastUpdate?: string }) => void;
  'schedule-updated': (data: { streamId: string; schedule: any }) => void;
  'research-triggered': (data: { streamId: string }) => void;
  'auth-error': (data: { message: string }) => void;
  'error': (data: { message: string }) => void;
  'connect': () => void;
  'disconnect': () => void;

  // Client to server events
  'authenticate': (token: string) => void;
  'send-message': (data: { streamId: string; content: string }) => void;
  'create-stream': (data: any) => void;
  'update-schedule': (data: { streamId: string; schedule: any }) => void;
  'trigger-research': (data: { streamId: string }) => void;
}

class WebSocketClient {
  private socket: Socket | null = null;
  private token: string | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();

  connect(token: string) {
    this.token = token;
    
    this.socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      transports: ['websocket'],
      autoConnect: true
    });

    this.setupEventListeners();
    this.authenticate();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventHandlers.clear();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.emit('connect');
      if (this.token) {
        this.authenticate();
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      this.emit('disconnect');
    });

    this.socket.on('message', (data) => {
      this.emit('message', data);
    });

    this.socket.on('streams-updated', (streams) => {
      this.emit('streams-updated', streams);
    });

    this.socket.on('stream-created', (stream) => {
      this.emit('stream-created', stream);
    });

    this.socket.on('stream-updated', (data) => {
      this.emit('stream-updated', data);
    });

    this.socket.on('schedule-updated', (data) => {
      this.emit('schedule-updated', data);
    });

    this.socket.on('research-triggered', (data) => {
      this.emit('research-triggered', data);
    });

    this.socket.on('auth-error', (data) => {
      console.error('Authentication error:', data.message);
      this.emit('auth-error', data);
    });

    this.socket.on('error', (data) => {
      console.error('WebSocket error:', data.message);
      this.emit('error', data);
    });
  }

  private authenticate() {
    if (this.socket && this.token) {
      this.socket.emit('authenticate', this.token);
    }
  }

  sendMessage(streamId: string, content: string) {
    if (this.socket) {
      this.socket.emit('send-message', { streamId, content });
    }
  }

  createStream(streamData: any) {
    if (this.socket) {
      this.socket.emit('create-stream', streamData);
    }
  }

  updateSchedule(streamId: string, schedule: any) {
    if (this.socket) {
      this.socket.emit('update-schedule', { streamId, schedule });
    }
  }

  triggerResearch(streamId: string) {
    if (this.socket) {
      this.socket.emit('trigger-research', { streamId });
    }
  }

  on<K extends keyof WebSocketEvents>(event: K, handler: WebSocketEvents[K]) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off<K extends keyof WebSocketEvents>(event: K, handler: WebSocketEvents[K]) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Create singleton instance
export const websocketClient = new WebSocketClient();

// Hook for React components
import { useEffect, useState } from 'react';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    websocketClient.on('connect', handleConnect);
    websocketClient.on('disconnect', handleDisconnect);

    return () => {
      websocketClient.off('connect', handleConnect);
      websocketClient.off('disconnect', handleDisconnect);
    };
  }, []);

  return {
    isConnected,
    sendMessage: websocketClient.sendMessage.bind(websocketClient),
    createStream: websocketClient.createStream.bind(websocketClient),
    updateSchedule: websocketClient.updateSchedule.bind(websocketClient),
    triggerResearch: websocketClient.triggerResearch.bind(websocketClient),
    on: websocketClient.on.bind(websocketClient),
    off: websocketClient.off.bind(websocketClient)
  };
} 