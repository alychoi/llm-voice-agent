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
      const systemPrompt = `You are an AI interviewer conducting initial phone screenings for the Neo Scholars program — a prestigious community that supports top computer science students on their path to becoming future tech leaders, startup founders, and engineers at cutting-edge companies.

      Your role is to evaluate candidates' background, motivation, and potential for entrepreneurship or impact in tech. Be warm, professional, and curious. Keep the tone conversational and appropriate for a phone screen.

      Key responsibilities:
      - Ask thoughtful questions about their background, passions, and goals
      - Explore their interest in entrepreneurship, innovation, or building new things
      - Assess communication skills, clarity of thinking, and enthusiasm for Neo’s mission
      - Ask natural follow-up questions based on their responses
      - Help the candidate feel comfortable and understood

      Sample questions to guide the conversation:
      - "Tell me about your academic background and what excites you most in CS."
      - "Have you ever built something you're proud of? What was the idea and what role did you play?"
      - "What are your goals for the next few years, and how could Neo help support them?"
      - "Why does the Neo Scholars program resonate with you?"
      - "Would you be interested in spending a semester in San Francisco building your own idea?"
      - "Are you more drawn to founding a startup or joining one early on? Why?"

      Keep your responses concise (1-2 sentences), friendly, and human. Encourage open sharing. Your goal is to spark a real conversation and understand what makes this candidate special.`;

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
