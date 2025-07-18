# Voice Agent Demo

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ESM modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL with connection pooling via Neon serverless
- **API Design**: RESTful endpoints for call management and system status

### Key Components

#### Database Schema
- **Users Table**: User authentication and management
- **Calls Table**: Call logging with status tracking, duration, and Twilio integration
- **Migration System**: Drizzle Kit for database schema management

#### Service Layer
- **LLM Service**: OpenAI GPT-4o integration for generating call scripts and responses
- **Twilio Service**: Voice call initiation and status monitoring
- **Storage Layer**: Database abstraction with CRUD operations

#### API Endpoints
- `POST /api/calls` - Initiate new voice calls
- `GET /api/calls` - Retrieve call history and status
- `GET /api/status` - System health monitoring
- `POST /api/twilio/webhook` - Twilio callback handling

## Data Flow

1. **Call Initiation**: User inputs phone number and message through React frontend
2. **Backend Processing**: Express server validates input and creates call record
3. **LLM Integration**: OpenAI generates appropriate call script based on user input
4. **Twilio Integration**: Voice call initiated through Twilio API
5. **Status Updates**: Real-time call status monitoring with periodic polling
6. **Data Persistence**: All call data stored in PostgreSQL with audit trail

## External Dependencies

### Third-Party Services
- **OpenAI API**: GPT-4o model for natural language generation
- **Twilio**: Voice calling infrastructure and webhook management
- **Neon Database**: Serverless PostgreSQL hosting

### Key Libraries
- **Database**: Drizzle ORM, @neondatabase/serverless
- **UI Framework**: React, Radix UI components, Tailwind CSS
- **API Integration**: OpenAI SDK, Twilio SDK
- **Development**: Vite, TypeScript, ESBuild

## Deployment Strategy

### Environment Configuration
- Database connection via `DATABASE_URL`
- Twilio credentials: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- OpenAI API key: `OPENAI_API_KEY`
- Webhook URL for Twilio callbacks: `TWILIO_WEBHOOK_URL`

### Build Process
- **Development**: `npm run dev` with hot reload and development middleware
- **Production**: `npm run build` creates optimized frontend bundle and server bundle
- **Database**: `npm run db:push` for schema migrations

### Architecture Decisions

#### Database Choice
- **Problem**: Need reliable data persistence for call logs and user management
- **Solution**: PostgreSQL with Drizzle ORM for type safety
- **Rationale**: PostgreSQL provides ACID compliance and complex query support, while Drizzle ensures type safety and migration management

#### State Management
- **Problem**: Managing server state and real-time updates
- **Solution**: TanStack Query with automatic refetching
- **Rationale**: Eliminates need for complex state management while providing caching and real-time updates

#### UI Component Strategy
- **Problem**: Consistent, accessible UI components
- **Solution**: shadcn/ui with Radix UI primitives
- **Rationale**: Provides accessible, customizable components without runtime overhead

#### API Integration Pattern
- **Problem**: Managing multiple external service integrations
- **Solution**: Service layer abstraction with error handling
- **Rationale**: Centralizes integration logic and provides consistent error handling across services
