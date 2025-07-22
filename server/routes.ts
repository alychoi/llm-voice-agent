import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { llmService } from "./services/llm";
import { twilioService } from "./services/twilio";
import { conversationService } from "./services/conversation";
import { insertCallSchema } from "@shared/schema";
import { z } from "zod";
import twilio from "twilio";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function registerRoutes(app: Express): Promise<Server> {
  // Call initiation endpoint
  app.post("/api/calls", async (req, res) => {
    try {
      const { phoneNumber, message, systemPrompt } = insertCallSchema.parse(req.body);
      
      // Create call record in database
      const callRecord = await storage.createCall({
        phoneNumber,
        message: message || null,
        systemPrompt: systemPrompt || null,
        status: "initiating"
      });

      // Initiate actual Twilio call
      const callResult = await twilioService.initiateCall({
        to: phoneNumber,
        message: message || "Hello! How are you doing?",
      });

      // Store systemPrompt in conversation state
      conversationService.getOrCreateConversation(
        callResult.callSid,
        systemPrompt && systemPrompt.trim() ? systemPrompt : undefined
      );

      // Update call record with Twilio call SID
      const updatedCall = await storage.updateCall(callRecord.id, {
        twilioCallSid: callResult.callSid,
        status: callResult.status
      });

      res.json(updatedCall);
    } catch (error: any) {
      console.error("Error initiating call:", error);
      res.status(500).json({ 
        message: error instanceof z.ZodError ? "Invalid request data" : "Failed to initiate call",
        error: error.message 
      });
    }
  });

  // Get all calls
  app.get("/api/calls", async (req, res) => {
    try {
      const calls = await storage.getCalls();
      res.json(calls);
    } catch (error) {
      console.error("Error fetching calls:", error);
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  // Get call by ID
  app.get("/api/calls/:id", async (req, res) => {
    try {
      // const id = parseInt(req.params.id);
      const id = req.params.id;
      const call = await storage.getCallById(id);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }
      res.json(call);
    } catch (error) {
      console.error("Error fetching call:", error);
      res.status(500).json({ message: "Failed to fetch call" });
    }
  });

  // Twilio webhook endpoint
  app.post("/api/twilio/webhook", async (req, res) => {
    try {
      const { CallSid, From, To } = req.body;
      console.log("Twilio webhook received:", { CallSid, From, To });

      // Generate initial greeting for Neo scholarship interview
      const initialMessage = "Hello! How are you doing?";

      const conversation = conversationService.getConversation(CallSid);
      if (!conversation || conversation.turnCount === 0) {
        await conversationService.addTurn(CallSid, "assistant", initialMessage);
      }

      const twiml = twilioService.generateTwiML(initialMessage);

      // if ((global as any).wsService) {
      //   (global as any).wsService.broadcastTranscriptUpdate(CallSid, {
      //     speaker: "assistant",
      //     content: initialMessage,
      //     timestamp: new Date()
      //   });
      // }

      res.type('text/xml');
      res.send(twiml);
    } catch (error) {
      console.error("Error handling Twilio webhook:", error);
      res.status(500).send("Error processing webhook");
    }
  });

  // Twilio webhook for gather (speech input)
  app.post("/api/twilio/webhook/gather", async (req, res) => {
    try {
      const { SpeechResult, CallSid } = req.body;
      console.log("Twilio gather webhook:", { SpeechResult, CallSid });

      let responseMessage = "Could you repeat that?";
      
      if (SpeechResult && SpeechResult.trim().length > 0) {
        // Use conversation service to maintain state
        // responseMessage = await conversationService.generateResponse(CallSid, SpeechResult);
        const conversation = conversationService.getConversation(CallSid);
        if (conversation?.queuedAssistantMessage) {
          responseMessage = conversation.queuedAssistantMessage;
          conversation.queuedAssistantMessage = undefined;
          await conversationService.addTurn(CallSid, "assistant", responseMessage);
        } else {
          responseMessage = await conversationService.generateResponse(CallSid, SpeechResult);
        }
        
        // Log the conversation for debugging
        console.log("User said:", SpeechResult);
        console.log("AI responded:", responseMessage);
        console.log("Turn count:", conversationService.getTurnCount(CallSid));
        console.log("Call duration:", conversationService.getCallDuration(CallSid), "seconds");
      } else {
        // No speech detected or empty result, ask user to repeat
        responseMessage = "I didn't catch that. Could you please repeat what you said?";
        console.log("No speech detected or empty result");
      }

      const twiml = twilioService.generateTwiML(responseMessage);
      
      // Debug: log the TwiML being sent
      console.log("Generated TwiML:", twiml);
      
      res.type('text/xml');
      res.send(twiml);
    } catch (error) {
      console.error("Error handling Twilio gather webhook:", error);
      res.status(500).send("Error processing gather webhook");
    }
  });

  // Twilio status callback
  app.post("/api/twilio/webhook/status", async (req, res) => {
    try {
      const { CallSid, CallStatus, CallDuration } = req.body;
      console.log("Twilio status callback:", { CallSid, CallStatus, CallDuration });

      // Update call status in database
      const call = await storage.getCallByTwilioSid(CallSid);
      if (call) {
        await storage.updateCall(call.id, {
          status: CallStatus,
          duration: CallDuration ? parseInt(CallDuration) : call.duration
        });
      }

      if (CallStatus === "completed" && (global as any).wsService) {
        (global as any).wsService.broadcastCallEnd(CallSid);
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("Error handling Twilio status callback:", error);
      res.status(500).send("Error processing status callback");
    }
  });

  // System status endpoint
  app.get("/api/status", async (req, res) => {
    try {
      const status = {
        twilio: "connected",
        openai: "connected", 
        postgres: "connected",
        webhook: "pending"
      };

      res.json(status);
    } catch (error) {
      console.error("Error checking system status:", error);
      res.status(500).json({ message: "Failed to check system status" });
    }
  });

  // Get conversation transcript
  app.get("/api/calls/:callId/transcript", async (req, res) => {
    try {
      const { callId } = req.params;
      const transcript = conversationService.getConversationHistory(callId);
      const turnCount = conversationService.getTurnCount(callId);
      const duration = conversationService.getCallDuration(callId);

      res.json({
        callId,
        transcript,
        turnCount,
        duration,
        metrics: {
          totalTurns: turnCount,
          callDuration: duration,
          averageTurnLength: transcript.length > 0 ? 
            transcript.reduce((acc, turn) => acc + turn.content.length, 0) / transcript.length : 0
        }
      });
    } catch (error) {
      console.error("Error fetching transcript:", error);
      res.status(500).json({ message: "Failed to fetch transcript" });
    }
  });

  // End call manually
  app.post("/api/calls/:callId/end", async (req, res) => {
    try {
      const { callId } = req.params;
      conversationService.endCall(callId);

      const call = await storage.getCallById(callId);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }

      if (call.twilioCallSid) {
        await client.calls(call.twilioCallSid).update({
          status: "completed"
        });
      }
      
      // Broadcast call end to WebSocket clients
      if ((global as any).wsService) {
        (global as any).wsService.broadcastCallEnd(callId);
      }

      res.json({ message: "Call ended successfully" });
    } catch (error) {
      console.error("Error ending call:", error);
      res.status(500).json({ message: "Failed to end call" });
    }
  });

  // Send text message during call
  app.post("/api/calls/:callId/send-text", async (req, res) => {
    try {
      const { callId } = req.params;
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      let conversation = conversationService.getConversation(callId);
      if (!conversation) {
        // Fetch from DB
        const call = await storage.getCallById(callId);
        conversation = conversationService.getOrCreateConversation(
          callId,
          call?.systemPrompt || undefined
        );
      }

      const response = await conversationService.generateResponse(callId, message);

      conversationService.queueAssistantMessage(callId, response);

      res.json({ message: "Text sent successfully" });
    } catch (error) {
      console.error("Error sending text:", error);
      res.status(500).json({ message: "Failed to send text" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
