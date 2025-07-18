import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { llmService } from "./services/llm";
import { twilioService } from "./services/twilio";
import { insertCallSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Call initiation endpoint
  app.post("/api/calls", async (req, res) => {
    try {
      const { phoneNumber, message } = insertCallSchema.parse(req.body);
      
      // Mock response for scaffold
      const mockCall = {
        id: Date.now(),
        phoneNumber,
        message: message || null,
        status: "pending",
        duration: 0,
        twilioCallSid: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      res.json(mockCall);
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
      // Mock empty calls array for scaffold
      res.json([]);
    } catch (error) {
      console.error("Error fetching calls:", error);
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  // Get call by ID
  app.get("/api/calls/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      res.status(404).json({ message: "Call not found" });
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

      // Generate TwiML response with hardcoded message
      const message = "Hello! This is a test call from the voice agent demo. Thank you for answering!";
      const twiml = twilioService.generateTwiML(message);

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

      let responseMessage = "Thank you for your input!";
      
      if (SpeechResult) {
        // Get LLM response based on user input
        const llmResponse = await llmService.getAgentReply([
          { role: "user", content: SpeechResult }
        ]);
        responseMessage = llmResponse;
      }

      const twiml = twilioService.generateTwiML(responseMessage);
      
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

  const httpServer = createServer(app);
  return httpServer;
}
