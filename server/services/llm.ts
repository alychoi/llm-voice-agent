import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export class LLMService {
  async getAgentReply(pastTurns: ChatTurn[]): Promise<string> {
    try {
      const systemPrompt = `You are a helpful voice agent. Respond naturally and conversationally to the user. Keep responses concise and appropriate for a phone conversation. Be friendly and professional.`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...pastTurns.map(turn => ({
          role: turn.role as "user" | "assistant",
          content: turn.content
        }))
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 150,
        temperature: 0.7,
      });

      return response.choices[0].message.content || "I'm sorry, I didn't understand that. Could you please repeat?";
    } catch (error) {
      console.error("Error getting LLM response:", error);
      return "I'm experiencing technical difficulties. Please try again later.";
    }
  }

  async generateCallScript(phoneNumber: string, customMessage?: string): Promise<string> {
    if (customMessage) {
      return customMessage;
    }

    return `Hello! This is a test call from the voice agent demo. This call was initiated to ${phoneNumber}. How can I help you today?`;
  }
}

export const llmService = new LLMService();
