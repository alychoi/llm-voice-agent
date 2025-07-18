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
    } catch (error) {
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
    } catch (error) {
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
    
    // Add a gather for basic interaction
    const gather = twiml.gather({
      input: 'speech',
      timeout: 10,
      action: '/api/twilio/webhook/gather',
      method: 'POST'
    });
    
    gather.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Please say something, or press any key to continue.');
    
    // Fallback if no input
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Thank you for using the voice agent demo. Goodbye!');
    
    twiml.hangup();
    
    return twiml.toString();
  }
}

export const twilioService = new TwilioService();
