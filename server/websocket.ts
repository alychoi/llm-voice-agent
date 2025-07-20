import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { conversationService } from "./services/conversation";

export class WebSocketService {
  private wss: WebSocketServer;
  private clients = new Map<string, WebSocket>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/api/ws' // Use a different path to avoid conflict with Vite
    });
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.wss.on("connection", (ws: WebSocket) => {
      const clientId = Date.now().toString();
      this.clients.set(clientId, ws);

      console.log(`WebSocket client connected: ${clientId}`);

      ws.on("message", (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(clientId, data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });

      ws.on("close", () => {
        this.clients.delete(clientId);
        console.log(`WebSocket client disconnected: ${clientId}`);
      });
    });
  }

  private handleMessage(clientId: string, data: any) {
    switch (data.type) {
      case "subscribe_call":
        // Subscribe to call updates
        break;
      case "end_call":
        this.endCall(data.callId);
        break;
      case "send_text":
        this.sendTextToCall(data.callId, data.message);
        break;
    }
  }

  public broadcastTranscriptUpdate(callId: string, turn: any) {
    const message = JSON.stringify({
      type: "transcript_update",
      callId,
      turn,
      turnCount: conversationService.getTurnCount(callId),
      callDuration: conversationService.getCallDuration(callId)
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  public broadcastCallEnd(callId: string) {
    const message = JSON.stringify({
      type: "call_ended",
      callId
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private endCall(callId: string) {
    // This would integrate with Twilio to end the call
    console.log(`Ending call: ${callId}`);
    conversationService.endCall(callId);
    this.broadcastCallEnd(callId);
  }

  private sendTextToCall(callId: string, message: string) {
    // This would send a text message during the call
    console.log(`Sending text to call ${callId}: ${message}`);
  }
}

export let wsService: WebSocketService;

export function initializeWebSocket(server: Server) {
  wsService = new WebSocketService(server);
  (global as any).wsService = wsService;
}