import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID_ENV_VAR || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN_ENV_VAR || "";
const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER || "";

const client = twilio(accountSid, authToken);

export interface CallOptions {
  to: string;
  message?: string;
}

export class TwilioService {
  async initiateCall(options: CallOptions): Promise<{ callSid: string; status: string }> {
    try {
      const webhookUrl = process.env.TWILIO_WEBHOOK_URL || 
        `http://localhost:5000/api/twilio/webhook`;

      const call = await client.calls.create({
        to: options.to,
        from: fromNumber,
        url: webhookUrl,
        method: 'POST',
        statusCallback: `${webhookUrl}/status`,
        statusCallbackMethod: 'POST',
        record: false,
      });

      return {
        callSid: call.sid,
        status: call.status
      };
    } catch (error: any) {
      console.error("Error initiating Twilio call:", error);
      throw new Error(`Failed to initiate call: ${error.message}`);
    }
  }

  async getCallStatus(callSid: string): Promise<{ status: string; duration?: number }> {
    try {
      const call = await client.calls(callSid).fetch();
      return {
        status: call.status,
        duration: call.duration ? parseInt(call.duration) : undefined
      };
    } catch (error: any) {
      console.error("Error fetching call status:", error);
      throw new Error(`Failed to fetch call status: ${error.message}`);
    }
  }

  generateTwiML(message: string): string {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, message);
    
    // Add a gather for speech input
    twiml.gather({
      input: ['speech'],
      timeout: 30, // Longer timeout to allow for longer responses
      action: '/api/twilio/webhook/gather',
      method: 'POST',
      speechTimeout: '3', // Wait 5 seconds of silence before processing
      enhanced: true, // Use enhanced speech recognition
      language: 'en-US'
    });
    
    // Fallback if no input
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Thank you for using the Neo Scholars voice agent. Goodbye!');
    
    twiml.hangup();
    
    return twiml.toString();
  }
}

export const twilioService = new TwilioService();
