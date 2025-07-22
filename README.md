# Voice Agent Demo

## Install & Setup

1. **Clone the repo and install dependencies:**
   ```bash
   git clone https://github.com/alychoi/llm-voice-agent.git
   cd voice-take-home-starter-Alyssa-Choi
   npm install
   ```

2. **Set up your environment variables:**
   - In `.env`, fill in your credentials for (scroll to bottom to copy given environmental variables into .env):
     - `DATABASE_URL` (NeonDB)
     - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
     - `OPENAI_API_KEY`

3. **Run database migrations (if using Drizzle):**
   ```bash
   npm run db:push
   # or drizzle-kit push (script already exists in package.json)
   ```

4. **Start the app:**
   ```bash
   npm run dev
   # or `PORT=3000 npm run dev` if default port 5000 not working (can be an issue in mac)
   ```
   The app will be available at [http://localhost:3000](http://localhost:3000).

5. **Expose your local server to Twilio using ngrok:**
   ```bash
   ngrok http 3000 --domain=piranha-genuine-osprey.ngrok-free.app 
   ```
   Feel free to replace the above domain with your own. Set your Twilio webhook to the ngrok URL + `/api/twilio/webhook`.

---

## How to Run a Demo Call

1. **Open the web UI at [http://localhost:3000](http://localhost:3000).**
2. **Enter a phone number** (include country code, e.g., `+1...`).
3. **(Optional) Enter a custom system prompt** for the AI agent, or keep empty to use the default neo scholars interviewer prompt.
4. **Click “Start Call.”**
5. **Answer the call on your phone.**
6. **Speak to the AI agent.**
   - The live transcript, turn counter, and call metrics will update in real time in the UI.
   - You can use the “End Call” or “Send Text” buttons to manually control the call.
7. **Review call history and transcripts** in the UI.

---

## Design Decisions & Architecture

- **Real-Time Updates:**
  - WebSocket is used for live transcript and call metrics, ensuring instant UI updates during the conversation.

- **Short-Term Conversation State:**
  - Each call’s state (turns, prompt, etc.) is stored in memory for fast access and context-aware LLM replies.

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Twilio account
- OpenAI API key

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://neondb_owner:npg_bMPfDcmka62B@ep-lucky-king-ae1zimi2-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Twilio
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+18555785119

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Webhook URL (for Twilio callbacks)
TWILIO_WEBHOOK_URL=https://piranha-genuine-osprey.ngrok-free.app/api/twilio/webhook


