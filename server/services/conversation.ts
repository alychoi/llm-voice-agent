import { llmService } from "./llm";
import { nanoid } from "nanoid";
import { DEFAULT_PROMPT } from "../config";

export interface ConversationTurn {
  id: string;
  speaker: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ConversationState {
  callId: string;
  turns: ConversationTurn[];
  turnCount: number;
  startTime: Date;
  lastActivity: Date;
  systemPrompt?: string;
  queuedAssistantMessage?: string;
}

class ConversationService {
  private conversations = new Map<string, ConversationState>();

  async addTurn(callId: string, speaker: "user" | "assistant", content: string): Promise<ConversationTurn> {
    const conversation = this.getOrCreateConversation(callId);
    
    const turn: ConversationTurn = {
      id: nanoid(),
      speaker,
      content,
      timestamp: new Date()
    };

    conversation.turns.push(turn);
    conversation.turnCount = conversation.turns.length;
    conversation.lastActivity = new Date();

    if ((global as any).wsService) {
      (global as any).wsService.broadcastTranscriptUpdate(callId, turn);
    }

    return turn;
  }

  async generateResponse(callId: string, userInput: string): Promise<string> {
    try {
      const conversation = this.getOrCreateConversation(callId);
      
      // Add user turn
      await this.addTurn(callId, "user", userInput);

      const systemPrompt = conversation.systemPrompt || DEFAULT_PROMPT;

      // Convert conversation history to LLM format
      const pastTurns = conversation.turns.map(turn => ({
        role: turn.speaker as "user" | "assistant",
        content: turn.content
      }));

      console.log("Calling LLM with past turns:", pastTurns.length);
      
      // Get AI response
      const aiResponse = await llmService.getAgentReply(pastTurns, systemPrompt);
      
      console.log("LLM response received:", aiResponse);
      
      // Add agent turn
      await this.addTurn(callId, "assistant", aiResponse);

      return aiResponse;
    } catch (error) {
      console.error("Error in generateResponse:", error);
      return "I'm experiencing technical difficulties. Please try again later.";
    }
  }

  getConversation(callId: string): ConversationState | undefined {
    return this.conversations.get(callId);
  }

  getConversationHistory(callId: string): ConversationTurn[] {
    const conversation = this.conversations.get(callId);
    return conversation?.turns || [];
  }

  getTurnCount(callId: string): number {
    const conversation = this.conversations.get(callId);
    return conversation?.turnCount || 0;
  }

  getCallDuration(callId: string): number {
    const conversation = this.conversations.get(callId);
    if (!conversation) return 0;
    
    const now = new Date();
    return Math.floor((now.getTime() - conversation.startTime.getTime()) / 1000);
  }

  queueAssistantMessage(callId: string, message: string): void {
    const conversation = this.getOrCreateConversation(callId);
    conversation.queuedAssistantMessage = message;
  }

  public getOrCreateConversation(callId: string, systemPrompt?: string): ConversationState {
    if (!this.conversations.has(callId)) {
      this.conversations.set(callId, {
        callId,
        turns: [],
        turnCount: 0,
        startTime: new Date(),
        lastActivity: new Date(),
        systemPrompt
      });
    } else {
      const existing = this.conversations.get(callId)!;
      console.log("Returning existing conversation with systemPrompt:", existing.systemPrompt);
    }
    return this.conversations.get(callId)!;
  }

  endCall(callId: string): void {
    this.conversations.delete(callId);
  }
}

export const conversationService = new ConversationService();
